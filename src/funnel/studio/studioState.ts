import {
  funnelSchema,
  type FunnelDefinition,
  type SceneDefinition,
  type SceneEventDefinition,
} from "../schema/v1";
import { marinaProofFunnel } from "../definitions/marinaProofs";
import { marinaOfficialFunnel } from "../definitions/marinaOfficialFunnel";
import { validateFunnel } from "../validator/validateFunnel";

export const STUDIO_INDEX_KEY = "funnel-studio:v1:projects";
export const funnelKey = (id: string) => `funnel-studio:v1:funnel:${id}`;
export type StudioProject = { id: string; title: string; updatedAt: number };
export type StudioStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const clone = <T>(value: T): T => structuredClone(value);
export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
export function emptyFunnel(title = "Novo funil"): FunnelDefinition {
  const scene = { id: uid("scene"), title: "Cena 01", events: [] };
  return {
    schemaVersion: 1,
    id: uid("funnel"),
    title,
    entrySceneId: scene.id,
    exportable: true,
    assets: [],
    scenes: [scene],
  };
}
export function defaultEvent(
  block: SceneEventDefinition["block"],
  seconds = 0,
): SceneEventDefinition {
  const base = {
    id: uid("event"),
    trigger: { kind: "TIME" as const, seconds },
    blocking: false,
    actions: [],
  };
  switch (block) {
    case "audio":
      return { ...base, block, assetId: "", volume: 1 };
    case "incoming_call":
      return {
        ...base,
        block,
        blocking: true,
        callerName: "Contato",
        onAccept: [{ type: "RESUME_VIDEO" }],
        onDecline: [{ type: "RESUME_VIDEO" }],
        onEnd: [{ type: "RESUME_VIDEO" }],
      };
    case "messaging":
      return {
        ...base,
        block,
        blocking: true,
        contactName: "Contato",
        messages: [{ id: uid("message"), type: "text", text: "Nova mensagem" }],
        voiceFailure: "skip",
        onClose: [{ type: "RESUME_VIDEO" }],
        actions: [{ type: "RESUME_VIDEO" }],
      };
    case "notification":
      return {
        ...base,
        block,
        appName: "Mensagens",
        senderName: "Contato",
        message: "Nova notificação",
        onTap: [],
        onDismiss: [],
      };
    case "quiz":
      return {
        ...base,
        block,
        blocking: true,
        title: "Nova pergunta",
        questions: [
          {
            id: uid("question"),
            title: "Pergunta",
            options: [{ id: uid("option"), label: "Opção" }],
          },
        ],
        actions: [{ type: "RESUME_VIDEO" }],
      };
    case "choice":
      return {
        ...base,
        block,
        blocking: true,
        title: "Nova escolha",
        options: [{ id: uid("option"), label: "Opção" }],
        actions: [{ type: "RESUME_VIDEO" }],
      };
    case "scene_transition":
      return { ...base, block, trigger: { kind: "VIDEO_END" }, targetSceneId: "", actions: [] };
    case "video":
      return { ...base, block, trigger: { kind: "SCENE_START" } };
  }
}
export function reorderScenes(funnel: FunnelDefinition, from: number, to: number) {
  const next = clone(funnel);
  const [scene] = next.scenes.splice(from, 1);
  if (scene) next.scenes.splice(to, 0, scene);
  return next;
}
export function duplicateFunnel(funnel: FunnelDefinition) {
  const copy = clone(funnel);
  copy.id = uid("funnel");
  copy.title = `${copy.title} (cópia)`;
  return copy;
}
export function serializeForStorage(funnel: FunnelDefinition): FunnelDefinition {
  return {
    ...clone(funnel),
    assets: funnel.assets.map((asset) =>
      asset.source === "preview"
        ? (() => {
            const { objectUrl: _objectUrl, ...persisted } = asset;
            return { ...persisted, status: "needs_reattach" as const };
          })()
        : asset,
    ),
  };
}
export function saveFunnel(storage: StudioStorage, funnel: FunnelDefinition) {
  storage.setItem(funnelKey(funnel.id), JSON.stringify(serializeForStorage(funnel)));
  const index = JSON.parse(storage.getItem(STUDIO_INDEX_KEY) || "[]") as StudioProject[];
  const next = [
    ...index.filter((p) => p.id !== funnel.id),
    { id: funnel.id, title: funnel.title, updatedAt: Date.now() },
  ];
  storage.setItem(STUDIO_INDEX_KEY, JSON.stringify(next));
}
export function loadProjects(storage: StudioStorage) {
  return JSON.parse(storage.getItem(STUDIO_INDEX_KEY) || "[]") as StudioProject[];
}
export function deleteFunnelData(storage: StudioStorage, funnelId: string) {
  storage.removeItem(funnelKey(funnelId));
  storage.setItem(STUDIO_INDEX_KEY, JSON.stringify(loadProjects(storage).filter((project) => project.id !== funnelId)));
}
export function loadFunnel(storage: StudioStorage, id: string) {
  const raw = storage.getItem(funnelKey(id));
  return raw ? funnelSchema.parse(JSON.parse(raw)) : null;
}
export function seedDemo(storage: StudioStorage) {
  if (!loadFunnel(storage, marinaProofFunnel.id)) saveFunnel(storage, marinaProofFunnel);
  return marinaProofFunnel;
}
/** Seeds the real product funnel (not the technical runtime proof) for Product Studio. */
export function seedOfficialFunnel(storage: StudioStorage) {
  const existing = loadFunnel(storage, marinaOfficialFunnel.id);
  if (existing) return existing;
  saveFunnel(storage, marinaOfficialFunnel);
  return marinaOfficialFunnel;
}
export function importFunnel(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { funnel: null, errors: ["JSON inválido"] };
  }
  const candidate =
    value && typeof value === "object" && "funnel" in value
      ? (value as { funnel: unknown }).funnel
      : value;
  const parsed = funnelSchema.safeParse(candidate);
  if (!parsed.success) return { funnel: null, errors: parsed.error.issues.map((i) => i.message) };
  const issues = validateFunnel(parsed.data);
  return { funnel: parsed.data, errors: issues.map((i) => i.message) };
}
export function exportFunnel(funnel: FunnelDefinition) {
  const issues = validateFunnel(funnel);
  return { json: JSON.stringify(funnel, null, 2), issues };
}
export const previewAssetsNeedReattach = (funnel: FunnelDefinition) =>
  funnel.assets.filter((asset) => asset.source === "preview").map((asset) => asset.id);
export type AssetUsage = { assetId: string; label: string; path: string };
export function findAssetUsages(funnel: FunnelDefinition, assetId: string): AssetUsage[] {
  const usages: AssetUsage[] = [];
  const add = (id: string | undefined, label: string, path: string) => {
    if (id === assetId) usages.push({ assetId, label, path });
  };
  for (const scene of funnel.scenes) {
    add(scene.videoAssetId, `${scene.title} — Vídeo principal`, `scenes.${scene.id}.videoAssetId`);
    add(scene.posterAssetId, `${scene.title} — Poster`, `scenes.${scene.id}.posterAssetId`);
    for (const event of scene.events) {
      const prefix = `${scene.title} — ${event.block}`;
      if (event.block === "audio" || event.block === "video")
        add(event.assetId, `${prefix} / Asset`, `events.${event.id}.assetId`);
      if (event.block === "incoming_call") {
        add(event.avatarAssetId, `${prefix} / Avatar`, `events.${event.id}.avatarAssetId`);
        add(event.ringtoneAssetId, `${prefix} / Ringtone`, `events.${event.id}.ringtoneAssetId`);
        add(event.vibrationAssetId, `${prefix} / Vibração`, `events.${event.id}.vibrationAssetId`);
        add(
          event.connectSfxAssetId,
          `${prefix} / Connect SFX`,
          `events.${event.id}.connectSfxAssetId`,
        );
        add(event.voiceAssetId, `${prefix} / Voice`, `events.${event.id}.voiceAssetId`);
        add(event.endSfxAssetId, `${prefix} / End SFX`, `events.${event.id}.endSfxAssetId`);
      }
      if (event.block === "notification") {
        add(event.avatarAssetId, `${prefix} / Avatar`, `events.${event.id}.avatarAssetId`);
        add(event.soundAssetId, `${prefix} / Sound`, `events.${event.id}.soundAssetId`);
      }
      if (event.block === "messaging") {
        add(event.avatarAssetId, `${prefix} / Avatar`, `events.${event.id}.avatarAssetId`);
        event.messages.forEach((message) =>
          add(
            message.audioAssetId,
            `${prefix} / ${message.type}`,
            `events.${event.id}.messages.${message.id}.audioAssetId`,
          ),
        );
      }
    }
  }
  return usages;
}
export function removeAsset(funnel: FunnelDefinition, assetId: string): FunnelDefinition {
  const clear = (value: string | undefined) => (value === assetId ? undefined : value);
  return {
    ...funnel,
    assets: funnel.assets.filter((asset) => asset.id !== assetId),
    scenes: funnel.scenes.map((scene) => ({
      ...scene,
      videoAssetId: clear(scene.videoAssetId),
      posterAssetId: clear(scene.posterAssetId),
      events: scene.events.map((event) => {
        if (event.block === "audio" || event.block === "video")
          return { ...event, assetId: clear(event.assetId) } as SceneEventDefinition;
        if (event.block === "incoming_call")
          return {
            ...event,
            avatarAssetId: clear(event.avatarAssetId),
            ringtoneAssetId: clear(event.ringtoneAssetId),
            vibrationAssetId: clear(event.vibrationAssetId),
            connectSfxAssetId: clear(event.connectSfxAssetId),
            voiceAssetId: clear(event.voiceAssetId),
            endSfxAssetId: clear(event.endSfxAssetId),
          };
        if (event.block === "notification")
          return {
            ...event,
            avatarAssetId: clear(event.avatarAssetId),
            soundAssetId: clear(event.soundAssetId),
          };
        if (event.block === "messaging")
          return {
            ...event,
            avatarAssetId: clear(event.avatarAssetId),
            messages: event.messages.map((message) => ({
              ...message,
              audioAssetId: clear(message.audioAssetId),
            })),
          };
        return event;
      }),
    })),
  };
}
export function exportStudioFunnel(funnel: FunnelDefinition, mode: "draft" | "valid") {
  const normalized = serializeForStorage({ ...funnel, exportable: mode === "valid" });
  const issues = validateFunnel(normalized);
  return {
    json: JSON.stringify(normalized, null, 2),
    issues,
    ok: mode === "draft" || issues.length === 0,
  };
}
