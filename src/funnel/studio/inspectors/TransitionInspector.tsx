import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { Field } from "./shared";
export function TransitionInspector({
  funnel,
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "scene_transition" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "scene_transition" }>) => void;
  onTest: () => void;
}) {
  return (
    <section className="grid gap-2">
      <b>TRANSIÇÃO</b>
      <div className="text-xs text-zinc-400">CENA ATUAL → CENA DESTINO</div>
      <Field label="Destino">
        <select
          value={event.targetSceneId}
          onChange={(e) => onChange({ ...event, targetSceneId: e.target.value })}
        >
          <option value="">selecionar</option>
          {funnel.scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
            </option>
          ))}
        </select>
      </Field>
      <button onClick={onTest}>TESTAR TRANSIÇÃO</button>
    </section>
  );
}
