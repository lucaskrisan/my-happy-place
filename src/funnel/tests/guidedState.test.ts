import { describe, expect, it } from "vitest";
import { emptyFunnel } from "../studio/studioState";
import {
  actionFromGuided,
  createGuidedFunnel,
  createGuidedInteraction,
  deleteGuidedInteraction,
  duplicateGuidedInteraction,
  guidedEvent,
  guidedInteractionReferences,
  guidedProgress,
  invalidateStructuralTests,
  issueBelongsToScene,
  markSceneTested,
  nextGuidedStep,
  sceneStructuralFingerprint,
  sceneStatus,
  triggerFromGuided,
  updateGuidedInteraction,
} from "../studio/guidedState";
import { serializeForStorage } from "../studio/studioState";
describe("Guided Builder mappings", () => {
  it("maps human trigger choices to the existing trigger schema", () => {
    expect(triggerFromGuided("start")).toEqual({ kind: "SCENE_START" });
    expect(triggerFromGuided("time", 17)).toEqual({ kind: "TIME", seconds: 17 });
    expect(triggerFromGuided("before_end", 2)).toEqual({ kind: "BEFORE_END", seconds: 2 });
    expect(triggerFromGuided("end")).toEqual({ kind: "VIDEO_END" });
    expect(triggerFromGuided("after", 0, "quiz")).toEqual({
      kind: "INTERACTION_COMPLETE",
      interactionId: "quiz",
    });
  });
  it("maps human actions to the existing action schema", () => {
    expect(actionFromGuided("resume")).toEqual({ type: "RESUME_VIDEO" });
    expect(actionFromGuided("next")).toEqual({ type: "NEXT_SCENE" });
    expect(actionFromGuided("scene", "scene-2")).toEqual({
      type: "GO_TO_SCENE",
      sceneId: "scene-2",
    });
  });
  it("creates valid guided interaction blocks without another schema", () => {
    const event = guidedEvent("quiz", triggerFromGuided("time", 19), actionFromGuided("resume"));
    expect(event.block).toBe("quiz");
    expect(event.trigger).toEqual({ kind: "TIME", seconds: 19 });
    expect(event.actions).toEqual([{ type: "RESUME_VIDEO" }]);
  });
  it("derives scene status, progress and a deterministic next step", () => {
    const funnel = emptyFunnel();
    const scene = funnel.scenes[0]!;
    expect(nextGuidedStep(scene, funnel)).toMatch(/descreva/);
    scene.guided = { script: { happens: "algo" } };
    expect(nextGuidedStep(scene, funnel)).toMatch(/vídeo/);
    scene.videoAssetId = "missing";
    expect(sceneStatus(scene, funnel).video).toBe("PRONTO");
    expect(guidedProgress(funnel).total).toBe(1);
  });
  it("creates guided funnels with the requested metadata and connected initial scenes", () => {
    const funnel = createGuidedFunnel("story", "Experiência", "Uma descrição", "three");
    expect(funnel.guided).toEqual({ experienceType: "story", description: "Uma descrição" });
    expect(funnel.scenes).toHaveLength(3);
    expect(funnel.scenes[0]?.nextSceneId).toBe(funnel.scenes[1]?.id);
  });
  it("serializes a local preview without preserving its object URL", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({ id: "local-video", mediaType: "video", source: "preview", fileName: "cena.mp4", objectUrl: "blob:temporary", status: "ready" });
    funnel.scenes[0]!.videoAssetId = "local-video";
    const stored = serializeForStorage(funnel);
    expect(stored.assets[0]).toMatchObject({ id: "local-video", status: "needs_reattach" });
    expect("objectUrl" in stored.assets[0]!).toBe(false);
  });
  it("keeps a tested scene only while its runtime structure is unchanged", () => {
    const funnel = emptyFunnel();
    funnel.scenes[0]!.videoAssetId = "video-a";
    const tested = markSceneTested(funnel, funnel.scenes[0]!.id);
    expect(sceneStatus(tested.scenes[0]!, tested).test).toBe("PRONTO");
    const changed = invalidateStructuralTests(tested, { ...tested, scenes: tested.scenes.map((scene) => ({ ...scene, videoAssetId: "video-b" })) });
    expect(changed.scenes[0]!.guided?.tested).toBe(false);
    expect(sceneStructuralFingerprint(tested.scenes[0]!)).not.toBe(sceneStructuralFingerprint(changed.scenes[0]!));
  });
  it("does not invalidate a tested scene for guided navigation or copy changes", () => {
    const funnel = markSceneTested(emptyFunnel(), emptyFunnel().entrySceneId);
    const scene = funnel.scenes[0]!;
    const tested = markSceneTested({ ...funnel, scenes: [{ ...scene, videoAssetId: "video" }] }, scene.id);
    const next = invalidateStructuralTests(tested, { ...tested, scenes: tested.scenes.map((item) => ({ ...item, guided: { ...item.guided, script: { happens: "novo texto" } } })) });
    expect(next.scenes[0]!.guided?.tested).toBe(true);
  });
  it("creates quiz, notification, audio and transition as real schema events", () => {
    let funnel = emptyFunnel();
    const sceneId = funnel.entrySceneId;
    funnel = createGuidedInteraction(funnel, sceneId, "quiz");
    funnel = createGuidedInteraction(funnel, sceneId, "notification");
    funnel = createGuidedInteraction(funnel, sceneId, "audio");
    funnel = createGuidedInteraction(funnel, sceneId, "scene_transition");
    const events = funnel.scenes[0]!.events;
    expect(events.map((event) => event.block)).toEqual(["quiz", "notification", "audio", "scene_transition"]);
    expect((events[0] as any).questions[0].options).toHaveLength(2);
  });
  it("edits a real event while preserving its id and supports option mutations", () => {
    let funnel = emptyFunnel();
    funnel = createGuidedInteraction(funnel, funnel.entrySceneId, "quiz");
    const scene = funnel.scenes[0]!;
    const quiz = scene.events[0] as any;
    const updated = { ...quiz, trigger: { kind: "TIME", seconds: 17.3 }, actions: [{ type: "RESUME_VIDEO" }], questions: [{ ...quiz.questions[0], options: [...quiz.questions[0].options, { id: "third", label: "Terceira" }] }] };
    funnel = updateGuidedInteraction(funnel, scene.id, updated);
    expect(funnel.scenes[0]!.events[0]!.id).toBe(quiz.id);
    expect((funnel.scenes[0]!.events[0] as any).questions[0].options).toHaveLength(3);
    expect(funnel.scenes[0]!.events[0]!.trigger).toEqual({ kind: "TIME", seconds: 17.3 });
  });
  it("duplicates without collision and protects referenced interactions before deletion", () => {
    let funnel = emptyFunnel();
    const sceneId = funnel.entrySceneId;
    funnel = createGuidedInteraction(funnel, sceneId, "quiz");
    const quizId = funnel.scenes[0]!.events[0]!.id;
    funnel = createGuidedInteraction(funnel, sceneId, "notification");
    const notification = funnel.scenes[0]!.events[1] as any;
    funnel = updateGuidedInteraction(funnel, sceneId, { ...notification, onTap: [{ type: "OPEN_EVENT", eventId: quizId }] });
    expect(guidedInteractionReferences(funnel, quizId)).toHaveLength(1);
    const copied = duplicateGuidedInteraction(funnel, sceneId, quizId);
    expect(copied.scenes[0]!.events).toHaveLength(3);
    expect(copied.scenes[0]!.events[2]!.id).not.toBe(quizId);
    expect(deleteGuidedInteraction(funnel, sceneId, quizId).scenes[0]!.events).toHaveLength(1);
  });
  it("builds a call with real outcomes and asset references", () => {
    let funnel = emptyFunnel();
    const sceneId = funnel.entrySceneId;
    funnel = createGuidedInteraction(funnel, sceneId, "incoming_call");
    const call = funnel.scenes[0]!.events[0] as any;
    const edited = { ...call, trigger: { kind: "VIDEO_END" }, callerName: "Marina", voiceAssetId: "voice", onEnd: [{ type: "GO_TO_SCENE", sceneId }], onDecline: [{ type: "RESUME_VIDEO" }] };
    funnel = updateGuidedInteraction(funnel, sceneId, edited);
    const next = funnel.scenes[0]!.events[0] as any;
    expect(next.callerName).toBe("Marina");
    expect(next.voiceAssetId).toBe("voice");
    expect(next.onDecline).toEqual([{ type: "RESUME_VIDEO" }]);
  });
  it("builds and preserves messaging message types and actions", () => {
    let funnel = emptyFunnel();
    const sceneId = funnel.entrySceneId;
    funnel = createGuidedInteraction(funnel, sceneId, "messaging");
    const message = funnel.scenes[0]!.events[0] as any;
    const edited = { ...message, messages: [...message.messages, { id: "voice", type: "voice", audioAssetId: "audio" }, { id: "once", type: "voice_once", audioAssetId: "once" }, { id: "system", type: "system", text: "Sistema" }], actions: [{ type: "NEXT_SCENE" }] };
    funnel = updateGuidedInteraction(funnel, sceneId, edited);
    const next = funnel.scenes[0]!.events[0] as any;
    expect(next.messages.map((item: any) => item.type)).toEqual(["text", "voice", "voice_once", "system"]);
    const copy = duplicateGuidedInteraction(funnel, sceneId, next.id).scenes[0]!.events[1] as any;
    expect(copy.messages[0].id).not.toBe(next.messages[0].id);
  });
  it("builds a choice with two editable options and preserves advanced fields", () => {
    let funnel = emptyFunnel();
    const sceneId = funnel.entrySceneId;
    funnel = createGuidedInteraction(funnel, sceneId, "choice");
    const choice = funnel.scenes[0]!.events[0] as any;
    expect(choice.options).toHaveLength(2);
    funnel = updateGuidedInteraction(funnel, sceneId, { ...choice, title: "O que fazer?", mode: "confirm", required: true, allowChange: true, options: [...choice.options, { id: "third", label: "Terceira" }] });
    const next = funnel.scenes[0]!.events[0] as any;
    expect(next.options).toHaveLength(3);
    expect(next.allowChange).toBe(true);
  });
  it("matches an event-level validation issue back to the scene that owns it", () => {
    let funnel = emptyFunnel();
    funnel = createGuidedInteraction(funnel, funnel.entrySceneId, "quiz");
    const eventId = funnel.scenes[0]!.events[0]!.id;
    expect(issueBelongsToScene(`events.${eventId}`, funnel.scenes[0]!)).toBe(true);
    expect(issueBelongsToScene(`events.${eventId}.q1`, funnel.scenes[0]!)).toBe(true);
    expect(issueBelongsToScene("events.some-other-event", funnel.scenes[0]!)).toBe(false);
  });
  it("counts a scene as needing correction for an event issue nextGuidedStep used to miss", () => {
    let funnel = emptyFunnel();
    const sceneId = funnel.entrySceneId;
    funnel.scenes[0]!.guided = { script: { happens: "algo" } };
    funnel.scenes[0]!.videoAssetId = "video";
    funnel = createGuidedInteraction(funnel, sceneId, "choice");
    const choice = funnel.scenes[0]!.events[0] as any;
    // An empty choice (no options) is a real validator error whose path is "events.<id>", not "scenes.<id>".
    funnel = updateGuidedInteraction(funnel, sceneId, { ...choice, options: [] });
    expect(nextGuidedStep(funnel.scenes[0]!, funnel)).toMatch(/Corrija/);
  });
  it("only counts a scene as ready once its script is done too, not just video and test", () => {
    let funnel = emptyFunnel();
    funnel.scenes[0]!.videoAssetId = "video";
    funnel = markSceneTested(funnel, funnel.entrySceneId);
    // Video attached and tested, but no script — should not count as ready.
    expect(guidedProgress(funnel).ready).toBe(0);
    funnel.scenes[0]!.guided = { ...funnel.scenes[0]!.guided, script: { happens: "algo" } };
    funnel = markSceneTested(funnel, funnel.entrySceneId);
    expect(guidedProgress(funnel).ready).toBe(1);
  });
});
