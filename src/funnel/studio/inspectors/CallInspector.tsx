import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { AssetSelect, Field, ActionInspector } from "./shared";
export function CallInspector({
  funnel,
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "incoming_call" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "incoming_call" }>) => void;
  onTest: () => void;
}) {
  const field = (
    label: string,
    key:
      | "avatarAssetId"
      | "ringtoneAssetId"
      | "vibrationAssetId"
      | "connectSfxAssetId"
      | "voiceAssetId"
      | "endSfxAssetId",
    type: "image" | "audio",
  ) => (
    <Field label={label}>
      <AssetSelect
        funnel={funnel}
        mediaType={type}
        value={event[key]}
        onChange={(value) => onChange({ ...event, [key]: value })}
      />
    </Field>
  );
  return (
    <section className="grid gap-2">
      <b>LIGAÇÃO</b>
      <Field label="Nome">
        <input
          value={event.callerName}
          onChange={(e) => onChange({ ...event, callerName: e.target.value })}
        />
      </Field>
      <Field label="Subtítulo">
        <input
          value={event.callerSubtitle || ""}
          onChange={(e) => onChange({ ...event, callerSubtitle: e.target.value || undefined })}
        />
      </Field>
      {field("Avatar", "avatarAssetId", "image")}
      {field("Ringtone", "ringtoneAssetId", "audio")}
      {field("Vibração", "vibrationAssetId", "audio")}
      {field("Connect SFX", "connectSfxAssetId", "audio")}
      {field("Voz", "voiceAssetId", "audio")}
      {field("End SFX", "endSfxAssetId", "audio")}
      <Field label="Falha de voz">
        <select
          value={event.voiceFailure || "skip"}
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
        actions={event.onAccept}
        label="AO ACEITAR"
        onChange={(onAccept) => onChange({ ...event, onAccept })}
      />
      <ActionInspector
        funnel={funnel}
        event={event}
        actions={event.onDecline}
        label="AO RECUSAR"
        onChange={(onDecline) => onChange({ ...event, onDecline })}
      />
      <ActionInspector
        funnel={funnel}
        event={event}
        actions={event.onEnd}
        label="AO FINALIZAR"
        onChange={(onEnd) => onChange({ ...event, onEnd })}
      />
      <button onClick={onTest}>TESTAR LIGAÇÃO</button>
    </section>
  );
}
