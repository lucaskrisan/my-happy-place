import { describe, expect, it } from "vitest";
import type { FunnelDefinition } from "../schema/v1";
import { addPermanentUrl, assetStatus, assetSummary, filterAssets, promoteAssetInFunnel, removeUnusedAsset, renameAsset, replacePermanentAsset } from "../studio/assetManagerState";
import { findAssetUsages, serializeForStorage } from "../studio/studioState";

const result = { assetId: "video", key: "funnels/demo/assets/video/version-video.mp4", src: "/media/funnels/demo/assets/video/version-video.mp4", filename: "video.mp4", contentType: "video/mp4", size: 12, etag: '"etag"', uploadedAt: "2026-08-20T00:00:00.000Z" };
const funnel = (): FunnelDefinition => ({ schemaVersion: 1, id: "demo", title: "Demo", entrySceneId: "scene-one", exportable: true, assets: [
  { id: "video", mediaType: "video", source: "preview", fileName: "local-video.mp4", objectUrl: "blob:video" },
  { id: "sound", mediaType: "audio", source: "permanent", url: "/media/sound.mp3", fileName: "sound.mp3" },
  { id: "avatar", mediaType: "image", source: "preview", fileName: "avatar.png", status: "needs_reattach" },
], scenes: [
  { id: "scene-one", title: "Cena 01", videoAssetId: "video", events: [{ id: "call", block: "incoming_call", trigger: { kind: "VIDEO_END" }, blocking: true, callerName: "Marina", avatarAssetId: "avatar", voiceAssetId: "sound", onAccept: [], onDecline: [{ type: "STOP" }], onEnd: [{ type: "STOP" }], actions: [] }], guided: { tested: true, testedFingerprint: "old" } },
  { id: "scene-two", title: "Cena 02", events: [], guided: { tested: true, testedFingerprint: "old" } },
] });

describe("asset manager state", () => {
  it("filters and searches the real FunnelDefinition asset catalog", () => {
    const current = funnel();
    expect(filterAssets(current.assets, { video: "blob:video" }, "video", "local").map((asset) => asset.id)).toEqual(["video"]);
    expect(filterAssets(current.assets, { video: "blob:video" }, "problem", "").map((asset) => asset.id)).toEqual(["avatar"]);
    expect(assetStatus(current.assets[0]!, { video: "blob:video" })).toBe("local");
    expect(assetStatus(current.assets[2]!, {})).toBe("unresolved");
    expect(assetSummary(current, { video: "blob:video" })).toMatchObject({ total: 3, permanent: 1, local: 1, unresolved: 1 });
  });

  it("resolves usages across a scene, call, notification and messaging payload", () => {
    const current = funnel();
    current.scenes[0]!.events.push({ id: "notice", block: "notification", trigger: { kind: "TIME", seconds: 1 }, blocking: false, appName: "App", senderName: "Mãe", message: "Oi", soundAssetId: "sound", onTap: [], onDismiss: [], actions: [] });
    current.scenes[0]!.events.push({ id: "chat", block: "messaging", trigger: { kind: "TIME", seconds: 2 }, blocking: true, contactName: "Clara", messages: [{ id: "voice", type: "voice_once", audioAssetId: "sound" }], onClose: [{ type: "STOP" }], voiceFailure: "skip", actions: [] });
    expect(findAssetUsages(current, "sound").map((usage) => usage.label)).toHaveLength(3);
    expect(findAssetUsages(current, "avatar")[0]?.label).toContain("Avatar");
  });

  it("adds a permanent URL without a local-preview shim", () => {
    const next = addPermanentUrl(funnel(), "https://cdn.example.test/image.webp", "image", "Imagem");
    expect(next.assets.at(-1)).toMatchObject({ source: "permanent", url: "https://cdn.example.test/image.webp", fileName: "Imagem" });
  });

  it("serializes a preview as unresolved and never persists its object URL", () => {
    const stored = serializeForStorage(funnel());
    expect(stored.assets[0]).toMatchObject({ id: "video", source: "preview", status: "needs_reattach" });
    expect(JSON.stringify(stored)).not.toContain("blob:video");
  });

  it("promotes a preview only after success and preserves its asset id", () => {
    const next = promoteAssetInFunnel(funnel(), "video", result);
    expect(next.assets.find((asset) => asset.id === "video")).toMatchObject({ id: "video", source: "permanent", url: result.src });
    expect(next.scenes[0]?.videoAssetId).toBe("video");
  });

  it("replacement preserves identity, gives the asset a new source and invalidates only users", () => {
    const current = funnel();
    current.assets[0] = { id: "video", mediaType: "video", source: "permanent", url: "/media/old.mp4" };
    const next = replacePermanentAsset(current, "video", result);
    expect(next.assets[0]).toMatchObject({ id: "video", url: result.src, r2Key: result.key });
    expect(next.scenes[0]?.guided?.tested).toBe(false);
    expect(next.scenes[1]?.guided?.tested).toBe(true);
  });

  it("renames metadata without breaking references or invalidating playback", () => {
    const current = funnel();
    const next = renameAsset(current, "sound", "Áudio final.mp3");
    expect(next.assets.find((asset) => asset.id === "sound")?.fileName).toBe("Áudio final.mp3");
    expect(next.scenes[0]?.events[0]?.block).toBe("incoming_call");
    expect(next.scenes[0]?.guided?.tested).toBe(true);
  });

  it("removes an unused asset but protects an asset still referenced", () => {
    const current = funnel();
    expect(removeUnusedAsset(current, "video")).toBe(current);
    const unused = addPermanentUrl(current, "https://cdn.example.test/unused.mp3", "audio");
    const assetId = unused.assets.at(-1)!.id;
    expect(removeUnusedAsset(unused, assetId).assets.some((asset) => asset.id === assetId)).toBe(false);
  });
});
