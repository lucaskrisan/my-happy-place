import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { AssetSelect, Field } from "./shared";
export function AudioInspector({
  funnel,
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "audio" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "audio" }>) => void;
  onTest: () => void;
}) {
  return (
    <section className="grid gap-2">
      <b>ÁUDIO</b>
      <Field label="Asset">
        <AssetSelect
          funnel={funnel}
          mediaType="audio"
          value={event.assetId}
          onChange={(assetId) => onChange({ ...event, assetId: assetId || "" })}
        />
      </Field>
      <Field label="Volume">
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={event.volume ?? 1}
          onChange={(e) => onChange({ ...event, volume: Number(e.target.value) })}
        />
      </Field>
      <label>
        <input
          type="checkbox"
          checked={event.loop || false}
          onChange={(e) => onChange({ ...event, loop: e.target.checked })}
        />{" "}
        loop
      </label>
      <button onClick={onTest}>TESTAR ÁUDIO</button>
    </section>
  );
}
