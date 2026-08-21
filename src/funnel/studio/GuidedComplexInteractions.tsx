import { useEffect, useState } from "react";
import type { ActionDefinition, FunnelDefinition, SceneDefinition, SceneEventDefinition, TriggerDefinition } from "../schema/v1";
import { createGuidedInteraction, deleteGuidedInteraction, duplicateGuidedInteraction, guidedInteractionReferences, triggerFromGuided, updateGuidedInteraction } from "./guidedState";
import { GuidedPreview, formatTime } from "./GuidedPreview";
import { uid } from "./studioState";
import { InlineMediaPicker } from "./InlineMediaPicker";
import { field, Field } from "./GuidedEssentialInteractions";
import { Card, SecondaryButton, GhostButton, HelpText, StudioSelect } from "./ui";

type ComplexBlock = "incoming_call" | "messaging" | "choice";
const blockName: Record<ComplexBlock, string> = { incoming_call: "Receber uma ligação", messaging: "Abrir uma conversa", choice: "Dar uma escolha" };
const ICONS: Record<ComplexBlock, string> = { incoming_call: "📞", messaging: "💬", choice: "👆" };
const HINTS: Record<ComplexBlock, string> = {
  incoming_call: "Faça o celular da pessoa tocar durante a cena.",
  messaging: "Abra uma troca de mensagens de texto ou áudio.",
  choice: "Peça para a pessoa escolher entre opções.",
};

export function GuidedComplexInteractions({ funnel, scene, urls, onChange, onAttachAsset, onAttachPreviewFile, focusEventId, onFocusHandled }: { funnel: FunnelDefinition; scene: SceneDefinition; urls: Record<string, string>; onChange: (funnel: FunnelDefinition) => void; onAttachAsset: () => void; onAttachPreviewFile: ((file: File, assetId?: string) => void) | undefined; focusEventId?: string | undefined; onFocusHandled?: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const events = scene.events.filter((event): event is Extract<SceneEventDefinition, { block: ComplexBlock }> => event.block === "incoming_call" || event.block === "messaging" || event.block === "choice");
  // Opens the exact interaction a review issue pointed at, instead of leaving the user to find it themselves.
  useEffect(() => {
    if (!focusEventId || !events.some((event) => event.id === focusEventId)) return;
    setEditing(focusEventId);
    onFocusHandled?.();
  }, [focusEventId, events, onFocusHandled]);
  const update = (event: SceneEventDefinition) => onChange(updateGuidedInteraction(funnel, scene.id, event));
  const addUrl = (mediaType: "audio" | "image") => { const url = prompt(`URL permanente do ${mediaType === "audio" ? "áudio" : "avatar"}`); if (url) onChange({ ...funnel, assets: [...funnel.assets, { id: uid(mediaType), mediaType, source: "permanent", url }] }); };
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {(Object.keys(blockName) as ComplexBlock[]).map((block) => (
          <button
            key={block}
            onClick={() => { const next = createGuidedInteraction(funnel, scene.id, block); onChange(next); setEditing(next.scenes.find((item) => item.id === scene.id)?.events.at(-1)?.id || null); }}
            className="rounded-xl border border-studio-border bg-white/[.02] p-4 text-left transition-colors hover:border-studio-primary/40 hover:bg-white/[.04]"
          >
            <span className="text-xl">{ICONS[block]}</span>
            <p className="mt-2 text-sm font-semibold text-studio-text">{blockName[block]}</p>
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
                  <p className="truncate text-sm font-semibold text-studio-text">{humanTitle(event)}</p>
                  <p className="mt-0.5 text-xs text-studio-text-muted">{humanTrigger(event.trigger)} · {humanAfter(event, funnel)}</p>
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
              {editing === event.id && <ComplexEditor event={event} funnel={funnel} scene={scene} urls={urls} onUpdate={update} onFunnelChange={onChange} onAttachPreviewFile={onAttachPreviewFile} onAddUrl={addUrl} onAttachAsset={onAttachAsset} picking={picking === event.id} setPicking={(value) => setPicking(value ? event.id : null)} />}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function ComplexEditor({ event, funnel, scene, urls, onUpdate, onFunnelChange, onAttachPreviewFile, onAddUrl, onAttachAsset, picking, setPicking }: { event: Extract<SceneEventDefinition, { block: ComplexBlock }>; funnel: FunnelDefinition; scene: SceneDefinition; urls: Record<string, string>; onUpdate: (event: SceneEventDefinition) => void; onFunnelChange: (funnel: FunnelDefinition) => void; onAttachPreviewFile: ((file: File, assetId?: string) => void) | undefined; onAddUrl: (mediaType: "audio" | "image") => void; onAttachAsset: () => void; picking: boolean; setPicking: (value: boolean) => void }) {
  const setTrigger = (trigger: TriggerDefinition) => onUpdate({ ...event, trigger });
  return (
    <div className="mt-3 space-y-4 rounded-xl border border-studio-border bg-white/[.02] p-4">
      <Field label="Quando isso acontece?">
        <TriggerEditor trigger={event.trigger} scene={scene} funnel={funnel} urls={urls} onChange={setTrigger} picking={picking} setPicking={setPicking} />
      </Field>
      {event.block === "incoming_call" && <CallFields event={event} funnel={funnel} scene={scene} onUpdate={onUpdate} onAddUrl={onAddUrl} onAttachAsset={onAttachAsset} />}
      {event.block === "messaging" && <MessagingFields event={event} funnel={funnel} scene={scene} urls={urls} onUpdate={onUpdate} onAddUrl={onAddUrl} onAttachAsset={onAttachAsset} />}
      {event.block === "choice" && <ChoiceFields event={event} onUpdate={onUpdate} />}
      {onAttachPreviewFile && event.block === "incoming_call" && (
        <>
          <InlineMediaPicker label="Avatar" mediaType="image" funnel={funnel} urls={urls} value={event.avatarAssetId} onSelect={(assetId) => onUpdate({ ...event, avatarAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          <InlineMediaPicker label="Áudio da voz" mediaType="audio" funnel={funnel} urls={urls} value={event.voiceAssetId} onSelect={(assetId) => onUpdate({ ...event, voiceAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          <InlineMediaPicker label="Ringtone" mediaType="audio" funnel={funnel} urls={urls} value={event.ringtoneAssetId} onSelect={(assetId) => onUpdate({ ...event, ringtoneAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          <div className="space-y-2">
            <InlineMediaPicker label="Vibration SFX" mediaType="audio" funnel={funnel} urls={urls} value={event.vibrationAssetId} onSelect={(assetId) => onUpdate({ ...event, vibrationAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
            <InlineMediaPicker label="Connect SFX" mediaType="audio" funnel={funnel} urls={urls} value={event.connectSfxAssetId} onSelect={(assetId) => onUpdate({ ...event, connectSfxAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
            <InlineMediaPicker label="End SFX" mediaType="audio" funnel={funnel} urls={urls} value={event.endSfxAssetId} onSelect={(assetId) => onUpdate({ ...event, endSfxAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          </div>
        </>
      )}
      {onAttachPreviewFile && event.block === "messaging" && (
        <>
          <InlineMediaPicker label="Avatar do contato" mediaType="image" funnel={funnel} urls={urls} value={event.avatarAssetId} onSelect={(assetId) => onUpdate({ ...event, avatarAssetId: assetId })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          {event.messages.filter((message) => message.type === "voice" || message.type === "voice_once").map((message) => (
            <InlineMediaPicker key={message.id} label={message.type === "voice_once" ? "Áudio uma vez" : "Áudio da mensagem"} mediaType="audio" funnel={funnel} urls={urls} value={message.audioAssetId} onSelect={(assetId) => onUpdate({ ...event, messages: event.messages.map((item) => item.id === message.id ? { ...item, audioAssetId: assetId } : item) })} onChange={onFunnelChange} onAttachPreview={onAttachPreviewFile} />
          ))}
        </>
      )}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Testar</span>
        <GuidedPreview funnel={funnel} scene={scene} urls={urls} testEventId={event.id} />
      </div>
    </div>
  );
}

const TRIGGER_OPTIONS = [
  ["SCENE_START", "No começo do vídeo"],
  ["TIME", "Em um momento específico"],
  ["BEFORE_END", "Pouco antes do final"],
  ["VIDEO_END", "Quando o vídeo terminar"],
  ["INTERACTION_COMPLETE", "Depois de outra interação"],
] as const;
function TriggerEditor({ trigger, scene, funnel, urls, onChange, picking, setPicking }: { trigger: TriggerDefinition; scene: SceneDefinition; funnel: FunnelDefinition; urls: Record<string, string>; onChange: (trigger: TriggerDefinition) => void; picking: boolean; setPicking: (value: boolean) => void }) {
  return (
    <div className="space-y-2">
      <StudioSelect
        clearable={false}
        value={trigger.kind}
        onChange={(kind) => onChange(kind === "SCENE_START" ? triggerFromGuided("start") : kind === "TIME" ? triggerFromGuided("time", 0) : kind === "BEFORE_END" ? triggerFromGuided("before_end", 2) : kind === "VIDEO_END" ? triggerFromGuided("end") : triggerFromGuided("after", 0, scene.events[0]?.id || ""))}
        options={TRIGGER_OPTIONS.map(([value, label]) => ({ value, label }))}
      />
      {trigger.kind === "TIME" && (
        <div className="space-y-2">
          <input type="number" step="0.01" value={trigger.seconds} onChange={(e) => onChange(triggerFromGuided("time", Number(e.target.value)))} className={field} />
          <SecondaryButton onClick={() => setPicking(!picking)} className="text-xs">Usar este momento do vídeo</SecondaryButton>
          {picking && <GuidedPreview funnel={funnel} scene={scene} urls={urls} onMoment={(time) => { onChange(triggerFromGuided("time", time)); setPicking(false); }} />}
        </div>
      )}
      {trigger.kind === "BEFORE_END" && <Field label="Quantos segundos antes?"><input type="number" step="0.01" value={trigger.seconds} onChange={(e) => onChange(triggerFromGuided("before_end", Number(e.target.value)))} className={field} /></Field>}
      {trigger.kind === "INTERACTION_COMPLETE" && (
        <StudioSelect
          placeholder="Escolha uma interação"
          value={trigger.interactionId}
          onChange={(id) => onChange(triggerFromGuided("after", 0, id))}
          options={scene.events.map((item) => ({ value: item.id, label: humanTitle(item) }))}
        />
      )}
    </div>
  );
}

function CallFields({ event, funnel, scene, onUpdate, onAddUrl, onAttachAsset }: { event: Extract<SceneEventDefinition, { block: "incoming_call" }>; funnel: FunnelDefinition; scene: SceneDefinition; onUpdate: (event: SceneEventDefinition) => void; onAddUrl: (mediaType: "audio" | "image") => void; onAttachAsset: () => void }) {
  const images = funnel.assets.filter((asset) => asset.mediaType === "image"), audio = funnel.assets.filter((asset) => asset.mediaType === "audio");
  return (
    <div className="space-y-2.5">
      <Field label="Quem está ligando?">
        <input value={event.callerName} onChange={(e) => onUpdate({ ...event, callerName: e.target.value })} placeholder="Quem está ligando?" className={field} />
        {!event.callerName && <HelpText className="mt-1 text-xs">Digite quem está ligando.</HelpText>}
      </Field>
      <Field label="Subtítulo opcional"><input value={event.callerSubtitle || ""} onChange={(e) => onUpdate({ ...event, callerSubtitle: e.target.value || undefined })} placeholder="Subtítulo opcional" className={field} /></Field>
      <Picker label="Foto / avatar" value={event.avatarAssetId} assets={images} onChange={(id) => onUpdate({ ...event, avatarAssetId: id || undefined })} addUrl={() => onAddUrl("image")} attach={onAttachAsset} />
      <Picker label="Áudio da voz" value={event.voiceAssetId} assets={audio} onChange={(id) => onUpdate({ ...event, voiceAssetId: id || undefined })} addUrl={() => onAddUrl("audio")} attach={onAttachAsset} />
      <Picker label="Som de chamada" value={event.ringtoneAssetId} assets={audio} onChange={(id) => onUpdate({ ...event, ringtoneAssetId: id || undefined })} addUrl={() => onAddUrl("audio")} attach={onAttachAsset} />
      <details>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Configurações avançadas</summary>
        <div className="mt-2 space-y-2.5">
          <Picker label="Vibração" value={event.vibrationAssetId} assets={audio} onChange={(id) => onUpdate({ ...event, vibrationAssetId: id || undefined })} addUrl={() => onAddUrl("audio")} attach={onAttachAsset} />
          <Picker label="Som de conexão" value={event.connectSfxAssetId} assets={audio} onChange={(id) => onUpdate({ ...event, connectSfxAssetId: id || undefined })} addUrl={() => onAddUrl("audio")} attach={onAttachAsset} />
          <Picker label="Som de encerramento" value={event.endSfxAssetId} assets={audio} onChange={(id) => onUpdate({ ...event, endSfxAssetId: id || undefined })} addUrl={() => onAddUrl("audio")} attach={onAttachAsset} />
          <StudioSelect
            clearable={false}
            value={event.voiceFailure || "skip"}
            onChange={(voiceFailure) => onUpdate({ ...event, voiceFailure: voiceFailure as any })}
            options={[
              { value: "retry", label: "Tentar novamente" },
              { value: "skip", label: "Pular este áudio" },
              { value: "stop", label: "Encerrar" },
            ]}
          />
        </div>
      </details>
      <ActionPicker label="Quando a ligação terminar" value={event.onEnd[0]} funnel={funnel} scene={scene} onChange={(action) => onUpdate({ ...event, onEnd: [action] })} />
      <ActionPicker label="E se a pessoa recusar" value={event.onDecline[0]} funnel={funnel} scene={scene} onChange={(action) => onUpdate({ ...event, onDecline: [action] })} />
    </div>
  );
}

function MessagingFields({ event, funnel, scene, urls, onUpdate, onAddUrl, onAttachAsset }: { event: Extract<SceneEventDefinition, { block: "messaging" }>; funnel: FunnelDefinition; scene: SceneDefinition; urls: Record<string, string>; onUpdate: (event: SceneEventDefinition) => void; onAddUrl: (mediaType: "audio" | "image") => void; onAttachAsset: () => void }) {
  const audio = funnel.assets.filter((asset) => asset.mediaType === "audio"), images = funnel.assets.filter((asset) => asset.mediaType === "image");
  const add = (type: "text" | "voice" | "voice_once" | "system") => onUpdate({ ...event, messages: [...event.messages, { id: uid("message"), type, ...(type === "text" || type === "system" ? { text: "Nova mensagem" } : {}) }] });
  const move = (index: number, delta: number) => { const copy = [...event.messages]; const target = index + delta; if (target < 0 || target >= copy.length) return; [copy[index], copy[target]] = [copy[target]!, copy[index]!]; onUpdate({ ...event, messages: copy }); };
  return (
    <div className="space-y-2.5">
      <Field label="Nome do contato"><input value={event.contactName} onChange={(e) => onUpdate({ ...event, contactName: e.target.value })} placeholder="Nome do contato" className={field} /></Field>
      <Field label="Subtítulo opcional"><input value={event.contactSubtitle || ""} onChange={(e) => onUpdate({ ...event, contactSubtitle: e.target.value || undefined })} placeholder="Subtítulo opcional" className={field} /></Field>
      <Picker label="Avatar" value={event.avatarAssetId} assets={images} onChange={(id) => onUpdate({ ...event, avatarAssetId: id || undefined })} addUrl={() => onAddUrl("image")} attach={onAttachAsset} />
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Mensagens</span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <GhostButton onClick={() => add("text")} className="px-2 py-1 text-xs">+ Texto</GhostButton>
          <GhostButton onClick={() => add("voice")} className="px-2 py-1 text-xs">+ Áudio</GhostButton>
          <GhostButton onClick={() => add("voice_once")} className="px-2 py-1 text-xs">+ Áudio uma vez</GhostButton>
          <GhostButton onClick={() => add("system")} className="px-2 py-1 text-xs">+ Sistema</GhostButton>
        </div>
        <div className="space-y-2">
          {event.messages.map((message, index) => (
            <div className="rounded-lg border border-studio-border bg-white/[.02] p-2.5" key={message.id}>
              <span className="text-xs font-semibold uppercase tracking-wider text-studio-text-muted">{message.type === "voice_once" ? "Áudio uma vez" : message.type}</span>
              {(message.type === "text" || message.type === "system") && <textarea value={message.text || ""} onChange={(e) => onUpdate({ ...event, messages: event.messages.map((item) => item.id === message.id ? { ...item, text: e.target.value } : item) })} className={`${field} mt-1.5`} />}
              {(message.type === "voice" || message.type === "voice_once") && (
                <div className="mt-1.5">
                  <Picker label="Arquivo de áudio" value={message.audioAssetId} assets={audio} onChange={(id) => onUpdate({ ...event, messages: event.messages.map((item) => item.id === message.id ? { ...item, audioAssetId: id || undefined } : item) })} addUrl={() => onAddUrl("audio")} attach={onAttachAsset} />
                  {message.type === "voice_once" && <HelpText className="mt-1 text-xs">Este áudio só pode ser reproduzido uma vez durante a experiência.</HelpText>}
                </div>
              )}
              <div className="mt-1.5 flex gap-1.5">
                <GhostButton onClick={() => onUpdate({ ...event, messages: [...event.messages, { ...message, id: uid("message") }] })} className="px-2 py-1 text-xs">Duplicar</GhostButton>
                <GhostButton onClick={() => onUpdate({ ...event, messages: event.messages.filter((item) => item.id !== message.id) })} className="px-2 py-1 text-xs text-studio-error">Excluir</GhostButton>
                <GhostButton onClick={() => move(index, -1)} className="px-2 py-1 text-xs">↑</GhostButton>
                <GhostButton onClick={() => move(index, 1)} className="px-2 py-1 text-xs">↓</GhostButton>
              </div>
            </div>
          ))}
        </div>
        {!event.messages.length && <HelpText className="mt-1.5 text-xs">Adicione pelo menos uma mensagem.</HelpText>}
      </div>
      <ActionPicker label="Quando a conversa terminar" value={event.actions[0]} funnel={funnel} scene={scene} onChange={(action) => onUpdate({ ...event, actions: [action] })} />
      <ActionPicker label="E se a pessoa fechar" value={event.onClose[0]} funnel={funnel} scene={scene} onChange={(action) => onUpdate({ ...event, onClose: [action] })} />
      <Field label="Se o áudio falhar">
        <StudioSelect
          clearable={false}
          value={event.voiceFailure}
          onChange={(voiceFailure) => onUpdate({ ...event, voiceFailure: voiceFailure as any })}
          options={[
            { value: "retry", label: "Tentar novamente" },
            { value: "skip", label: "Pular este áudio" },
            { value: "stop", label: "Encerrar" },
          ]}
        />
      </Field>
    </div>
  );
}

function ChoiceFields({ event, onUpdate }: { event: Extract<SceneEventDefinition, { block: "choice" }>; onUpdate: (event: SceneEventDefinition) => void }) {
  const move = (index: number, delta: number) => { const options = [...event.options], target = index + delta; if (target < 0 || target >= options.length) return; [options[index], options[target]] = [options[target]!, options[index]!]; onUpdate({ ...event, options }); };
  return (
    <div className="space-y-2.5">
      <Field label="Título"><input value={event.title} onChange={(e) => onUpdate({ ...event, title: e.target.value })} placeholder="Título" className={field} /></Field>
      <Field label="Subtítulo opcional"><input value={event.subtitle || ""} onChange={(e) => onUpdate({ ...event, subtitle: e.target.value || undefined })} placeholder="Subtítulo opcional" className={field} /></Field>
      <div className="space-y-1.5">
        {event.options.map((option, index) => (
          <div className="flex items-center gap-1.5" key={option.id}>
            <input value={option.label} onChange={(e) => onUpdate({ ...event, options: event.options.map((item) => item.id === option.id ? { ...item, label: e.target.value } : item) })} className={field} />
            <GhostButton onClick={() => onUpdate({ ...event, options: [...event.options, { ...option, id: uid("option") }] })} className="px-2 py-2 text-xs">Duplicar</GhostButton>
            <GhostButton disabled={event.options.length <= 2} onClick={() => onUpdate({ ...event, options: event.options.filter((item) => item.id !== option.id) })} className="px-2 py-2 text-xs text-studio-error">Excluir</GhostButton>
            <GhostButton onClick={() => move(index, -1)} className="px-2 py-2 text-xs">↑</GhostButton>
            <GhostButton onClick={() => move(index, 1)} className="px-2 py-2 text-xs">↓</GhostButton>
          </div>
        ))}
      </div>
      <SecondaryButton onClick={() => onUpdate({ ...event, options: [...event.options, { id: uid("option"), label: "Nova opção" }] })} className="text-xs">+ Opção</SecondaryButton>
      {event.options.length < 2 && <HelpText className="text-xs">Adicione pelo menos duas opções.</HelpText>}
      <details>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Configurações avançadas</summary>
        <div className="mt-2 space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-studio-text-secondary"><input type="checkbox" checked={event.mode === "confirm"} onChange={(e) => onUpdate({ ...event, mode: e.target.checked ? "confirm" : "instant" })} /> Confirmar antes de continuar</label>
          <label className="flex items-center gap-2 text-sm text-studio-text-secondary"><input type="checkbox" checked={event.required || false} onChange={(e) => onUpdate({ ...event, required: e.target.checked })} /> Exigir uma resposta</label>
          <label className="flex items-center gap-2 text-sm text-studio-text-secondary"><input type="checkbox" checked={event.allowChange || false} onChange={(e) => onUpdate({ ...event, allowChange: e.target.checked })} /> Permitir trocar a resposta</label>
        </div>
      </details>
    </div>
  );
}

function Picker({ label, value, assets, onChange, addUrl, attach }: { label: string; value?: string | undefined; assets: FunnelDefinition["assets"]; onChange: (value: string) => void; addUrl: () => void; attach: () => void }) {
  return (
    <Field label={label}>
      <StudioSelect
        placeholder="Selecionar arquivo do projeto"
        value={value}
        onChange={onChange}
        options={assets.map((asset) => ({ value: asset.id, label: asset.id }))}
      />
      <div className="mt-1.5 flex gap-1.5">
        <GhostButton onClick={addUrl} className="px-2 py-1 text-xs">+ URL permanente</GhostButton>
        <GhostButton onClick={attach} className="px-2 py-1 text-xs">+ Arquivo local</GhostButton>
      </div>
    </Field>
  );
}
function ActionPicker({ label, value, funnel, scene, onChange }: { label: string; value?: ActionDefinition | undefined; funnel: FunnelDefinition; scene: SceneDefinition; onChange: (action: ActionDefinition) => void }) {
  const type = value?.type || "RESUME_VIDEO";
  return (
    <Field label={label}>
      <StudioSelect
        clearable={false}
        value={type}
        onChange={(next) => {
          onChange(next === "RESUME_VIDEO" ? { type: "RESUME_VIDEO" } : next === "NEXT_SCENE" ? { type: "NEXT_SCENE" } : next === "STOP" ? { type: "STOP" } : next === "GO_TO_SCENE" ? { type: "GO_TO_SCENE", sceneId: funnel.scenes.find((item) => item.id !== scene.id)?.id || "" } : { type: "OPEN_EVENT", eventId: scene.events[0]?.id || "" });
        }}
        options={[
          { value: "RESUME_VIDEO", label: "Continuar o vídeo" },
          { value: "NEXT_SCENE", label: "Próxima cena" },
          { value: "GO_TO_SCENE", label: "Outra cena" },
          { value: "OPEN_EVENT", label: "Abrir outra interação" },
          { value: "STOP", label: "Encerrar" },
        ]}
      />
      {type === "GO_TO_SCENE" && (
        <StudioSelect
          className="mt-1.5"
          placeholder="Escolha uma cena"
          value={value?.type === "GO_TO_SCENE" ? value.sceneId : undefined}
          onChange={(sceneId) => onChange({ type: "GO_TO_SCENE", sceneId })}
          options={funnel.scenes.filter((item) => item.id !== scene.id).map((item) => ({ value: item.id, label: item.title }))}
        />
      )}
    </Field>
  );
}
function humanTitle(event: SceneEventDefinition) { return event.block === "incoming_call" ? `📞 ${event.callerName}` : event.block === "messaging" ? `💬 ${event.contactName}` : event.block === "choice" ? `👆 ${event.title}` : event.block; }
function humanTrigger(trigger: TriggerDefinition) { return trigger.kind === "TIME" ? `Em ${formatTime(trigger.seconds)}` : trigger.kind === "VIDEO_END" ? "Quando o vídeo terminar" : trigger.kind === "BEFORE_END" ? `${trigger.seconds.toFixed(2)}s antes do final` : trigger.kind === "SCENE_START" ? "No começo" : "Depois de outra interação"; }
function humanAfter(event: Extract<SceneEventDefinition, { block: ComplexBlock }>, funnel: FunnelDefinition) { if (event.block === "incoming_call") return `Ao terminar: ${event.onEnd[0]?.type || "continuar"}. Se recusar: ${event.onDecline[0]?.type || "continuar"}`; if (event.block === "messaging") return `${event.messages.length} mensagens. Depois: ${event.actions[0]?.type || "continuar"}`; return `${event.options.length} opções`; }
