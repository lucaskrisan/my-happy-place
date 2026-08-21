import { useEffect, useState } from "react";
import type { FunnelDefinition, SceneEventDefinition } from "../schema/v1";
import {
  addGuidedScene,
  actionFromGuided,
  createGuidedFunnel,
  guidedEvent,
  guidedProgress,
  markSceneTested,
  nextGuidedStep,
  sceneStatus,
  triggerFromGuided,
  type GuidedUiState,
} from "./guidedState";
import { reorderScenes, uid } from "./studioState";
import { GuidedPreview, formatTime } from "./GuidedPreview";
import { GuidedEssentialInteractions } from "./GuidedEssentialInteractions";
import { GuidedComplexInteractions } from "./GuidedComplexInteractions";
import { InlineMediaPicker } from "./InlineMediaPicker";
import { exportGuidedProject, goToIssue, globalNextStep, reviewSummary } from "./guidedReview";

const steps = ["script", "production", "video", "interactivity", "test", "review"] as const;
type Step = (typeof steps)[number];
const labels: Record<Step, string> = {
  script: "ROTEIRO",
  production: "PRODUÇÃO",
  video: "VÍDEO",
  interactivity: "INTERATIVIDADE",
  test: "TESTE",
  review: "REVISAR EXPERIÊNCIA",
};
const triggerOptions = [
  ["start", "NO COMEÇO DO VÍDEO"],
  ["time", "EM UM MOMENTO ESPECÍFICO"],
  ["before_end", "POUCO ANTES DO FINAL"],
  ["end", "QUANDO O VÍDEO TERMINAR"],
  ["after", "DEPOIS DE OUTRA INTERAÇÃO"],
] as const;
export function GuidedBuilder({
  funnel,
  onChange,
  onAdvanced,
  ui,
  onUi,
  urls,
  onAttachPreview,
  onAttachPreviewFile,
  productName,
  onBackToProduct,
  onAssets,
  onExportDraft,
  onExportValid,
}: {
  funnel: FunnelDefinition;
  onChange: (funnel: FunnelDefinition) => void;
  onAdvanced: () => void;
  ui: GuidedUiState;
  onUi: (next: GuidedUiState) => void;
  urls: Record<string, string>;
  onAttachPreview: (assetId?: string, sceneId?: string) => void;
  onAttachPreviewFile: (file: File, assetId?: string, sceneId?: string) => void;
  productName?: string;
  onBackToProduct?: () => void;
  onAssets?: () => void;
  onExportDraft?: () => void;
  onExportValid?: () => void;
}) {
  // The project wizard lives on the Studio home; these remain false here so a scene wizard never opens it.
  const [wizard, setWizard] = useState(false),
    [type, setType] = useState<any>("story"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [structure, setStructure] = useState<any>("one");
  const onNew = (_funnel: FunnelDefinition) => undefined;
  const [sceneId, setSceneId] = useState(
    funnel.scenes.some((item) => item.id === ui.sceneId) ? ui.sceneId! : funnel.entrySceneId,
  );
  const [step, setStep] = useState<Step>(ui.step || "script");
  const [timeEventId, setTimeEventId] = useState<string | null>(null);
  const scene = funnel.scenes.find((item) => item.id === sceneId) || funnel.scenes[0]!;
  const progress = guidedProgress(funnel);
  useEffect(() => {
    if (!funnel.scenes.some((item) => item.id === sceneId)) {
      const fallback = funnel.scenes[0]?.id || funnel.entrySceneId;
      setSceneId(fallback);
      onUi({ ...ui, mode: "guided", funnelId: funnel.id, sceneId: fallback, step });
    }
  }, [funnel, sceneId, step, ui, onUi]);
  const update = (patch: any) =>
    onChange({
      ...funnel,
      scenes: funnel.scenes.map((item) => (item.id === scene.id ? { ...item, ...patch } : item)),
    });
  const updateEvent = (event: SceneEventDefinition) =>
    onChange({
      ...funnel,
      scenes: funnel.scenes.map((item) =>
        item.id === scene.id ? { ...item, events: [...item.events, event] } : item,
      ),
    });
  const persist = (nextStep: Step) => {
    setStep(nextStep);
    onUi({ ...ui, mode: "guided", funnelId: funnel.id, sceneId: scene.id, step: nextStep });
  };
  const asset = scene.videoAssetId && funnel.assets.find((item) => item.id === scene.videoAssetId);
  const addInteraction = (block: SceneEventDefinition["block"]) => {
    const event = guidedEvent(
      block,
      triggerFromGuided("time", 0),
      actionFromGuided(block === "scene_transition" ? "next" : "resume"),
    );
    if (block === "scene_transition")
      (event as any).targetSceneId =
        scene.nextSceneId || funnel.scenes.find((item) => item.id !== scene.id)?.id || "";
    if (block === "quiz") {
      (event as any).questions[0].options.push({ id: uid("option"), label: "Opção 2" });
    }
    updateEvent(event);
  };
  return (
    <main className="min-h-screen bg-[#09090b] text-white p-5 md:p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between gap-3 border-b border-white/[.07] pb-5">
        <div>
          {productName && <button onClick={onBackToProduct} className="mb-2 block text-xs font-medium text-zinc-500 hover:text-zinc-200">{productName} / FUNIL</button>}
          <h1 className="text-2xl font-bold">{funnel.title}</h1>
          <p className="text-zinc-400">
            {progress.ready}/{progress.total} cenas prontas · {progress.percent}% concluído
          </p>
        </div>
        <div className="flex gap-2"><button onClick={() => persist("review")}>FINALIZAR EXPERIÊNCIA</button><button onClick={onAdvanced}>ABRIR EDITOR AVANÇADO</button></div>
      </header>
      <nav className="max-w-7xl mx-auto mt-4 flex flex-wrap gap-1 rounded-xl border border-white/[.07] bg-white/[.025] p-1.5 text-sm">
        <button className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/[.06]" onClick={() => persist("script")}>CRIAÇÃO</button>
        <button className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/[.06]" onClick={() => document.getElementById("studio-scenes")?.scrollIntoView({ behavior: "smooth" })}>CENAS</button>
        <button className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/[.06]" onClick={onAssets}>ARQUIVOS</button>
        <button className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/[.06]" onClick={() => persist("review")}>REVISÃO</button>
        <button className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/[.06]" onClick={onExportDraft}>EXPORTAR RASCUNHO</button>
        <button className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-white/[.06]" onClick={onExportValid}>EXPORTAR VÁLIDO</button>
        <button className="ml-auto rounded-lg px-3 py-2 text-zinc-400 hover:bg-white/[.06]" onClick={onAdvanced}>EDITOR AVANÇADO</button>
      </nav>
      <div className="max-w-7xl mx-auto mt-7 grid grid-cols-[250px_minmax(0,1fr)] gap-8">
        <aside id="studio-scenes" className="space-y-2">
          <p className="px-2 text-xs font-semibold tracking-[.16em] text-zinc-500">CENAS</p>
          <button
            className="mb-3 w-full rounded-lg border border-dashed border-zinc-700 px-3 py-3 text-sm font-medium text-zinc-300 hover:border-blue-400 hover:text-white"
            onClick={() => {
              const next = addGuidedScene(funnel);
              onChange(next);
              const created = next.scenes.at(-1)!;
              setSceneId(created.id);
              onUi({
                ...ui,
                mode: "guided",
                funnelId: funnel.id,
                sceneId: created.id,
                step: "script",
              });
            }}
          >
            + NOVA CENA
          </button>
          {funnel.scenes.map((item, index) => {
            const status = sceneStatus(item, funnel);
            return (
              <div
                role="button"
                tabIndex={0}
                className={`w-full rounded-xl p-4 text-left transition ${item.id === scene.id ? "bg-blue-500/10 ring-1 ring-blue-400/70" : "hover:bg-white/[.035]"}`}
                key={item.id}
                onClick={() => {
                  setSceneId(item.id);
                  persist("script");
                }}
              >
                <b>
                  CENA {index + 1}: {item.title}
                </b>
                <small className="block text-zinc-400">
                  Roteiro {status.script} · Vídeo {status.video}
                </small>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>{item.nextSceneId ? "Próxima cena conectada" : "Última cena"}</span>
                  <span className="flex gap-1"><button aria-label="Mover cena para cima" disabled={index === 0} onClick={(event) => { event.stopPropagation(); onChange(reorderScenes(funnel, index, index - 1)); }}>↑</button><button aria-label="Mover cena para baixo" disabled={index === funnel.scenes.length - 1} onClick={(event) => { event.stopPropagation(); onChange(reorderScenes(funnel, index, index + 1)); }}>↓</button></span>
                </div>
              </div>
            );
          })}
        </aside>
        <section className="space-y-5">
          <div className="rounded-xl bg-zinc-900 p-4">
            <b>PRÓXIMO PASSO</b>
            <p className="text-lg">{nextGuidedStep(scene, funnel)}</p>
          </div>
          <nav className="flex gap-2 flex-wrap">
            {steps.map((item) => (
              <button
                key={item}
                className={step === item ? "bg-blue-600" : ""}
                onClick={() => persist(item)}
              >
                {labels[item]}
              </button>
            ))}
          </nav>
          {step === "script" && <Script scene={scene} update={update} />}{" "}
          {step === "production" && <Production scene={scene} update={update} />}{" "}
          {step === "video" && (
            <VideoStep
              funnel={funnel}
              scene={scene}
              asset={asset || undefined}
              onChange={onChange}
              update={update}
              urls={urls}
              onAttachPreview={onAttachPreview}
              onAttachPreviewFile={onAttachPreviewFile}
            />
          )}{" "}
          {step === "interactivity" && (
            <><GuidedEssentialInteractions funnel={funnel} scene={scene} urls={urls} onChange={onChange} onAttachAsset={() => onAttachPreview()} onAttachPreviewFile={onAttachPreviewFile} /><GuidedComplexInteractions funnel={funnel} scene={scene} urls={urls} onChange={onChange} onAttachAsset={() => onAttachPreview()} onAttachPreviewFile={onAttachPreviewFile} /></>
          )}{" "}
          {step === "test" && <TestStep funnel={funnel} scene={scene} urls={urls} onTested={() => onChange(markSceneTested(funnel, scene.id))} />}
          {step === "review" && <ReviewStep funnel={funnel} urls={urls} onUi={onUi} onChange={onChange} />}
          <footer className="flex justify-between">
            <button onClick={() => persist(steps[Math.max(0, steps.indexOf(step) - 1)]!)}>
              VOLTAR
            </button>
            <button
              onClick={() => persist(steps[Math.min(steps.length - 1, steps.indexOf(step) + 1)]!)}
            >
              CONTINUAR
            </button>
            <button onClick={() => onAdvanced()}>ABRIR EDITOR AVANÇADO</button>
          </footer>
        </section>
      </div>
      {wizard && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center p-6">
          <div className="bg-zinc-900 p-6 max-w-lg w-full grid gap-4">
            <h2>O que você quer criar?</h2>
            <select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="story">História Interativa</option>
              <option value="vsl">VSL Interativa</option>
              <option value="quiz">Quiz / Diagnóstico</option>
              <option value="gamified">Funil Gamificado</option>
              <option value="training">Treinamento Interativo</option>
              <option value="blank">Começar do Zero</option>
            </select>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Como vamos chamar sua experiência?"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
            />
            <select value={structure} onChange={(e) => setStructure(e.target.value as any)}>
              <option value="one">Criar primeira cena</option>
              <option value="three">Começar com estrutura de 3 cenas</option>
              <option value="empty">Começar vazio</option>
            </select>
            <div className="flex justify-between">
              <button onClick={() => setWizard(false)}>VOLTAR</button>
              <button
                disabled={!title.trim()}
                onClick={() => {
                  onNew(createGuidedFunnel(type, title, description, structure));
                  setWizard(false);
                }}
              >
                CRIAR EXPERIÊNCIA
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function Script({ scene, update }: { scene: any; update: (patch: any) => void }) {
  const guided = scene.guided || {};
  const script = guided.script || {};
  const set = (key: string, value: string) =>
    update({ guided: { ...guided, script: { ...script, [key]: value } } });
  return (
    <div className="grid gap-4">
      <h2>O que acontece nesta cena?</h2>
      <input
        value={scene.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Nome da cena"
      />
      <input
        value={guided.objective || ""}
        onChange={(e) => update({ guided: { ...guided, objective: e.target.value } })}
        placeholder="Objetivo da cena"
      />
      <textarea
        value={script.happens || ""}
        onChange={(e) => set("happens", e.target.value)}
        placeholder="O que acontece?"
      />
      <input
        value={script.who || ""}
        onChange={(e) => set("who", e.target.value)}
        placeholder="Quem aparece?"
      />
      <textarea
        value={script.dialogue || ""}
        onChange={(e) => set("dialogue", e.target.value)}
        placeholder="O que é dito?"
      />
      <textarea
        value={script.notes || ""}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Observações"
      />
    </div>
  );
}
function Production({ scene, update }: { scene: any; update: (patch: any) => void }) {
  const guide = scene.guided?.productionGuide || {
    steps: [
      {
        id: "image",
        tool: "Flow",
        type: "IMAGE_GENERATION",
        title: "Criar imagem",
        instructions: "Use Flow, Gemini, Midjourney ou outra ferramenta de imagem.",
        prompt: "Personagem, ambiente, ação, roupa, luz, câmera e continuidade.",
        completed: false,
        takes: [],
      },
      {
        id: "animation",
        tool: "Flow",
        type: "VIDEO_ANIMATION",
        title: "Animar cena",
        instructions: "Um momento por take; mantenha personagem, figurino e ambiente.",
        prompt: "Personagem, ação, fala, movimento, duração e continuidade.",
        completed: false,
        takes: [],
      },
      {
        id: "voice",
        type: "VOICE",
        title: "Áudio / voz",
        instructions: "Grave voz, use ElevenLabs ou áudio original.",
        prompt: "Direção de voz.",
        completed: false,
        takes: [],
      },
      {
        id: "editing",
        type: "EDITING",
        title: "Editar",
        instructions: "Junte takes, revise falas, sincronização e proporção.",
        completed: false,
        takes: [],
      },
      {
        id: "export",
        type: "EXPORT",
        title: "Exportar MP4",
        instructions: "MP4 H.264, 9:16 quando aplicável.",
        completed: false,
        takes: [],
      },
    ],
  };
  const save = (steps: any[]) =>
    update({ guided: { ...scene.guided, productionGuide: { steps } } });
  const activeIndex = Math.max(0, guide.steps.findIndex((item: any) => !item.completed));
  return (
    <div className="grid gap-3">
      <h2>PRODUZIR ESTA CENA</h2>
      {guide.steps.map((item: any, index: number) => (
        <div className={`rounded-xl p-4 ${index === activeIndex ? "border border-blue-400/50 bg-blue-500/5" : "bg-white/[.03] text-zinc-500 [&>p]:hidden [&>textarea]:hidden [&>button]:hidden [&>label]:hidden"}`} key={item.id}>
          <b>
            PASSO {index + 1} — {item.title}
          </b>
          <p>{item.instructions}</p>
          <textarea
            value={item.prompt || ""}
            onChange={(e) =>
              save(
                guide.steps.map((step: any, i: number) =>
                  i === index ? { ...step, prompt: e.target.value } : step,
                ),
              )
            }
          />
          <button onClick={() => navigator.clipboard?.writeText(item.prompt || "")}>
            COPIAR PROMPT
          </button>
          <label>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={(e) =>
                save(
                  guide.steps.map((step: any, i: number) =>
                    i === index ? { ...step, completed: e.target.checked } : step,
                  ),
                )
              }
            />{" "}
            concluído
          </label>
          {item.type === "VIDEO_ANIMATION" && (
            <button
              onClick={() =>
                save(
                  guide.steps.map((step: any, i: number) =>
                    i === index
                      ? {
                          ...step,
                          takes: [
                            ...step.takes,
                            { id: uid("take"), title: "Novo take", completed: false },
                          ],
                        }
                      : step,
                  ),
                )
              }
            >
              + NOVO TAKE
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
function VideoStep({
  funnel,
  scene,
  asset,
  onChange,
  update,
  urls,
  onAttachPreview,
  onAttachPreviewFile,
}: {
  funnel: FunnelDefinition;
  scene: any;
  asset: any;
  onChange: (f: FunnelDefinition) => void;
  update: (p: any) => void;
  urls: Record<string, string>;
  onAttachPreview: (assetId?: string, sceneId?: string) => void;
  onAttachPreviewFile: (file: File, assetId?: string, sceneId?: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <h2>Adicione o vídeo final desta cena.</h2>
      <InlineMediaPicker label="VÍDEO" mediaType="video" funnel={funnel} urls={urls} value={scene.videoAssetId} onSelect={(assetId) => update({ videoAssetId: assetId })} onChange={onChange} onAttachPreview={(file, assetId) => onAttachPreviewFile(file, assetId, scene.id)} />
      {asset && (
        <>
          <b>✓ VÍDEO ADICIONADO</b>
          {asset.source === "preview" && !urls[asset.id] ? (
            <button onClick={() => onAttachPreview(asset.id, scene.id)}>REANEXAR ARQUIVO: {asset.fileName}</button>
          ) : (
            <GuidedPreview funnel={funnel} scene={scene} urls={urls} onMoment={() => undefined} />
          )}
        </>
      )}
    </div>
  );
}
function Interactions({
  funnel,
  scene,
  add,
  onChange,
  urls,
  timeEventId,
  onPickTime,
}: {
  funnel: FunnelDefinition;
  scene: any;
  add: (block: any) => void;
  onChange: (f: FunnelDefinition) => void;
  urls: Record<string, string>;
  timeEventId: string | null;
  onPickTime: (id: string | null) => void;
}) {
  const update = (id: string, patch: any) =>
    onChange({
      ...funnel,
      scenes: funnel.scenes.map((item) =>
        item.id === scene.id
          ? {
              ...item,
              events: item.events.map((event) =>
                event.id === id ? { ...event, ...patch } : event,
              ),
            }
          : item,
      ),
    });
  return (
    <div className="grid gap-3">
      <h2>Quer que alguma coisa aconteça durante esta cena?</h2>
      <div className="flex flex-wrap gap-2">
        {[
          ["quiz", "❓ FAZER UMA PERGUNTA"],
          ["incoming_call", "📞 RECEBER UMA LIGAÇÃO"],
          ["messaging", "💬 ABRIR UMA CONVERSA"],
          ["notification", "🔔 MOSTRAR UMA NOTIFICAÇÃO"],
          ["audio", "🔊 TOCAR UM ÁUDIO"],
          ["choice", "👆 DAR UMA ESCOLHA"],
          ["scene_transition", "➡️ IR PARA OUTRA CENA"],
        ].map(([block, label]) => (
          <button key={block} onClick={() => add(block)}>
            {label}
          </button>
        ))}
      </div>
      {scene.events.map((event: any) => (
        <div className="border border-zinc-700 p-3 grid gap-2" key={event.id}>
          <b>{event.block}</b>
          <select
            value={event.trigger.kind}
            onChange={(e) => {
              const map: any = {
                SCENE_START: "start",
                TIME: "time",
                BEFORE_END: "before_end",
                VIDEO_END: "end",
                INTERACTION_COMPLETE: "after",
              };
              update(event.id, { trigger: triggerFromGuided(map[e.target.value]) });
            }}
          >
            {triggerOptions.map(([value, label]) => (
              <option
                key={value}
                value={
                  value === "start"
                    ? "SCENE_START"
                    : value === "time"
                      ? "TIME"
                      : value === "before_end"
                        ? "BEFORE_END"
                        : value === "end"
                          ? "VIDEO_END"
                          : "INTERACTION_COMPLETE"
                }
              >
                {label}
              </option>
            ))}
          </select>
          {event.trigger.kind === "TIME" && (
            <>
            <input
              type="number"
              step="0.01"
              value={event.trigger.seconds}
              onChange={(e) =>
                update(event.id, { trigger: triggerFromGuided("time", Number(e.target.value)) })
              }
            />
            <button onClick={() => onPickTime(timeEventId === event.id ? null : event.id)}>ESCOLHER MOMENTO DO VÍDEO</button>
            {timeEventId === event.id && <GuidedPreview funnel={funnel} scene={scene} urls={urls} onMoment={(seconds) => { update(event.id, { trigger: triggerFromGuided("time", seconds) }); onPickTime(null); }} />}
            </>
          )}{" "}
          {event.trigger.kind === "BEFORE_END" && (
            <input
              type="number"
              step="0.01"
              value={event.trigger.seconds}
              onChange={(e) =>
                update(event.id, {
                  trigger: triggerFromGuided("before_end", Number(e.target.value)),
                })
              }
            />
          )}{" "}
          {event.block === "quiz" && (
            <>
              <input
                value={event.questions[0]?.title || ""}
                onChange={(e) =>
                  update(event.id, {
                    questions: [{ ...event.questions[0], title: e.target.value }],
                  })
                }
              />
              <button
                onClick={() =>
                  update(event.id, {
                    questions: [
                      {
                        ...event.questions[0],
                        options: [
                          ...event.questions[0].options,
                          { id: uid("option"), label: "Nova opção" },
                        ],
                      },
                    ],
                  })
                }
              >
                + ADICIONAR OPÇÃO
              </button>
            </>
          )}{" "}
          {event.block === "incoming_call" && (
            <>
              <input
                value={event.callerName}
                placeholder="Quem está ligando?"
                onChange={(e) => update(event.id, { callerName: e.target.value })}
              />
              <select
                value={event.voiceAssetId || ""}
                onChange={(e) => update(event.id, { voiceAssetId: e.target.value || undefined })}
              >
                <option value="">Áudio da voz</option>
                {funnel.assets
                  .filter((item) => item.mediaType === "audio")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
              </select>
            </>
          )}{" "}
          {event.block === "notification" && (
            <textarea
              value={event.message}
              onChange={(e) => update(event.id, { message: e.target.value })}
            />
          )}
          <select
            value={event.actions[0]?.type || "RESUME_VIDEO"}
            onChange={(e) =>
              update(event.id, {
                actions: [
                  actionFromGuided(
                    e.target.value === "RESUME_VIDEO"
                      ? "resume"
                      : e.target.value === "NEXT_SCENE"
                        ? "next"
                        : e.target.value === "STOP"
                          ? "stop"
                          : "resume",
                  ),
                ],
              })
            }
          >
            <option value="RESUME_VIDEO">CONTINUAR O VÍDEO</option>
            <option value="NEXT_SCENE">IR PARA A PRÓXIMA CENA</option>
            <option value="STOP">ENCERRAR ESTA EXPERIÊNCIA</option>
          </select>
        </div>
      ))}
    </div>
  );
}
function TestStep({ funnel, scene, urls, onTested }: { funnel: FunnelDefinition; scene: any; urls: Record<string, string>; onTested: () => void }) {
  return (
    <div className="grid gap-3">
      <h2>TESTE ESTA CENA</h2>
      <p>Use o preview real no Editor Avançado para executar vídeo e interações.</p>
      <GuidedPreview funnel={funnel} scene={scene} urls={urls} onTested={onTested} />
    </div>
  );
}

function ReviewStep({ funnel, urls, onUi, onChange }: { funnel: FunnelDefinition; urls: Record<string, string>; onUi: (next: GuidedUiState) => void; onChange: (funnel: FunnelDefinition) => void }) {
  const [testing, setTesting] = useState(false);
  const [exported, setExported] = useState<"draft" | "valid" | null>(null);
  const summary = reviewSummary(funnel);
  const download = (type: "draft" | "valid") => {
    const result = exportGuidedProject(funnel, type);
    if (!result.ok) return alert(`Corrija ${result.issues.length} problemas antes de exportar.`);
    const url = URL.createObjectURL(new Blob([result.json], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${funnel.id}-${type}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); setExported(type);
  };
  const fix = (issue: ReturnType<typeof reviewSummary>["issues"][number]) => {
    const target = goToIssue(issue);
    onUi({ mode: "guided", funnelId: funnel.id, ...(target.sceneId ? { sceneId: target.sceneId } : {}), step: target.step });
  };
  if (testing) return <section className="grid gap-3"><header className="flex justify-between"><h2>TESTAR EXPERIÊNCIA COMPLETA</h2><button onClick={() => setTesting(false)}>SAIR DO TESTE</button></header><GuidedPreview funnel={funnel} scene={funnel.scenes.find((scene) => scene.id === funnel.entrySceneId) || funnel.scenes[0]!} urls={urls} /></section>;
  return <section className="grid gap-4"><h2>REVISAR EXPERIÊNCIA</h2><p>{globalNextStep(funnel)}</p><div className="grid md:grid-cols-3 gap-3"><ReviewCard title="ESTRUTURA" ready={funnel.scenes.length > 0 && !summary.errors.some((issue) => issue.title.includes("Conexão") || issue.title.includes("Cena"))} text={`${funnel.scenes.length} cenas configuradas`} /><ReviewCard title="VÍDEOS" ready={summary.videos === funnel.scenes.length} text={`${summary.videos}/${funnel.scenes.length} vídeos configurados`} /><ReviewCard title="INTERAÇÕES" ready text={`${summary.interactions} interações`} /><ReviewCard title="ARQUIVOS" ready={!summary.errors.some((issue) => issue.title.includes("Arquivo"))} text={`${funnel.assets.length} arquivos`} /><ReviewCard title="TESTES" ready={summary.warnings.length === 0} text={`${summary.tested}/${funnel.scenes.length} cenas testadas`} /><ReviewCard title="CONEXÕES" ready={!summary.errors.some((issue) => issue.title.includes("Conexão"))} text={funnel.scenes.map((scene) => scene.nextSceneId ? `${scene.title} ↓ ${funnel.scenes.find((item) => item.id === scene.nextSceneId)?.title || "?"}` : scene.title).join(" · ")} /></div><div className="rounded bg-zinc-900 p-4"><b>FALTAM {summary.errors.length + summary.warnings.length} COISAS PARA SUA EXPERIÊNCIA FICAR PRONTA</b>{summary.issues.length ? summary.issues.map((issue) => <div className="flex justify-between gap-2 mt-2" key={issue.id}><span><b>{issue.severity === "error" ? "ERRO" : "ATENÇÃO"}</b> — {issue.message}</span><button onClick={() => fix(issue)}>CORRIGIR</button></div>) : <p>SUA EXPERIÊNCIA ESTÁ PRONTA ✅</p>}</div>{summary.errors.length === 0 && <div className="rounded border border-emerald-700 p-4"><b>SUA EXPERIÊNCIA ESTÁ PRONTA ✅</b><p>{funnel.title} · {funnel.scenes.length} cenas · {summary.interactions} interações · {summary.videos} vídeos · {funnel.assets.length} arquivos · {summary.warnings.length} avisos</p></div>}<div className="flex flex-wrap gap-2"><button onClick={() => setTesting(true)}>▶ TESTAR EXPERIÊNCIA COMPLETA</button><button onClick={() => download("draft")}>EXPORTAR RASCUNHO</button><button disabled={summary.errors.length > 0} onClick={() => download("valid")}>EXPORTAR PROJETO VÁLIDO</button><button disabled>EXPORTAR PARA PUBLICAÇÃO — EM BREVE</button></div>{exported && <p>PROJETO EXPORTADO ✅ Na próxima etapa, este arquivo poderá virar um pacote para publicação na Cloudflare.</p>}</section>;
}
function ReviewCard({ title, ready, text }: { title: string; ready: boolean; text: string }) { return <div className="border border-zinc-700 p-3"><b>{title}</b><p>{ready ? "PRONTO" : "ATENÇÃO"}</p><small>{text}</small></div>; }

export function FunnelStudioHome({
  projects,
  funnel,
  onGuided,
  onAdvanced,
  onNew,
}: {
  projects: { id: string; title: string; updatedAt: number }[];
  funnel: FunnelDefinition;
  onGuided: () => void;
  onAdvanced: () => void;
  onNew: (funnel: FunnelDefinition) => void;
}) {
  const progress = guidedProgress(funnel);
  const [wizard, setWizard] = useState(false),
    [type, setType] = useState<"story" | "vsl" | "quiz" | "gamified" | "training" | "blank">(
      "story",
    ),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [structure, setStructure] = useState<"one" | "three" | "empty">("one");
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold">FUNNEL STUDIO</h1>
        <p className="text-zinc-400 mt-2">Crie experiências interativas sem precisar programar.</p>
        <div className="grid md:grid-cols-2 gap-5 mt-8">
          <button className="text-left p-8 rounded-xl bg-blue-600" onClick={onGuided}>
            <b className="text-xl">CRIAÇÃO GUIADA</b>
            <span className="block mt-2">Recomendado. Monte sua experiência passo a passo.</span>
          </button>
          <button className="text-left p-8 rounded-xl bg-zinc-800" onClick={onAdvanced}>
            <b className="text-xl">EDITOR AVANÇADO</b>
            <span className="block mt-2">Controle cenas, timeline, eventos, triggers e ações.</span>
          </button>
        </div>
        <div className="mt-10 flex justify-between">
          <h2 className="text-xl">MEUS FUNIS</h2>
          <button onClick={() => setWizard(true)}>+ NOVA EXPERIÊNCIA</button>
        </div>
        <div className="mt-3 grid gap-3">
          {projects.map((project) => (
            <div className="bg-zinc-900 p-4 flex justify-between" key={project.id}>
              <div>
                <b>{project.title}</b>
                <small className="block text-zinc-400">
                  {project.id === funnel.id
                    ? `${funnel.scenes.length} cenas · ${progress.percent}% concluído`
                    : "Projeto salvo"}
                </small>
              </div>
              <button onClick={onGuided}>CONTINUAR</button>
            </div>
          ))}
        </div>
      </div>
      {wizard && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center p-6">
          <div className="bg-zinc-900 p-6 max-w-lg w-full grid gap-4">
            <h2>O que você quer criar?</h2>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="story">História Interativa</option>
              <option value="vsl">VSL Interativa</option>
              <option value="quiz">Quiz / Diagnóstico</option>
              <option value="gamified">Funil Gamificado</option>
              <option value="training">Treinamento Interativo</option>
              <option value="blank">Começar do Zero</option>
            </select>
            <h2>Como vamos chamar sua experiência?</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
            />
            <h2>Como você quer começar?</h2>
            <select
              value={structure}
              onChange={(e) => setStructure(e.target.value as typeof structure)}
            >
              <option value="one">Criar primeira cena</option>
              <option value="three">Criar estrutura com 3 cenas</option>
              <option value="empty">Começar vazio</option>
            </select>
            <div className="flex justify-between">
              <button onClick={() => setWizard(false)}>VOLTAR</button>
              <button
                disabled={!title.trim()}
                onClick={() => {
                  onNew(createGuidedFunnel(type, title, description, structure));
                  setWizard(false);
                }}
              >
                CONTINUAR
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
