import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { Field } from "./shared";
import { uid } from "../studioState";
export function ChoiceInspector({
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "choice" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "choice" }>) => void;
  onTest: () => void;
}) {
  return (
    <section className="grid gap-2">
      <b>ESCOLHA</b>
      <Field label="Título">
        <input
          value={event.title}
          onChange={(e) => onChange({ ...event, title: e.target.value })}
        />
      </Field>
      <Field label="Subtítulo">
        <input
          value={event.subtitle || ""}
          onChange={(e) => onChange({ ...event, subtitle: e.target.value || undefined })}
        />
      </Field>
      <Field label="Modo">
        <select
          value={event.mode || "instant"}
          onChange={(e) => onChange({ ...event, mode: e.target.value as "instant" | "confirm" })}
        >
          <option>instant</option>
          <option>confirm</option>
        </select>
      </Field>
      <label>
        <input
          type="checkbox"
          checked={event.required ?? true}
          onChange={(e) => onChange({ ...event, required: e.target.checked })}
        />{" "}
        obrigatório
      </label>
      <label>
        <input
          type="checkbox"
          checked={event.allowChange ?? true}
          onChange={(e) => onChange({ ...event, allowChange: e.target.checked })}
        />{" "}
        permitir alteração
      </label>
      {event.options.map((option, index) => (
        <div className="grid gap-1" key={option.id}>
          <input
            value={option.label}
            onChange={(e) =>
              onChange({
                ...event,
                options: event.options.map((item, i) =>
                  i === index ? { ...item, label: e.target.value } : item,
                ),
              })
            }
          />
          <input
            value={option.value || ""}
            placeholder="value"
            onChange={(e) =>
              onChange({
                ...event,
                options: event.options.map((item, i) =>
                  i === index ? { ...item, value: e.target.value || undefined } : item,
                ),
              })
            }
          />
          <button
            onClick={() =>
              onChange({ ...event, options: event.options.filter((_, i) => i !== index) })
            }
          >
            excluir
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({
            ...event,
            options: [...event.options, { id: uid("option"), label: "Nova opção" }],
          })
        }
      >
        + OPÇÃO
      </button>
      <button onClick={onTest}>TESTAR ESCOLHA</button>
    </section>
  );
}
