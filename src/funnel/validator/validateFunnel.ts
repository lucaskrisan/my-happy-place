import type { FunnelDefinition } from "../schema/v1";
import { funnelBlockRegistry } from "../registry/blockRegistry";
export type FunnelValidationIssue = { code: string; message: string; path: string };
export function validateFunnel(funnel: FunnelDefinition): FunnelValidationIssue[] {
  const issues: FunnelValidationIssue[] = [];
  const scenes = new Set(funnel.scenes.map((s) => s.id));
  const assets = new Set(funnel.assets.map((a) => a.id));
  const seen = new Set<string>();
  const add = (code: string, message: string, path: string) => issues.push({ code, message, path });
  if (!scenes.has(funnel.entrySceneId))
    add("entry_scene_missing", "entrySceneId does not exist", "entrySceneId");
  for (const asset of funnel.assets) {
    if (seen.has(`asset:${asset.id}`))
      add("duplicate_id", "Duplicate asset id", `assets.${asset.id}`);
    seen.add(`asset:${asset.id}`);
    if (funnel.exportable && asset.source === "preview")
      add("preview_asset", "Preview assets cannot be exportable", `assets.${asset.id}`);
  }
  for (const scene of funnel.scenes) {
    if (seen.has(`scene:${scene.id}`))
      add("duplicate_id", "Duplicate scene id", `scenes.${scene.id}`);
    seen.add(`scene:${scene.id}`);
    for (const assetId of [scene.videoAssetId, scene.posterAssetId])
      if (assetId && !assets.has(assetId))
        add("asset_missing", "Scene asset does not exist", `scenes.${scene.id}`);
    if (scene.nextSceneId && !scenes.has(scene.nextSceneId))
      add("scene_target_missing", "nextSceneId does not exist", `scenes.${scene.id}.nextSceneId`);
    for (const event of scene.events) {
      if (seen.has(`event:${event.id}`))
        add("duplicate_id", "Duplicate event id", `events.${event.id}`);
      seen.add(`event:${event.id}`);
      if (
        event.trigger.kind === "TIME" &&
        scene.duration !== undefined &&
        event.trigger.seconds > scene.duration
      )
        add("time_outside_duration", "TIME exceeds known duration", `events.${event.id}`);
      if (
        event.trigger.kind === "BEFORE_END" &&
        scene.duration !== undefined &&
        event.trigger.seconds > scene.duration
      )
        add(
          "before_end_outside_duration",
          "BEFORE_END exceeds known duration",
          `events.${event.id}`,
        );
      const refs =
        event.block === "video" || event.block === "audio"
          ? [event.assetId]
          : event.block === "incoming_call"
            ? [
                event.avatarAssetId,
                event.ringtoneAssetId,
                event.vibrationAssetId,
                event.connectSfxAssetId,
                event.voiceAssetId,
                event.endSfxAssetId,
              ]
            : event.block === "notification"
              ? [event.avatarAssetId, event.soundAssetId]
              : event.block === "messaging"
                ? [event.avatarAssetId, ...event.messages.map((message) => message.audioAssetId)]
                : [];
      for (const assetId of refs)
        if (assetId && !assets.has(assetId))
          add("asset_missing", "Asset does not exist", `events.${event.id}`);
      if (event.block === "quiz" && !event.questions.length)
        add("quiz_empty", "Quiz requires questions", `events.${event.id}`);
      if (event.block === "quiz")
        event.questions.forEach((q) => {
          // The guided editor itself warns "adicione pelo menos duas opções" (a single-option question
          // isn't really a question) — the validator has to enforce that same rule or a quiz can be
          // marked "valid" and exported with a meaningless one-option question.
          if (q.options.length < 2)
            add(
              "quiz_options_empty",
              "Quiz question requires at least two options",
              `events.${event.id}.${q.id}`,
            );
        });
      if (event.block === "choice" && event.options.length < 2)
        add("choice_empty", "Choice requires at least two options", `events.${event.id}`);
      if (event.block === "messaging" && !event.messages.length)
        add("messaging_empty", "Messaging requires messages", `events.${event.id}`);
      if (
        event.block === "incoming_call" &&
        !event.onAccept.length &&
        !event.onDecline.length &&
        !event.onEnd.length
      )
        add("call_no_exit", "Call requires an explicit outcome", `events.${event.id}`);
      if (
        funnelBlockRegistry.isBlocking(event) &&
        !event.actions.length &&
        event.block !== "incoming_call"
      )
        add("blocking_no_exit", "Blocking event requires an action", `events.${event.id}`);
      for (const action of event.actions) {
        if (action.type === "GO_TO_SCENE" && !scenes.has(action.sceneId))
          add("scene_target_missing", "Action scene target missing", `events.${event.id}`);
        if (action.type === "OPEN_EVENT" && !scene.events.some((e) => e.id === action.eventId))
          add("event_target_missing", "Action event target missing", `events.${event.id}`);
      }
    }
  }
  const reachable = new Set<string>([funnel.entrySceneId]);
  for (let pass = 0; pass < funnel.scenes.length; pass++) {
    for (const scene of funnel.scenes) {
      if (reachable.has(scene.id)) {
        if (scene.nextSceneId) reachable.add(scene.nextSceneId);
        scene.events.forEach((e) =>
          e.actions.forEach((a) => {
            if (a.type === "GO_TO_SCENE") reachable.add(a.sceneId);
          }),
        );
      }
    }
  }
  funnel.scenes
    .filter((s) => !reachable.has(s.id))
    .forEach((s) => add("scene_unreachable", "Scene cannot be reached", `scenes.${s.id}`));
  return issues;
}
