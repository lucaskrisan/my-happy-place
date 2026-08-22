import { useEffect, useState } from "react";
import type { ActionDefinition, FunnelDefinition, SceneEventDefinition, SceneDefinition, TriggerDefinition } from "../schema/v1";
import { actionFromGuided, createGuidedInteraction, deleteGuidedInteraction, duplicateGuidedInteraction, guidedInteractionReferences, triggerFromGuided, updateGuidedInteraction } from "./guidedState";
import { assetName } from "./assetManagerState";
import { GuidedPreview, formatTime } from "./GuidedPreview";
import { uid } from "./studioState";
import { InlineMediaPicker } from "./InlineMediaPicker";
import { SectionTitle, HelpText, Card, PrimaryButton, SecondaryButton, GhostButton, StudioSelect } from "./ui";

type Essential = Extract<SceneEventDefinition["block"], "quiz" | "notification" | "audio" | "scene_transition">;
const labels: Record<Essential, string> = { quiz: "Pergunta", notification: "Notificação", audio: "Áudio", scene_transition: "Ir para outra cena" };
const ICONS: Record<Essential, string> = { quiz: "❓", notification: "🔔", audio: "🔊", scene_transition: "➡️" };
const HINTS: Record<Essential, string> = {
  quiz: "Faça a pessoa responder algo antes de continuar.",
  notification: "Mostre uma notificação de celular durante a cena.",
  audio: "Toque um som ou uma fala por cima do vídeo.",
  scene_transition: "Leve para outra cena quando algo acontecer.",
};
const triggerLabel = (trigger: TriggerDefinition) => trigger.kind === "SCENE_START" ? "no começo do vídeo" : trigger.kind === "TIME" ? `em ${formatTime(trigger.seconds)}` : trigger.kind === "BEFORE_END" ? `${trigger.seconds.toFixed(2)}s antes do final` : trigger.kind === "VIDEO_END" ? "quando o vídeo terminar" : "depois de outra interação";
const actionLabel = (action?: ActionDefinition) => !action ? "continua o vídeo" : action.type === "RESUME_VIDEO" ? "continua o vídeo" : action.type === "NEXT_SCENE" ? "vai para a próxima cena" : action.type === "GO_TO_SCENE" ? "vai para outra cena" : action.type === "OPEN_EVENT" ? "abre outra interação" : "encerra";
export const field = "w-full rounded-lg border border-studio-border bg-white/[.03] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none transition-colors";
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">{label}</span>
      {children}
    </label>
  );
}

export function GuidedEssentialInteractions({ funnel, scene, urls, onChange, onAttachAsset, onAttachPreviewFile, focusEventId, onFocusHandled }: { funnel: FunnelDefinition; scene: SceneDefinition; urls: Record<string, string>; onChange: (funnel: FunnelDefinition) => void; onAttachAsset: () => void; onAttachPreviewFile: ((file: File, assetId?: string) => void) | undefined; focusEventId?: string | undefined; onFocusHandled?: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pickingTime, setPickingTime] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const events = scene.events.filter((event): event is Extract<SceneEventDefinition, { block: Essential }> => ["quiz", "notification", "audio", "scene_transition"].includes(event.block));
  // Opens the exact interaction a review issue pointed at, instead of leaving the user to find it themselves.
  useEffect(() => {
    if (!focusEventId || !events.some((event) => event.id === focusEventId)) return;
    setEditing(focusEventId);
    onFocusHandled?.();
  }, [focusEventId, events, onFocusHandled]);
  const create = (block: Essential) => {
    const next = createGuidedInteraction(funnel, scene.id, block);
    onChange(next);
    setEditing(next.scenes.find((item) => item.id === scene.id)?.events.at(-1)?.id || null);
  };
  const update = (event: SceneEventDefinition) => onChange(updateGuidedInteraction(funnel, scene.id, event));
  const addUrl = (type: "audio" | "image") => {
    const url = prompt(`URL permanente do ${type === "audio" ? "áudio" : "avatar"}`);
    if (!url) return;
    const id = uid(type);
    onChange({ ...funnel, assets: [...funnel.assets, { id, mediaType: type, source: "permanent", url }] });
  };
  return (
    <section className="space-y-4">
      <div>
        <SectionTitle>Adicione interatividade</SectionTitle>
        <HelpText className="mt-1">Escolha algo que pode acontecer durante esta cena.</HelpText>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(Object.keys(labels) as Essential[]).map((block) => (
          <button key={block} onClick={() => create(block)} className="rounded-xl border border-studio-border bg-white/[.02] p-4 text-left transition-colors hover:border-studio-primary/40 hover:bg-white/[.04]">
            <span className="text-xl">{ICONS[block]}</span>
            <p className="mt-2 text-sm font-semibold text-studio-text">{labels[block]}</p>
            <p className="mt-1 text-xs leading-snug text-studio-text-muted">{HINTS[block]}</p>
          </button>
        ))}
      </div>
      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <Card key={event.id} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-studio-text">{summaryTitle(event)}</p>
                  <p className="mt-0.5 text-xs text-studio-text-muted">{triggerLabel(event.trigger)} · {summaryAfter(event, funnel)}</p>
                </div>
                <div className="relative flex shrink-0 items-center gap-1.5">
                  <GhostButton onClick={() => setEditing(editing === event.id ? null : event.id)} className="px-2.5 py-1.5 text-xs">Editar</GhostButton>
                  <GhostButton onClick={() => setEditing(event.id)} className="px-2.5 py-1.5 text-xs">Testar</GhostButton>
                  <button onClick={() => setMenuOpen(menuOpen === event.id ? null : event.id)} className="rounded-lg px-2 py-1.5 text-studio-text-muted hover:bg-white/[.06] hover:text-studio-text">•••</button>
                  {menuOpen === event.id && (
                    <div className="absolute right-0 top-9 z-10 w-36 rounded-lg border border-studio-border bg-studio-surface-2 py-1 shadow-xl">
                      <button onClick={() => { onChange(duplicateGuidedInteraction(funnel, scene.id, event.id)); setMenuOpen(null); }} className="block w-full px-3 py-1.5 text-left text-xs text-studio-text-secondary hover:bg-white/[.06]">Duplicar</button>
                      <button onClick={() => { const refs = guidedInteractionReferences(funnel, event.id); if (refs.length && !confirm(`Esta interação é usada em ${refs.length} lugares:\n${refs.join("\n")}\n\nExcluir mesmo assim?`)) return; onChange(deleteGuidedInteraction(funnel, scene.id, event.id)); setMenuOpen(null); }} className="block w-full px-3 py-1.5 text-left text-xs text-studio-error hover:bg-white/[.06]">Excluir</button>
                    </div>
                  )}
                </div>
              </div>
              {editing === event.id && <Editor event={event} funnel={funnel} scene={scene} urls={urls} update={update} onClose={() => setEditing(null)} onAddUrl={addUrl} onAttachAsset={onAttachAsset} onFunnelChange={onChange} onAttachPreviewFile={onAttachPreviewFile} pickingTime={pickingTime === event.id} setPickingTime={(open) => setPickingTime(open ? event.id : null)} />}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

const TRIGGER_OPTIONS = [
  ["SCENE_START", "No começo do vídeo"],
  ["TIME", "Em um momento específico"],
  ["BEFORE_END", "Pouco antes do final"],
  ["VIDEO_END", "Quando o vídeo terminar"],
  ["INTERACTION_COMPLETE", "Depois de outra interação"],
] as const;
function Editor({ event, funnel, scene, urls, update, onClose, onAddUrl, onAttachAsset, onFunnelChange, onAttachPreviewFile, pickingTime, setPickingTime }: { event: Extract<SceneEventDefinition, { block: Essential }>; funnel: FunnelDefinition; scene: SceneDefinition; urls: Record<string, string>; update: (event: SceneEventDefinition) => void; onClose: () => void; onAddUrl: (type: "audio" | "image") => void; onAttachAsset: () => void; onFunnelChange: (funnel: FunnelDefinition) => void; onAttachPreviewFile: ((file: File, assetId?: string) => void) | undefined; pickingTime: boolean; setPickingTime: (open: boolean) => void }) {
  const setTrigger = (trigger: TriggerDefinition) => update({ ...event, trigger });
  return (
    <div className="mt-3 space-y-4 rounded-xl border border-studio-border bg-white/[.02] p-4">
      <Field label="Quando isso acontece?">
        <StudioSelect
          clearable={false}
          value={event.trigger.kind}
          onChange={(kind) => {
            setTrigger(kind === "SCENE_START" ? triggerFromGuided("start") : kind === "TIME" ? triggerFromGuided("time", 0) : kind === "BEFORE_END" ? triggerFromGuided("before_end", 2) : kind === "VIDEO_END" ? triggerFromGuided("end") : triggerFromGuided("after", 0, scene.events.find((item) => item.id !== event.id)?.id || ""));
          }}
          options={TRIGGER_OPTIONS.map(([value, label]) => ({ value, label }))}
        />
      </Field>
      {event.trigger.kind === "TIME" && (
        <div className="space-y-2">
          <input aria-label="momento" type="number" step="0.01" value={event.trigger.seconds} onChange={(e) => setTrigger(triggerFromGuided("time", Number(e.target.value)))} className={field} />
          <SecondaryButton onClick={() => setPickingTime(!pickingTime)} className="text-xs">Escolher momento do vídeo</SecondaryButton>
          {pickingTime && <GuidedPreview funnel={funnel} scene={scene} urls={urls} onMoment={(seconds) => { setTrigger(triggerFromGuided("time", seconds)); setPickingTime(false); }} />}
        </div>
      )}
      {event.trigger.kind === "BEFORE_END" && <Field label="Quantos segundos antes?"><input type="number" step="0.01" value={event.trigger.seconds} onChange={(e) => setTrigger(triggerFromGuided("before_end", Number(e.target.value)))} className={field} /></Field>}
      {event.trigger.kind === "INTERACTION_COMPLETE" && (
        <Field label="Depois de qual interação?">
          <StudioSelect
            placeholder="Escolha uma interação"
            value={event.trigger.interactionId}
            onChange={(id) => setTrigger(triggerFromGuided("after", 0, id))}
            options={scene.events.filter((item) => item.id !== event.id).map((item) => ({ value: item.id, label: summaryTitle(item) }))}
          />
        </Field>
      )}
      {event.block === "quiz" && <QuizEditor event={event} update={update} />}
      {event.block === "notification" && <NotificationEditor event={event} funnel={funnel} update={update} onAddUrl={onAddUrl} onAttachAsset={onAttachAsset} />}
      {event.block === "audio" && <AudioEditor event={event} funnel={funnel} urls={urls} update={update} onAddUrl={onAddUrl} onAttachAsset={onAttachAsset} />}
      {onAttachPreviewFile && event.block === "notification" && (
        <>
          <InlineMediaPicker label="Avatar" mediaType="image" funnel={funnel} urls={urls} value={event.avatarAssetId} onSelect={(assetId) => update({ ...event, avatarAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          <InlineMediaPicker label="Som da notificação" mediaType="audio" funnel={funnel} urls={urls} value={event.soundAssetId} onSelect={(assetId) => update({ ...event, soundAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
        </>
      )}
      {onAttachPreviewFile && event.block === "audio" && <InlineMediaPicker label="Áudio" mediaType="audio" funnel={funnel} urls={urls} value={event.assetId} onSelect={(assetId) => update({ ...event, assetId: assetId || "" })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />}
      {event.block === "scene_transition" && (
        <Field label="Para qual cena?">
          <StudioSelect
            placeholder="Escolha uma cena"
            value={event.targetSceneId}
            onChange={(sceneId) => update({ ...event, targetSceneId: sceneId, actions: [{ type: "GO_TO_SCENE", sceneId }] })}
            options={funnel.scenes.filter((item) => item.id !== scene.id).map((item, index) => ({ value: item.id, label: `Cena ${index + 1} — ${item.title}` }))}
          />
          {!event.targetSceneId && <HelpText className="mt-1 text-xs">Escolha para qual cena continuar.</HelpText>}
        </Field>
      )}
      {event.block !== "notification" && event.block !== "scene_transition" && <Actions value={event.actions[0]} funnel={funnel} scene={scene} onChange={(action) => update({ ...event, actions: [action] } as SceneEventDefinition)} />}
      {event.block === "notification" && (
        <>
          <Actions label="Quando a pessoa tocar" value={event.onTap[0]} funnel={funnel} scene={scene} onChange={(action) => update({ ...event, onTap: [action] })} />
          <Actions label="E se ela fechar" value={event.onDismiss[0]} funnel={funnel} scene={scene} onChange={(action) => update({ ...event, onDismiss: [action] })} />
        </>
      )}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Testar agora</span>
        <GuidedPreview funnel={funnel} scene={scene} urls={urls} testEventId={event.id} />
      </div>
      <PrimaryButton onClick={onClose} className="w-full">Salvar</PrimaryButton>
    </div>
  );
}

function QuizEditor({ event, update }: { event: Extract<SceneEventDefinition, { block: "quiz" }>; update: (event: SceneEventDefinition) => void }) {
  const question = event.questions[0]!;
  const options = question.options;
  const setOptions = (next: typeof options) => update({ ...event, questions: [{ ...question, options: next }] });
  return (
    <div className="space-y-2.5">
      <Field label="Sua pergunta"><input value={question.title} onChange={(e) => update({ ...event, title: e.target.value || "Pergunta", questions: [{ ...question, title: e.target.value }] })} placeholder="Pergunta" className={field} /></Field>
      <div className="space-y-1.5">
        {options.map((option, index) => (
          <div className="flex items-center gap-1.5" key={option.id}>
            <input value={option.label} onChange={(e) => setOptions(options.map((item) => item.id === option.id ? { ...item, label: e.target.value } : item))} className={field} />
            <GhostButton onClick={() => setOptions([...options, { ...option, id: uid("option") }])} className="px-2 py-2 text-xs">Duplicar</GhostButton>
            <GhostButton disabled={options.length <= 2} onClick={() => setOptions(options.filter((item) => item.id !== option.id))} className="px-2 py-2 text-xs text-studio-error">Excluir</GhostButton>
            <GhostButton disabled={index === 0} onClick={() => setOptions(options.map((item, i, all) => i === index ? all[index - 1]! : i === index - 1 ? option : item))} className="px-2 py-2 text-xs">↑</GhostButton>
          </div>
        ))}
      </div>
      <SecondaryButton onClick={() => setOptions([...options, { id: uid("option"), label: "Nova opção" }])} className="text-xs">+ Adicionar opção</SecondaryButton>
      {options.length < 2 && <HelpText className="text-xs">Adicione pelo menos duas opções.</HelpText>}
      <details className="pt-1">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Configurações avançadas</summary>
        <div className="mt-2 space-y-2">
          <StudioSelect
            clearable={false}
            value={event.variant || "default"}
            onChange={(variant) => update({ ...event, variant: variant as any })}
            options={[
              { value: "default", label: "Padrão" },
              { value: "cinematic", label: "Cinemático" },
              { value: "immersive", label: "Imersivo" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-studio-text-secondary"><input type="checkbox" checked={event.showProgress || false} onChange={(e) => update({ ...event, showProgress: e.target.checked })} /> Mostrar progresso</label>
        </div>
      </details>
    </div>
  );
}
function NotificationEditor({ event, funnel, update, onAddUrl, onAttachAsset }: { event: Extract<SceneEventDefinition, { block: "notification" }>; funnel: FunnelDefinition; update: (event: SceneEventDefinition) => void; onAddUrl: (type: "audio" | "image") => void; onAttachAsset: () => void }) {
  const images = funnel.assets.filter((asset) => asset.mediaType === "image");
  const audio = funnel.assets.filter((asset) => asset.mediaType === "audio");
  return (
    <div className="space-y-2.5">
      <Field label="Aplicativo"><input value={event.appName} onChange={(e) => update({ ...event, appName: e.target.value })} placeholder="Aplicativo" className={field} /></Field>
      <Field label="Quem enviou?"><input value={event.senderName} onChange={(e) => update({ ...event, senderName: e.target.value })} placeholder="Quem enviou?" className={field} /></Field>
      <Field label="Mensagem">
        <textarea value={event.message} onChange={(e) => update({ ...event, message: e.target.value })} placeholder="Mensagem" className={field} />
        {!event.message && <HelpText className="mt-1 text-xs">Escreva a mensagem da notificação.</HelpText>}
      </Field>
      <AssetSelect label="Foto / avatar" value={event.avatarAssetId} assets={images} onChange={(id) => update({ ...event, avatarAssetId: id || undefined })} onAdd={() => onAddUrl("image")} onAttach={onAttachAsset} />
      <AssetSelect label="Som" value={event.soundAssetId} assets={audio} onChange={(id) => update({ ...event, soundAssetId: id || undefined })} onAdd={() => onAddUrl("audio")} onAttach={onAttachAsset} />
      <label className="flex items-center gap-2 text-sm text-studio-text-secondary"><input type="checkbox" checked={event.autoDismiss || false} onChange={(e) => update({ ...event, autoDismiss: e.target.checked })} /> Fechar automaticamente</label>
    </div>
  );
}
function AudioEditor({ event, funnel, urls, update, onAddUrl, onAttachAsset }: { event: Extract<SceneEventDefinition, { block: "audio" }>; funnel: FunnelDefinition; urls: Record<string, string>; update: (event: SceneEventDefinition) => void; onAddUrl: (type: "audio" | "image") => void; onAttachAsset: () => void }) {
  const audio = funnel.assets.filter((asset) => asset.mediaType === "audio");
  const src = funnel.assets.find((asset) => asset.id === event.assetId);
  const url = src?.source === "permanent" ? src.url : src?.source === "preview" ? urls[src.id] : undefined;
  return (
    <div className="space-y-2.5">
      <AssetSelect label="Áudio" value={event.assetId} assets={audio} onChange={(id) => update({ ...event, assetId: id })} onAdd={() => onAddUrl("audio")} onAttach={onAttachAsset} />
      {!event.assetId && <HelpText className="text-xs">Escolha um áudio.</HelpText>}
      <Field label="Volume"><input type="range" min="0" max="1" step="0.01" value={event.volume ?? 1} onChange={(e) => update({ ...event, volume: Number(e.target.value) })} className="w-full" /></Field>
      <label className="flex items-center gap-2 text-sm text-studio-text-secondary"><input type="checkbox" checked={event.loop || false} onChange={(e) => update({ ...event, loop: e.target.checked })} /> Repetir</label>
      <SecondaryButton className="text-xs" onClick={() => { if (!url) return alert("Escolha um áudio válido."); const player = new Audio(url); player.onerror = () => alert("Não foi possível reproduzir este áudio."); void player.play().catch(() => alert("Não foi possível reproduzir este áudio.")); }}>▶ Testar áudio</SecondaryButton>
    </div>
  );
}
function AssetSelect({ label, value, assets, onChange, onAdd, onAttach }: { label: string; value?: string | undefined; assets: FunnelDefinition["assets"]; onChange: (id: string) => void; onAdd: () => void; onAttach: () => void }) {
  return (
    <Field label={label}>
      <StudioSelect
        placeholder="Selecionar arquivo do projeto"
        value={value}
        onChange={onChange}
        options={assets.map((asset) => ({ value: asset.id, label: `${assetName(asset)}${asset.source === "preview" ? " (local)" : ""}` }))}
      />
      <div className="mt-1.5 flex gap-1.5">
        <GhostButton onClick={onAdd} className="px-2 py-1 text-xs">+ URL permanente</GhostButton>
        <GhostButton onClick={onAttach} className="px-2 py-1 text-xs">+ Arquivo local</GhostButton>
      </div>
    </Field>
  );
}
function Actions({ label = "Depois disso", value, funnel, scene, onChange }: { label?: string; value?: ActionDefinition | undefined; funnel: FunnelDefinition; scene: SceneDefinition; onChange: (action: ActionDefinition) => void }) {
  const kind = value?.type || "RESUME_VIDEO";
  return (
    <Field label={label}>
      <StudioSelect
        clearable={false}
        value={kind}
        onChange={(type) => {
          onChange(type === "RESUME_VIDEO" ? { type } : type === "NEXT_SCENE" ? { type } : type === "STOP" ? { type } : type === "GO_TO_SCENE" ? { type, sceneId: funnel.scenes.find((item) => item.id !== scene.id)?.id || "" } : { type: "OPEN_EVENT", eventId: scene.events.find((item) => item.id)?.id || "" });
        }}
        options={[
          { value: "RESUME_VIDEO", label: "Continuar o vídeo" },
          { value: "NEXT_SCENE", label: "Ir para a próxima cena" },
          { value: "GO_TO_SCENE", label: "Ir para outra cena" },
          { value: "OPEN_EVENT", label: "Abrir outra interação" },
          { value: "STOP", label: "Encerrar" },
        ]}
      />
      {kind === "GO_TO_SCENE" && (
        <StudioSelect
          className="mt-1.5"
          placeholder="Escolha uma cena"
          value={value?.type === "GO_TO_SCENE" ? value.sceneId : ""}
          onChange={(sceneId) => onChange({ type: "GO_TO_SCENE", sceneId })}
          options={funnel.scenes.filter((item) => item.id !== scene.id).map((item) => ({ value: item.id, label: item.title }))}
        />
      )}
      {kind === "OPEN_EVENT" && (
        <StudioSelect
          className="mt-1.5"
          placeholder="Escolha uma interação"
          value={value?.type === "OPEN_EVENT" ? value.eventId : ""}
          onChange={(eventId) => onChange({ type: "OPEN_EVENT", eventId })}
          options={scene.events.map((item) => ({ value: item.id, label: summaryTitle(item) }))}
        />
      )}
    </Field>
  );
}
function summaryTitle(event: SceneEventDefinition) { return event.block === "quiz" ? `❓ ${event.questions[0]?.title || event.title}` : event.block === "notification" ? `🔔 ${event.senderName}` : event.block === "audio" ? "🔊 Áudio" : event.block === "scene_transition" ? "➡️ Ir para outra cena" : event.block; }
function summaryAfter(event: SceneEventDefinition, funnel: FunnelDefinition) { if (event.block === "notification") return `Ao tocar: ${actionLabel(event.onTap[0])}`; if (event.block === "scene_transition") return `Vai para: ${funnel.scenes.find((scene) => scene.id === event.targetSceneId)?.title || "escolha uma cena"}`; return `Depois: ${actionLabel(event.actions[0])}`; }
