import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { AssetSelect, Field, ActionInspector } from "./shared";
import { uid } from "../studioState";
export function MessagingInspector({
  funnel,
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "messaging" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "messaging" }>) => void;
  onTest: () => void;
}) {
  const update = (index: number, patch: object) =>
    onChange({
      ...event,
      messages: event.messages.map((message, i) =>
        i === index ? { ...message, ...patch } : message,
      ),
    });
  return (
    <section className="grid gap-2">
      <b>WHATSAPP / MENSAGENS</b>
      <Field label="Contato">
        <input
          value={event.contactName}
          onChange={(e) => onChange({ ...event, contactName: e.target.value })}
        />
      </Field>
      <Field label="Subtítulo">
        <input
          value={event.contactSubtitle || ""}
          onChange={(e) => onChange({ ...event, contactSubtitle: e.target.value || undefined })}
        />
      </Field>
      <Field label="Avatar">
        <AssetSelect
          funnel={funnel}
          mediaType="image"
          value={event.avatarAssetId}
          onChange={(avatarAssetId) => onChange({ ...event, avatarAssetId })}
        />
      </Field>
      {event.messages.map((message, index) => (
        <div className="border border-zinc-700 p-1 grid gap-1" key={message.id}>
          <select value={message.type} onChange={(e) => update(index, { type: e.target.value })}>
            <option value="text">TEXT</option>
            <option value="voice">VOICE</option>
            <option value="voice_once">VOICE_ONCE</option>
            <option value="system">SYSTEM</option>
          </select>
          <input
            value={message.text || ""}
            placeholder="texto"
            onChange={(e) => update(index, { text: e.target.value })}
          />
          {message.type !== "text" && (
            <AssetSelect
              funnel={funnel}
              mediaType="audio"
              value={message.audioAssetId}
              onChange={(audioAssetId) => update(index, { audioAssetId })}
            />
          )}
          <div>
            <button
              onClick={() =>
                onChange({ ...event, messages: event.messages.filter((_, i) => i !== index) })
              }
            >
              excluir
            </button>
            <button
              disabled={index === 0}
              onClick={() => {
                const next = [...event.messages];
                [next[index - 1]!, next[index]!] = [next[index]!, next[index - 1]!];
                onChange({ ...event, messages: next });
              }}
            >
              ↑
            </button>
            <button
              disabled={index === event.messages.length - 1}
              onClick={() => {
                const next = [...event.messages];
                [next[index + 1]!, next[index]!] = [next[index]!, next[index + 1]!];
                onChange({ ...event, messages: next });
              }}
            >
              ↓
            </button>
            <button
              onClick={() =>
                onChange({
                  ...event,
                  messages: [
                    ...event.messages.slice(0, index + 1),
                    { ...message, id: uid("message") },
                    ...event.messages.slice(index + 1),
                  ],
                })
              }
            >
              duplicar
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({
            ...event,
            messages: [
              ...event.messages,
              { id: uid("message"), type: "text", text: "Nova mensagem" },
            ],
          })
        }
      >
        + MENSAGEM
      </button>
      <Field label="Falha de áudio">
        <select
          value={event.voiceFailure}
          onChange={(e) =>
            onChange({ ...event, voiceFailure: e.target.value as "retry" | "skip" | "stop" })
          }
        >
          <option>retry</option>
          <option>skip</option>
          <option>stop</option>
        </select>
      </Field>
      <ActionInspector
        funnel={funnel}
        event={event}
        actions={event.onClose}
        label="AO FECHAR"
        onChange={(onClose) => onChange({ ...event, onClose })}
      />
      <button onClick={onTest}>TESTAR CONVERSA</button>
    </section>
  );
}
