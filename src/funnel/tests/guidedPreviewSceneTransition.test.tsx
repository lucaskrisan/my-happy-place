import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GuidedPreview } from "../studio/GuidedPreview";
import type { FunnelDefinition } from "../schema/v1";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Regression test for the real production bug: after a NEXT_SCENE transition, FunnelRuntime correctly
// advanced (sceneId, executedActions, navigationHistory all updated), but the new scene's <video> stayed
// paused at 0:00 — because enterScene() leaves mediaState at "playing" the whole time (idle->playing
// happens synchronously inside the same call), so the effect that only reacted to mediaState *changing*
// never fired again. This test renders the real component into jsdom and drives it through an actual
// scene transition, asserting on the DOM <video> element itself — not just runtime state — so a
// regression here fails loudly instead of only showing up in a live authenticated smoke test.
//
// jsdom doesn't implement media playback; play()/pause() throw "not implemented" unless stubbed. This is
// the standard, necessary way to unit-test a <video> element under jsdom — not an arbitrary workaround.
const playCalls: HTMLMediaElement[] = [];
const originalPlay = HTMLMediaElement.prototype.play;
const originalPause = HTMLMediaElement.prototype.pause;

function fixtureFunnel(): FunnelDefinition {
  return {
    schemaVersion: 1,
    id: "e2e-fixture",
    title: "Fixture",
    entrySceneId: "scene-a",
    exportable: true,
    assets: [
      { id: "video-a", mediaType: "video", source: "permanent", url: "/media/scene-a.mp4", fileName: "a.mp4", contentType: "video/mp4", size: 1, uploadedAt: "2026-01-01T00:00:00.000Z", r2Key: "a", etag: "a" },
      { id: "video-b", mediaType: "video", source: "permanent", url: "/media/scene-b.mp4", fileName: "b.mp4", contentType: "video/mp4", size: 1, uploadedAt: "2026-01-01T00:00:00.000Z", r2Key: "b", etag: "b" },
    ],
    scenes: [
      {
        id: "scene-a",
        title: "Cena A",
        videoAssetId: "video-a",
        nextSceneId: "scene-b",
        events: [{ id: "a-transition", block: "scene_transition", trigger: { kind: "VIDEO_END" }, blocking: false, actions: [{ type: "NEXT_SCENE" }], targetSceneId: "scene-b" }],
      },
      {
        id: "scene-b",
        title: "Cena B",
        videoAssetId: "video-b",
        events: [],
      },
    ],
  } as unknown as FunnelDefinition;
}

describe("GuidedPreview — real scene transition (render/media/playback, not just sceneId)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    playCalls.length = 0;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) { playCalls.push(this); return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () {};
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    HTMLMediaElement.prototype.play = originalPlay;
    HTMLMediaElement.prototype.pause = originalPause;
  });

  it("switches src, resets the visible clock, and autoplays the new video once it's ready — driven by an actual VIDEO_END -> NEXT_SCENE transition", async () => {
    const funnel = fixtureFunnel();

    act(() => {
      root.render(<GuidedPreview funnel={funnel} scene={funnel.scenes[0]!} urls={{}} fullExperience />);
    });

    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toBe("/media/scene-a.mp4");

    const startButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "▶ INICIAR EXPERIÊNCIA")!;
    expect(startButton).toBeTruthy();
    act(() => { startButton.click(); });
    expect(playCalls).toContain(video);

    // Advance the clock a bit, mirroring real playback, before the scene ends.
    act(() => { video.dispatchEvent(new Event("timeupdate")); });

    playCalls.length = 0;
    // The real trigger: the <video> element itself firing "ended", exactly like VideoStage wires it —
    // this is what calls runtime.mediaEnded() -> fires VIDEO_END -> executes NEXT_SCENE -> enterScene.
    act(() => { video.dispatchEvent(new Event("ended")); });

    // After the transition: the runtime has moved on, so the component must now be rendering scene B's
    // video, not scene A's — and the visible clock resets to 0 for the new scene.
    expect(video.getAttribute("src")).toBe("/media/scene-b.mp4");
    expect(container.textContent).toContain("00:00.00");

    // The new video hasn't fired loadedmetadata yet — nothing should have tried to play it prematurely.
    expect(playCalls).toHaveLength(0);

    // Once the new video is actually ready to play, it must autoplay because the runtime wants "playing"
    // — this is the exact bug: previously nothing re-fired play() here because mediaState never *changed*
    // across the transition.
    act(() => { video.dispatchEvent(new Event("loadedmetadata")); });
    expect(playCalls).toContain(video);
  });
});
