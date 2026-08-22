import type {
  ActionDefinition,
  FunnelDefinition,
  SceneDefinition,
  SceneEventDefinition,
  TriggerDefinition,
} from "../schema/v1";
import { defaultEvent, uid } from "./studioState";
import { validateFunnel } from "../validator/validateFunnel";

export type GuidedUiState = {
  mode: "home" | "guided" | "advanced";
  funnelId?: string;
  sceneId?: string;
  eventId?: string;
  step?: "script" | "production" | "video" | "interactivity" | "test" | "review";
};
export const guidedUiKey = "funnel-studio:v1:guided-ui";
export const loadGuidedUi = (): GuidedUiState => {
  try {
    return JSON.parse(localStorage.getItem(guidedUiKey) || '{"mode":"home"}');
  } catch {
    return { mode: "home" };
  }
};
export const saveGuidedUi = (state: GuidedUiState) =>
  localStorage.setItem(guidedUiKey, JSON.stringify(state));
// Runtime-affecting values only: UI navigation and copy edits do not invalidate a test.
export const sceneStructuralFingerprint = (scene: SceneDefinition) =>
  JSON.stringify({
    videoAssetId: scene.videoAssetId,
    posterAssetId: scene.posterAssetId,
    duration: scene.duration,
    startAt: scene.startAt,
    endAt: scene.endAt,
    nextSceneId: scene.nextSceneId,
    events: scene.events,
  });
export function markSceneTested(funnel: FunnelDefinition, sceneId: string): FunnelDefinition {
  return {
    ...funnel,
    scenes: funnel.scenes.map((scene) =>
      scene.id === sceneId
        ? { ...scene, guided: { ...scene.guided, tested: true, testedAt: Date.now(), testedFingerprint: sceneStructuralFingerprint(scene) } }
        : scene,
    ),
  };
}
export function invalidateStructuralTests(previous: FunnelDefinition, next: FunnelDefinition): FunnelDefinition {
  const runtimeAsset = (asset: FunnelDefinition["assets"][number] | undefined) =>
    asset?.source === "permanent"
      ? `${asset.source}:${asset.url}`
      : `${asset?.source}:${asset?.objectUrl ?? asset?.status ?? ""}`;
  const changedAssetIds = new Set(
    next.assets
      .filter((asset) => runtimeAsset(asset) !== runtimeAsset(previous.assets.find((item) => item.id === asset.id)))
      .map((asset) => asset.id),
  );
  const sceneAssetIds = (scene: SceneDefinition) => [
    scene.videoAssetId,
    scene.posterAssetId,
    ...scene.events.flatMap((event) => {
      if (event.block === "audio" || event.block === "video") return [event.assetId];
      if (event.block === "incoming_call") return [event.avatarAssetId, event.ringtoneAssetId, event.vibrationAssetId, event.connectSfxAssetId, event.voiceAssetId, event.endSfxAssetId];
      if (event.block === "notification") return [event.avatarAssetId, event.soundAssetId];
      if (event.block === "messaging") return [event.avatarAssetId, ...event.messages.map((message) => message.audioAssetId)];
      return [];
    }),
  ];
  return {
    ...next,
    scenes: next.scenes.map((scene) => {
      const before = previous.scenes.find((item) => item.id === scene.id);
      const assetChanged = sceneAssetIds(scene).some((assetId) => assetId && changedAssetIds.has(assetId));
      if (!before || (!assetChanged && sceneStructuralFingerprint(before) === sceneStructuralFingerprint(scene))) return scene;
      return { ...scene, guided: { ...scene.guided, tested: false, testedAt: undefined, testedFingerprint: undefined } };
    }),
  };
}
export const triggerFromGuided = (
  kind: "start" | "time" | "before_end" | "end" | "after",
  seconds = 0,
  interactionId = "",
): TriggerDefinition =>
  kind === "start"
    ? { kind: "SCENE_START" }
    : kind === "time"
      ? { kind: "TIME", seconds }
      : kind === "before_end"
        ? { kind: "BEFORE_END", seconds }
        : kind === "end"
          ? { kind: "VIDEO_END" }
          : { kind: "INTERACTION_COMPLETE", interactionId };
export const actionFromGuided = (
  kind: "resume" | "pause" | "next" | "scene" | "open" | "stop",
  target = "",
): ActionDefinition =>
  kind === "resume"
    ? { type: "RESUME_VIDEO" }
    : kind === "pause"
      ? { type: "PAUSE_VIDEO" }
      : kind === "next"
        ? { type: "NEXT_SCENE" }
        : kind === "scene"
          ? { type: "GO_TO_SCENE", sceneId: target }
          : kind === "open"
            ? { type: "OPEN_EVENT", eventId: target }
            : { type: "STOP" };
export function guidedEvent(
  block: SceneEventDefinition["block"],
  trigger: TriggerDefinition,
  action: ActionDefinition,
): SceneEventDefinition {
  const event = defaultEvent(block);
  return { ...event, trigger, actions: [action] } as SceneEventDefinition;
}
export function createGuidedInteraction(
  funnel: FunnelDefinition,
  sceneId: string,
  block: Extract<SceneEventDefinition["block"], "quiz" | "notification" | "audio" | "scene_transition" | "incoming_call" | "messaging" | "choice">,
): FunnelDefinition {
  const scene = funnel.scenes.find((item) => item.id === sceneId);
  if (!scene) return funnel;
  const event = defaultEvent(block);
  if (event.block === "quiz" && event.questions[0])
    event.questions[0].options.push({ id: uid("option"), label: "Opção 2" });
  if (event.block === "scene_transition")
    event.targetSceneId = scene.nextSceneId || funnel.scenes.find((item) => item.id !== sceneId)?.id || "";
  if (event.block === "choice")
    event.options.push({ id: uid("option"), label: "Opção 2" });
  return { ...funnel, scenes: funnel.scenes.map((item) => item.id === sceneId ? { ...item, events: [...item.events, event] } : item) };
}
export function updateGuidedInteraction(funnel: FunnelDefinition, sceneId: string, event: SceneEventDefinition): FunnelDefinition {
  return { ...funnel, scenes: funnel.scenes.map((scene) => scene.id === sceneId ? { ...scene, events: scene.events.map((item) => item.id === event.id ? event : item) } : scene) };
}
export function duplicateGuidedInteraction(funnel: FunnelDefinition, sceneId: string, eventId: string): FunnelDefinition {
  return { ...funnel, scenes: funnel.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    const event = scene.events.find((item) => item.id === eventId);
    if (!event) return scene;
    const copy = { ...structuredClone(event), id: uid("event") } as SceneEventDefinition;
    if (copy.block === "messaging") copy.messages = copy.messages.map((message) => ({ ...message, id: uid("message") }));
    if (copy.block === "choice") copy.options = copy.options.map((option) => ({ ...option, id: uid("option") }));
    if (copy.block === "quiz") copy.questions = copy.questions.map((question) => ({ ...question, id: uid("question"), options: question.options.map((option) => ({ ...option, id: uid("option") })) }));
    return { ...scene, events: [...scene.events, copy] };
  }) };
}
export function guidedInteractionReferences(funnel: FunnelDefinition, eventId: string) {
  return funnel.scenes.flatMap((scene) => scene.events.flatMap((event) => {
    const refs: string[] = [];
    if (event.trigger.kind === "INTERACTION_COMPLETE" && event.trigger.interactionId === eventId) refs.push("dispara depois desta interação");
    if (event.actions.some((action) => action.type === "OPEN_EVENT" && action.eventId === eventId)) refs.push("abre esta interação");
    if (event.block === "notification" && [...event.onTap, ...event.onDismiss].some((action) => action.type === "OPEN_EVENT" && action.eventId === eventId)) refs.push("notificação abre esta interação");
    return refs.map((label) => `${scene.title}: ${label}`);
  }));
}
export function deleteGuidedInteraction(funnel: FunnelDefinition, sceneId: string, eventId: string): FunnelDefinition {
  return { ...funnel, scenes: funnel.scenes.map((scene) => scene.id === sceneId ? { ...scene, events: scene.events.filter((event) => event.id !== eventId) } : scene) };
}
export function sceneStatus(scene: SceneDefinition, funnel: FunnelDefinition) {
  const script = scene.guided?.script?.happens
    ? "PRONTO"
    : scene.guided
      ? "EM ANDAMENTO"
      : "NÃO INICIADO";
  const production = scene.guided?.productionGuide?.steps.some((step) => step.completed)
    ? "EM ANDAMENTO"
    : "NÃO INICIADO";
  const video = scene.videoAssetId ? "PRONTO" : "NÃO INICIADO";
  const interactivity = scene.events.length ? "PRONTO" : "NÃO INICIADO";
  const test = scene.guided?.tested ? "PRONTO" : "NÃO INICIADO";
  return { script, production, video, interactivity, test };
}
// Validation issue paths are "scenes.<sceneId>..." or "events.<eventId>..." (never both), so matching a
// scene by substring against scene.id alone misses every event-level issue that belongs to that scene.
export const issueBelongsToScene = (path: string, scene: SceneDefinition) =>
  path.startsWith(`scenes.${scene.id}`) || scene.events.some((event) => path.startsWith(`events.${event.id}`));
export function nextGuidedStep(scene: SceneDefinition, funnel: FunnelDefinition) {
  const status = sceneStatus(scene, funnel);
  if (status.script !== "PRONTO") return "Primeiro descreva o que acontece nesta cena.";
  if (!scene.videoAssetId) return "Produza ou adicione o vídeo final desta cena.";
  const errors = validateFunnel(funnel).filter((issue) => issueBelongsToScene(issue.path, scene));
  if (errors.length) return `Corrija ${errors.length} configurações antes de testar.`;
  if (!scene.events.length) return "Quer tornar esta cena interativa?";
  if (!scene.guided?.tested) return "Teste esta cena.";
  return "Esta cena está pronta. Continue para a próxima cena.";
}
export type TestStepDestination =
  | { kind: "fix"; label: string }
  | { kind: "next-scene"; label: string; sceneId: string }
  | { kind: "review"; label: string };

/**
 * What the "test" tab's primary button should do and say — extracted as a pure function so it's testable
 * without rendering GuidedBuilder (this repo has no React component test harness). Previously the button
 * just paginated through the fixed per-scene tab list, so on "test" (the last tab) it silently did
 * nothing — a no-op indistinguishable from a bug.
 */
export function testStepDestination(funnel: FunnelDefinition, scene: SceneDefinition, sceneIssues: unknown[]): TestStepDestination {
  if (sceneIssues.length) return { kind: "fix", label: "Corrigir antes de continuar" };
  const nextScene = funnel.scenes[funnel.scenes.findIndex((item) => item.id === scene.id) + 1];
  if (nextScene) return { kind: "next-scene", label: "Ir para próxima cena →", sceneId: nextScene.id };
  return { kind: "review", label: "Revisar experiência" };
}

export function guidedProgress(funnel: FunnelDefinition) {
  // A scene only counts as ready once every guided step that matters is actually done: it needs a
  // script, not just a video that happens to be attached and a stale "tested" flag.
  const ready = funnel.scenes.filter((scene) => {
    const status = sceneStatus(scene, funnel);
    return status.script === "PRONTO" && status.video === "PRONTO" && status.test === "PRONTO";
  }).length;
  return {
    ready,
    total: funnel.scenes.length,
    percent: funnel.scenes.length ? Math.round((ready / funnel.scenes.length) * 100) : 0,
    errors: validateFunnel(funnel).length,
  };
}
export function addGuidedScene(funnel: FunnelDefinition, title = "Nova cena"): FunnelDefinition {
  const scene: SceneDefinition = { id: uid("scene"), title, events: [], guided: {} };
  const last = funnel.scenes.at(-1);
  return {
    ...funnel,
    scenes: [
      ...funnel.scenes.map((item) =>
        item.id === last?.id ? { ...item, nextSceneId: scene.id } : item,
      ),
      scene,
    ],
  };
}
// Every event can reference another scene through more than one action list depending on its block
// (base actions, plus onAccept/onDecline/onEnd for calls, onClose for messaging, onTap/onDismiss for
// notifications) — this touches all of them so a deleted scene never leaves a dangling GO_TO_SCENE.
function stripSceneFromEvent(event: SceneEventDefinition, sceneId: string): SceneEventDefinition {
  const clear = (actions: ActionDefinition[]) =>
    actions.filter((action) => action.type !== "GO_TO_SCENE" || action.sceneId !== sceneId);
  const next = { ...event, actions: clear(event.actions) };
  if (next.block === "incoming_call") {
    next.onAccept = clear(next.onAccept);
    next.onDecline = clear(next.onDecline);
    next.onEnd = clear(next.onEnd);
  }
  if (next.block === "messaging") next.onClose = clear(next.onClose);
  if (next.block === "notification") {
    next.onTap = clear(next.onTap);
    next.onDismiss = clear(next.onDismiss);
  }
  return next;
}
export function guidedSceneReferences(funnel: FunnelDefinition, sceneId: string): string[] {
  const refs: string[] = [];
  if (funnel.entrySceneId === sceneId) refs.push("É a cena inicial do funil");
  for (const scene of funnel.scenes) {
    if (scene.id === sceneId) continue;
    if (scene.nextSceneId === sceneId) refs.push(`${scene.title}: cena seguinte`);
    for (const event of scene.events) {
      const arrays: [string, ActionDefinition[]][] = [
        ["ação", event.actions],
        ...(event.block === "incoming_call" ? ([["ligação aceita", event.onAccept], ["ligação recusada", event.onDecline], ["ligação encerrada", event.onEnd]] as [string, ActionDefinition[]][]) : []),
        ...(event.block === "messaging" ? ([["mensagem fechada", event.onClose]] as [string, ActionDefinition[]][]) : []),
        ...(event.block === "notification" ? ([["notificação tocada", event.onTap], ["notificação dispensada", event.onDismiss]] as [string, ActionDefinition[]][]) : []),
      ];
      if (event.block === "scene_transition" && event.targetSceneId === sceneId) refs.push(`${scene.title}: vai para outra cena`);
      for (const [label, actions] of arrays)
        if (actions.some((action) => action.type === "GO_TO_SCENE" && action.sceneId === sceneId)) refs.push(`${scene.title}: ${label} vai para esta cena`);
    }
  }
  return refs;
}
export function deleteGuidedScene(funnel: FunnelDefinition, sceneId: string): FunnelDefinition {
  const rest = funnel.scenes.filter((scene) => scene.id !== sceneId);
  if (!rest.length) return funnel;
  return {
    ...funnel,
    entrySceneId: funnel.entrySceneId === sceneId ? rest[0]!.id : funnel.entrySceneId,
    scenes: rest
      .map((scene) => ({ ...scene, nextSceneId: scene.nextSceneId === sceneId ? undefined : scene.nextSceneId }))
      .map((scene) => ({
        ...scene,
        events: scene.events
          .filter((event) => event.block !== "scene_transition" || event.targetSceneId !== sceneId)
          .map((event) => stripSceneFromEvent(event, sceneId)),
      })),
  };
}
export function duplicateGuidedScene(funnel: FunnelDefinition, sceneId: string): FunnelDefinition {
  const index = funnel.scenes.findIndex((scene) => scene.id === sceneId);
  const source = funnel.scenes[index];
  if (!source) return funnel;
  const copy: SceneDefinition = {
    ...structuredClone(source),
    id: uid("scene"),
    title: `${source.title} (cópia)`,
    nextSceneId: undefined,
    events: source.events.map((event) => {
      const cloned = { ...structuredClone(event), id: uid("event") } as SceneEventDefinition;
      if (cloned.block === "messaging") cloned.messages = cloned.messages.map((message) => ({ ...message, id: uid("message") }));
      if (cloned.block === "choice") cloned.options = cloned.options.map((option) => ({ ...option, id: uid("option") }));
      if (cloned.block === "quiz") cloned.questions = cloned.questions.map((question) => ({ ...question, id: uid("question"), options: question.options.map((option) => ({ ...option, id: uid("option") })) }));
      return cloned;
    }),
  };
  const scenes = [...funnel.scenes];
  scenes.splice(index + 1, 0, copy);
  return { ...funnel, scenes };
}
export function createGuidedFunnel(
  type: "story" | "vsl" | "quiz" | "gamified" | "training" | "blank",
  title: string,
  description: string,
  structure: "one" | "three" | "empty",
): FunnelDefinition {
  const first: SceneDefinition = { id: uid("scene"), title: "Cena 01", events: [], guided: {} };
  const scenes =
    structure === "empty"
      ? []
      : structure === "three"
        ? [
            first,
            { id: uid("scene"), title: "Cena 02", events: [], guided: {} },
            { id: uid("scene"), title: "Cena 03", events: [], guided: {} },
          ]
        : [first];
  return {
    schemaVersion: 1,
    id: uid("funnel"),
    title,
    entrySceneId: scenes[0]?.id || uid("scene"),
    exportable: true,
    assets: [],
    scenes: scenes.map((scene, index) => ({ ...scene, nextSceneId: scenes[index + 1]?.id })),
    guided: { experienceType: type, description: description || undefined },
  };
}
export const humanValidation = (code: string) =>
  ({
    scene_unreachable: "Esta cena não pode ser alcançada a partir do início.",
    scene_target_missing: "Esta interação aponta para uma cena que não existe.",
    event_target_missing: "Esta interação aponta para algo que não existe.",
    blocking_no_exit: "Esta interação pode deixar a pessoa presa sem continuar.",
    asset_missing: "Falta um arquivo usado nesta cena.",
    quiz_empty: "Este Quiz precisa de uma pergunta e opções.",
    quiz_options_empty: "Este Quiz precisa de opções.",
    preview_asset: "Um arquivo local precisa ser reanexado ou trocado por URL permanente.",
  })[code] || "Revise esta configuração.";
