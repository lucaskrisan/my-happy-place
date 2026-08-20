import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { AssetSelect, Field, ActionInspector } from "./shared";
export function NotificationInspector({
  funnel,
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "notification" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "notification" }>) => void;
  onTest: () => void;
}) {
  return (
    <section className="grid gap-2">
      <b>NOTIFICAÇÃO</b>
      <Field label="App">
        <input
          value={event.appName}
          onChange={(e) => onChange({ ...event, appName: e.target.value })}
        />
      </Field>
      <Field label="Remetente">
        <input
          value={event.senderName}
          onChange={(e) => onChange({ ...event, senderName: e.target.value })}
        />
      </Field>
      <Field label="Mensagem">
        <textarea
          value={event.message}
          onChange={(e) => onChange({ ...event, message: e.target.value })}
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
      <Field label="Som">
        <AssetSelect
          funnel={funnel}
          mediaType="audio"
          value={event.soundAssetId}
          onChange={(soundAssetId) => onChange({ ...event, soundAssetId })}
        />
      </Field>
      <label>
        <input
          type="checkbox"
          checked={event.autoDismiss || false}
          onChange={(e) => onChange({ ...event, autoDismiss: e.target.checked })}
        />{" "}
        auto dismiss
      </label>
      <ActionInspector
        funnel={funnel}
        event={event}
        actions={event.onTap}
        label="AO TOCAR"
        onChange={(onTap) => onChange({ ...event, onTap })}
      />
      <ActionInspector
        funnel={funnel}
        event={event}
        actions={event.onDismiss}
        label="AO DISPENSAR"
        onChange={(onDismiss) => onChange({ ...event, onDismiss })}
      />
      <button onClick={onTest}>TESTAR NOTIFICAÇÃO</button>
    </section>
  );
}
