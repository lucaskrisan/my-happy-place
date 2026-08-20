import type { FunnelDefinition, SceneEventDefinition } from "../../schema/v1";
import { Field } from "./shared";
import { uid } from "../studioState";
export function QuizInspector({
  event,
  onChange,
  onTest,
}: {
  funnel: FunnelDefinition;
  event: Extract<SceneEventDefinition, { block: "quiz" }>;
  onChange: (event: Extract<SceneEventDefinition, { block: "quiz" }>) => void;
  onTest: () => void;
}) {
  const questions = event.questions;
  const patchQuestion = (index: number, patch: object) =>
    onChange({
      ...event,
      questions: questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    });
  return (
    <section className="grid gap-2">
      <b>QUIZ</b>
      <Field label="Título">
        <input
          value={event.title}
          onChange={(e) => onChange({ ...event, title: e.target.value })}
        />
      </Field>
      <Field label="Variant">
        <select
          value={event.variant || "default"}
          onChange={(e) =>
            onChange({ ...event, variant: e.target.value as "default" | "cinematic" | "immersive" })
          }
        >
          <option>default</option>
          <option>cinematic</option>
          <option>immersive</option>
        </select>
      </Field>
      <Field label="Completion label">
        <input
          value={event.completionLabel || ""}
          onChange={(e) => onChange({ ...event, completionLabel: e.target.value || undefined })}
        />
      </Field>
      <Field label="Feedback">
        <select
          value={event.feedbackMode || "none"}
          onChange={(e) =>
            onChange({ ...event, feedbackMode: e.target.value as "none" | "after_each" })
          }
        >
          <option>none</option>
          <option>after_each</option>
        </select>
      </Field>
      <label>
        <input
          type="checkbox"
          checked={event.showProgress || false}
          onChange={(e) => onChange({ ...event, showProgress: e.target.checked })}
        />{" "}
        mostrar progresso
      </label>
      <Field label="Fechamento">
        <select
          value={event.closeBehavior || "allow"}
          onChange={(e) =>
            onChange({ ...event, closeBehavior: e.target.value as "allow" | "prevent" })
          }
        >
          <option>allow</option>
          <option>prevent</option>
        </select>
      </Field>
      {questions.map((question, qi) => (
        <div className="border border-zinc-700 p-1 grid gap-1" key={question.id}>
          <input
            value={question.title}
            onChange={(e) => patchQuestion(qi, { title: e.target.value })}
          />
          {question.options.map((option, oi) => (
            <div className="grid gap-1" key={option.id}>
              <input
                value={option.label}
                placeholder="label"
                onChange={(e) =>
                  patchQuestion(qi, {
                    options: question.options.map((item, i) =>
                      i === oi ? { ...item, label: e.target.value } : item,
                    ),
                  })
                }
              />
              <input
                value={option.value || ""}
                placeholder="value"
                onChange={(e) =>
                  patchQuestion(qi, {
                    options: question.options.map((item, i) =>
                      i === oi ? { ...item, value: e.target.value || undefined } : item,
                    ),
                  })
                }
              />
              <input
                type="number"
                value={option.score ?? 0}
                placeholder="score"
                onChange={(e) =>
                  patchQuestion(qi, {
                    options: question.options.map((item, i) =>
                      i === oi ? { ...item, score: Number(e.target.value) } : item,
                    ),
                  })
                }
              />
              <input
                value={(option.tags || []).join(",")}
                placeholder="tags"
                onChange={(e) =>
                  patchQuestion(qi, {
                    options: question.options.map((item, i) =>
                      i === oi
                        ? { ...item, tags: e.target.value.split(",").filter(Boolean) }
                        : item,
                    ),
                  })
                }
              />
              <input
                value={option.feedback || ""}
                placeholder="feedback"
                onChange={(e) =>
                  patchQuestion(qi, {
                    options: question.options.map((item, i) =>
                      i === oi ? { ...item, feedback: e.target.value || undefined } : item,
                    ),
                  })
                }
              />
              <button
                onClick={() =>
                  patchQuestion(qi, { options: question.options.filter((_, i) => i !== oi) })
                }
              >
                excluir opção
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              patchQuestion(qi, {
                options: [...question.options, { id: uid("option"), label: "Nova opção" }],
              })
            }
          >
            + OPÇÃO
          </button>
          <button
            onClick={() =>
              onChange({ ...event, questions: event.questions.filter((_, i) => i !== qi) })
            }
          >
            excluir pergunta
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({
            ...event,
            questions: [
              ...event.questions,
              {
                id: uid("question"),
                title: "Pergunta",
                options: [{ id: uid("option"), label: "Opção" }],
              },
            ],
          })
        }
      >
        + PERGUNTA
      </button>
      <button onClick={onTest}>TESTAR QUIZ</button>
    </section>
  );
}
