import type { FunnelDefinition, AssetRef, SceneDefinition, SceneEventDefinition, TriggerDefinition } from "../schema/v1";
import { STORY_MAP, type StoryCheckpoint } from "@/dev/story-checkpoints";
import { validateFunnel, type FunnelValidationIssue } from "../validator/validateFunnel";
import { sceneStatus, issueBelongsToScene, type GuidedUiState } from "./guidedState";
import { marinaProofFunnel } from "../definitions/marinaProofs";
import type { View } from "./ProductStudio";

/**
 * Everything here is a READ-ONLY view over the official FunnelDefinition, STORY_MAP and the real
 * validator — the Blueprint route never stores its own copy of the funnel and never introduces a second
 * schema. The only original data below is SCENE_CHECKPOINTS (a presentation-only cross-reference from
 * scene id to the checkpoint ids it represents) and PLANNED_PRODUCTION (production notes for a scene that
 * does not exist in the runtime yet — see its own doc comment).
 */

// Which STORY_MAP checkpoints each official scene represents on screen. Checkpoints don't map 1:1 to
// scenes (e.g. the dinner scene carries three checkpoints as events), so this is a list, not a lookup key.
export const SCENE_CHECKPOINTS: Record<string, StoryCheckpoint[]> = {
  "scene-01-a-porta": ["scene01-start"],
  "scene-01-memoria": ["scene01-start"],
  "scene-01-memoria-porta": ["scene01-start"],
  "scene-01-pre-ligacao": ["scene01-call"],
  "scene-02-jantar": ["scene02-start", "scene02-quiz", "scene02-notification"],
  "scene-02-lucia-audio": ["lucia-send-audio", "whatsapp"],
  "scene-03-outro-dia": ["scene03-start"],
  "scene-03-consequencia": ["scene03-consequence", "scene03-quiz"],
  "scene-04-marina-futuro": ["future-marina-call-01"],
  "scene-05-espelho": ["scene05-mirror"],
};

export const checkpointsFor = (sceneId: string) =>
  (SCENE_CHECKPOINTS[sceneId] || []).map((id) => STORY_MAP.find((step) => step.id === id)).filter(Boolean) as (typeof STORY_MAP)[number][];

/**
 * Production notes for "A Foto Que Nunca É Boa", the next scene to shoot. It has no video, no
 * FunnelDefinition entry and no runtime representation — this is pure authoring metadata for the
 * Blueprint. It must never be read by the runtime, the validator, or exported as part of a funnel.
 */
export type PlannedTake = { id: string; character?: string; line?: string; direction?: string };
export type PlannedProduction = {
  title: string;
  status: "planejada";
  objective: string;
  takes: PlannedTake[];
  characters: string[];
  wardrobe: { character: string; items: string[]; avoid?: string }[];
};
export const PLANNED_PRODUCTION: PlannedProduction = {
  title: "A Foto Que Nunca É Boa",
  status: "planejada",
  objective:
    "Marina e Clara olham a mesma selfie. Marina enxerga defeitos em si. Clara não consegue enxergar nada do que a mãe está descrevendo.",
  characters: ["Marina", "Clara, 18 anos"],
  takes: [
    { id: "take-1", character: "Clara", line: "Vem, vamos tirar uma foto.", direction: "Clara aproxima Marina e tira a selfie. Marina não fala." },
    { id: "take-2", character: "Clara", line: "Ficou linda." },
    { id: "take-3", character: "Marina", line: "Não.", direction: 'Depois: "Meu Deus, olha minha cara."' },
    { id: "take-4", character: "Marina", line: "Apaga." },
    { id: "take-5", character: "Clara", line: "Mãe, você nunca gosta de nenhuma foto sua." },
    { id: "take-6", character: "Marina", line: "Porque eu nunca fico bem." },
    { id: "take-7", character: "Clara", line: "Eu acho estranho porque eu tô olhando pra você... e não tô vendo nada disso.", direction: "Depois: silêncio." },
  ],
  wardrobe: [
    {
      character: "Clara",
      items: ["top fitted bordô / vinho profundo (burgundy), tecido ribbed, manga curta", "jeans claro high-waisted straight-leg", "argolas pequenas", "acessórios simples e jovens"],
      avoid: "NÃO usar o figurino azul antigo nesta cena.",
    },
  ],
};

// ---- Assets ----------------------------------------------------------------
export type AssetOrigin = "local" | "r2" | "cloudinary" | "permanente" | "faltando";
export function assetOrigin(asset: AssetRef): AssetOrigin {
  if (asset.source === "preview") return "faltando";
  if (asset.url.startsWith("/media/")) return "r2";
  if (asset.url.includes("cloudinary.com")) return "cloudinary";
  if (asset.url.startsWith("/assets/")) return "local";
  return "permanente";
}
export function assetSummary(funnel: FunnelDefinition) {
  const byType = (mediaType: AssetRef["mediaType"]) =>
    funnel.assets.filter((asset) => asset.mediaType === mediaType).map((asset) => ({ asset, origin: assetOrigin(asset) }));
  return { videos: byType("video"), audios: byType("audio"), images: byType("image") };
}

// ---- Scene cards -------------------------------------------------------------
export type SceneCardStatus = "pronta" | "precisa_testar" | "em_producao" | "com_erro";
export type InteractionSummary = { icon: string; label: string; trigger: string; outcome: string };

const TRIGGER_LABEL = (trigger: TriggerDefinition): string =>
  trigger.kind === "SCENE_START"
    ? "no início do vídeo"
    : trigger.kind === "TIME"
      ? `em ~${trigger.seconds}s`
      : trigger.kind === "BEFORE_END"
        ? `${trigger.seconds}s antes do final`
        : trigger.kind === "VIDEO_END"
          ? "quando o vídeo termina"
          : trigger.kind === "MANUAL"
            ? "manual"
            : "depois de outra interação";

const ACTION_LABEL = (event: SceneEventDefinition): string => {
  const first =
    "onEnd" in event && event.onEnd.length ? event.onEnd[0] : "actions" in event && event.actions.length ? event.actions[0] : undefined;
  if (!first) return "sem ação definida";
  if (first.type === "RESUME_VIDEO") return "continua o vídeo";
  if (first.type === "NEXT_SCENE") return "vai para a próxima cena";
  if (first.type === "GO_TO_SCENE") return "vai para outra cena";
  if (first.type === "OPEN_EVENT") return "abre outra interação";
  if (first.type === "COMPLETE_SCENE") return "encerra a experiência (fim real da produção)";
  return "encerra";
};

function interactionsFor(scene: SceneDefinition): InteractionSummary[] {
  return scene.events
    .filter((event) => event.block !== "scene_transition")
    .map((event) => {
      const trigger = TRIGGER_LABEL(event.trigger);
      switch (event.block) {
        case "quiz":
          return { icon: "❓", label: event.questions[0]?.title || event.title, trigger, outcome: ACTION_LABEL(event) };
        case "incoming_call":
          return { icon: "📞", label: `Ligação de ${event.callerName}`, trigger, outcome: `ao encerrar: ${ACTION_LABEL(event)}` };
        case "notification":
          return { icon: "🔔", label: `${event.senderName} — ${event.message}`, trigger, outcome: "toque abre a próxima parte" };
        case "messaging":
          return { icon: "💬", label: `Conversa com ${event.contactName}`, trigger, outcome: ACTION_LABEL(event) };
        case "audio":
          return { icon: "🔊", label: "Áudio", trigger, outcome: ACTION_LABEL(event) };
        case "choice":
          return { icon: "👆", label: event.title, trigger, outcome: ACTION_LABEL(event) };
        default:
          return { icon: "➡️", label: "Interação", trigger, outcome: ACTION_LABEL(event) };
      }
    });
}

export type SceneCard = {
  scene: SceneDefinition;
  index: number;
  checkpoints: (typeof STORY_MAP)[number][];
  status: SceneCardStatus;
  issues: FunnelValidationIssue[];
  interactions: InteractionSummary[];
  videoAsset?: AssetRef | undefined;
  exitAction: string;
  nextSceneTitle?: string | undefined;
};

export function buildSceneCards(funnel: FunnelDefinition): SceneCard[] {
  const allIssues = validateFunnel(funnel);
  return funnel.scenes.map((scene, index) => {
    const issues = allIssues.filter((issue) => issueBelongsToScene(issue.path, scene));
    const status = sceneStatus(scene, funnel);
    const transition = scene.events.find((event) => event.block === "scene_transition");
    const exitEvent = scene.events.find((event) => event.block !== "scene_transition") || transition;
    const cardStatus: SceneCardStatus = issues.length
      ? "com_erro"
      : status.video !== "PRONTO"
        ? "em_producao"
        : status.test !== "PRONTO"
          ? "precisa_testar"
          : "pronta";
    return {
      scene,
      index,
      checkpoints: checkpointsFor(scene.id),
      status: cardStatus,
      issues,
      interactions: interactionsFor(scene),
      videoAsset: funnel.assets.find((asset) => asset.id === scene.videoAssetId),
      exitAction: exitEvent ? ACTION_LABEL(exitEvent) : scene.nextSceneId ? "avança automaticamente" : "fim da produção",
      nextSceneTitle: funnel.scenes.find((item) => item.id === scene.nextSceneId)?.title,
    };
  });
}

// ---- Health -------------------------------------------------------------------
export type HealthItem = { ok: boolean; label: string };
export function funnelHealth(funnel: FunnelDefinition): HealthItem[] {
  const issues = validateFunnel(funnel);
  const untested = funnel.scenes.filter((scene) => sceneStatus(scene, funnel).test !== "PRONTO").length;
  const previewAssets = funnel.assets.filter((asset) => asset.source === "preview").length;
  return [
    { ok: !issues.some((issue) => issue.code === "scene_unreachable"), label: "todas as cenas oficiais são alcançáveis" },
    { ok: previewAssets === 0, label: "todos os assets são permanentes (nenhum preview local pendente)" },
    { ok: issues.length === 0, label: `validator sem erros (${issues.length} encontrados)` },
    { ok: funnel.id !== marinaProofFunnel.id, label: "proof técnico (marina-runtime-proof) mantido separado do funil oficial" },
    { ok: untested === 0, label: untested === 0 ? "todas as cenas testadas" : `${untested} cena(s) ainda precisam ser testadas` },
  ];
}

export function summaryCounts(funnel: FunnelDefinition) {
  const cards = buildSceneCards(funnel);
  const notStarted = funnel.scenes.filter((scene) => sceneStatus(scene, funnel).script === "NÃO INICIADO").length;
  return {
    scenes: funnel.scenes.length,
    interactions: funnel.scenes.reduce((sum, scene) => sum + scene.events.length, 0),
    assets: funnel.assets.length,
    ready: cards.filter((card) => card.status === "pronta").length,
    notStarted,
    inProgress: funnel.scenes.length - cards.filter((card) => card.status === "pronta").length - notStarted,
  };
}

// ---- Navigation back into Studio -----------------------------------------------
// Pure computation of where each Blueprint link should send the user — reusing the exact same
// ProductStudio `View` shape and guided-ui shape Studio itself persists, instead of a parallel router.
export type BlueprintNavTarget = { view: View; ui: GuidedUiState };
export function blueprintNavTargets(funnel: FunnelDefinition, productId: string): Record<"funil" | "arquivos" | "revisao", BlueprintNavTarget> {
  const view: View = { kind: "funnel", productId, funnelId: funnel.id };
  const base: GuidedUiState = { mode: "guided", funnelId: funnel.id, sceneId: funnel.entrySceneId, step: "script" };
  return {
    funil: { view, ui: base },
    // Arquivos lives one click away (the ARQUIVOS nav button) inside the guided funnel view — there is no
    // deep link into that modal without touching FunnelStudio's own local state.
    arquivos: { view, ui: base },
    revisao: { view, ui: { ...base, step: "review" } },
  };
}
// /studio always forces Guided mode for a product's funnel (ProductStudio renders <FunnelStudio
// forceGuided />), so an "advanced mode" deep link into /studio is silently overridden. The dedicated
// Advanced Editor route (/dev/funnel-studio) is the existing, correct destination for this link instead.
export const ADVANCED_EDITOR_ROUTE = "/dev/funnel-studio" as const;
export function editorAvancadoTarget(funnel: FunnelDefinition): GuidedUiState {
  return { mode: "advanced", funnelId: funnel.id };
}
