import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { FunnelDefinition, SceneEventDefinition } from "../schema/v1";
import {
  addGuidedScene,
  actionFromGuided,
  createGuidedFunnel,
  deleteGuidedScene,
  duplicateGuidedScene,
  guidedEvent,
  guidedProgress,
  guidedSceneReferences,
  issueBelongsToScene,
  markSceneTested,
  nextGuidedStep,
  sceneStatus,
  triggerFromGuided,
  type GuidedUiState,
} from "./guidedState";
import { validateFunnel } from "../validator/validateFunnel";
import { reorderScenes, uid } from "./studioState";
import { GuidedPreview, formatTime } from "./GuidedPreview";
import { GuidedEssentialInteractions } from "./GuidedEssentialInteractions";
import { GuidedComplexInteractions } from "./GuidedComplexInteractions";
import { InlineMediaPicker } from "./InlineMediaPicker";
import { UserMenu } from "./UserMenu";
import { exportGuidedProject, goToIssue, globalNextStep, reviewSummary } from "./guidedReview";
import {
  PageTitle,
  SectionTitle,
  Eyebrow,
  HelpText,
  Card,
  Badge,
  ProgressBar,
  Breadcrumb,
  Stepper,
  type StepState,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  EmptyState,
  useToast,
  Toast,
  Dot,
  StudioSelect,
} from "./ui";

// "review" is a funnel-level destination (reached from the top nav's REVISÃO button), not a per-scene
// step, so it stays out of this tab list even though the Step type still allows it.
const steps = ["script", "production", "video", "interactivity", "test"] as const;
type Step = (typeof steps)[number] | "review";
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
// The sidebar lists scenes in array order (drag-to-reorder position), which can drift from the graph's
// real playback order (entrySceneId -> nextSceneId chain). This flags that drift instead of hiding it.
function sceneOrderMismatch(funnel: FunnelDefinition): boolean {
  const graphOrder: string[] = [];
  let cursor: string | undefined = funnel.entrySceneId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    graphOrder.push(cursor);
    cursor = funnel.scenes.find((scene) => scene.id === cursor)?.nextSceneId;
  }
  const arrayOrder = funnel.scenes.map((scene) => scene.id);
  return graphOrder.length === arrayOrder.length && graphOrder.some((id, index) => id !== arrayOrder[index]);
}
// The autosave itself already runs everywhere in FunnelStudio — this only makes it visible. It used to
// render only in the legacy Editor avançado header, so the default Guided flow gave zero confirmation
// that anything was actually being saved.
function SaveIndicator({ state }: { state: "CARREGANDO" | "SALVANDO..." | "SALVO" | "ERRO AO SALVAR" }) {
  const tone = state === "SALVO" ? "success" : state === "ERRO AO SALVAR" ? "error" : "neutral";
  const label = state === "CARREGANDO" ? "Carregando…" : state === "SALVANDO..." ? "Salvando…" : state === "SALVO" ? "Salvo" : "Erro ao salvar";
  return (
    <span className={`flex items-center gap-1.5 text-sm ${state === "ERRO AO SALVAR" ? "font-medium text-studio-error" : "text-studio-text-muted"}`} aria-live="polite">
      <Dot tone={tone} />
      {label}
    </span>
  );
}
export function GuidedBuilder({
  funnel,
  onChange,
  onAdvanced,
  ui,
  onUi,
  saveState,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
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
  saveState?: "CARREGANDO" | "SALVANDO..." | "SALVO" | "ERRO AO SALVAR";
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  urls: Record<string, string>;
  onAttachPreview: (assetId?: string, sceneId?: string) => void;
  onAttachPreviewFile: (file: File, assetId?: string, sceneId?: string) => void;
  productName?: string;
  onBackToProduct?: () => void;
  onAssets?: () => void;
  onExportDraft?: () => void;
  onExportValid?: () => void;
}) {
  const [sceneMenuOpen, setSceneMenuOpen] = useState<string | null>(null);
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const commitRename = () => {
    if (renamingSceneId && renameDraft.trim()) {
      onChange({ ...funnel, scenes: funnel.scenes.map((item) => (item.id === renamingSceneId ? { ...item, title: renameDraft.trim() } : item)) });
    }
    setRenamingSceneId(null);
  };
  // Undo/redo already tracks every edit in FunnelStudio.tsx (used by the advanced editor for years) — this
  // just exposes it here too. Ignored while typing in a field so it doesn't fight the browser's own
  // text-undo inside that input.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      if (event.shiftKey) onRedo?.();
      else onUndo?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onUndo, onRedo]);
  // sceneId/step are derived from the `ui` prop (not local state) so that external navigation — e.g.
  // "CORRIGIR" on a review issue calling onUi(...) — actually moves this screen instead of being silently
  // ignored by state this component never re-read after mount.
  const sceneId = funnel.scenes.some((item) => item.id === ui.sceneId) ? ui.sceneId! : funnel.entrySceneId;
  const step: Step = ui.step || "script";
  const scene = funnel.scenes.find((item) => item.id === sceneId) || funnel.scenes[0]!;
  const progress = guidedProgress(funnel);
  useEffect(() => {
    if (!funnel.scenes.some((item) => item.id === ui.sceneId)) {
      onUi({ ...ui, mode: "guided", funnelId: funnel.id, sceneId, step });
    }
  }, [funnel, ui, sceneId, step, onUi]);
  // funnelOverride: see the comment on InlineMediaPicker's Props — a scene patch that lands right after a
  // permanent upload must rebase on the funnel that upload just produced, not the (by then stale) `funnel`
  // closed over here, or the newly uploaded asset silently disappears from `assets` again.
  const update = (patch: any, funnelOverride?: FunnelDefinition) => {
    const base = funnelOverride ?? funnel;
    onChange({
      ...base,
      scenes: base.scenes.map((item) => (item.id === scene.id ? { ...item, ...patch } : item)),
    });
  };
  const updateEvent = (event: SceneEventDefinition) =>
    onChange({
      ...funnel,
      scenes: funnel.scenes.map((item) =>
        item.id === scene.id ? { ...item, events: [...item.events, event] } : item,
      ),
    });
  const persist = (nextStep: Step, nextSceneId = scene.id) => {
    const { eventId: _eventId, ...rest } = ui;
    onUi({ ...rest, mode: "guided", funnelId: funnel.id, sceneId: nextSceneId, step: nextStep });
  };
  const clearFocusEventId = () => {
    const { eventId: _eventId, ...rest } = ui;
    onUi(rest);
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
  const sceneIssues = validateFunnel(funnel).filter((issue) => issueBelongsToScene(issue.path, scene));
  const status = sceneStatus(scene, funnel);
  // sceneStatus().production only ever distinguishes "EM ANDAMENTO"/"NÃO INICIADO" (never "PRONTO"), so
  // the stepper checks the production guide's own steps directly to know when this one is actually done.
  const productionSteps = scene.guided?.productionGuide?.steps;
  const productionDone = !!productionSteps?.length && productionSteps.every((item: any) => item.completed);
  const stepState = (key: (typeof steps)[number]): StepState => {
    if (key === step) return "active";
    if (key === "interactivity" && sceneIssues.length) return "error";
    if (key === "production") return productionDone ? "done" : "pending";
    const value = { script: status.script, video: status.video, interactivity: status.interactivity, test: status.test }[key];
    return value === "PRONTO" ? "done" : "pending";
  };
  return (
    <main className="min-h-screen bg-studio-bg text-studio-text">
      <header className="border-b border-studio-border px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            {productName && <Breadcrumb items={[{ label: productName, onClick: onBackToProduct }, funnel.title]} />}
            <div className="mt-1 flex items-center gap-3">
              <PageTitle className="text-2xl">{funnel.title}</PageTitle>
              <Badge tone={progress.ready === progress.total ? "success" : "neutral"}>{progress.ready}/{progress.total} prontas</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {saveState && <SaveIndicator state={saveState} />}
            {(onUndo || onRedo) && (
              <div className="flex items-center gap-1">
                <button aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={onUndo} className="rounded-lg p-1.5 text-studio-text-secondary hover:bg-white/[.06] hover:text-studio-text disabled:opacity-30 disabled:hover:bg-transparent transition-colors">↶</button>
                <button aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo} className="rounded-lg p-1.5 text-studio-text-secondary hover:bg-white/[.06] hover:text-studio-text disabled:opacity-30 disabled:hover:bg-transparent transition-colors">↷</button>
              </div>
            )}
            <Link to="/studio/blueprint" className="text-sm font-medium text-studio-text-secondary hover:text-studio-text transition-colors">Blueprint</Link>
            {/* Discrete on purpose — Guided is the default experience, Advanced is an escape hatch. */}
            <button onClick={onAdvanced} className="text-sm text-studio-text-muted hover:text-studio-text-secondary transition-colors">Editor avançado</button>
            <UserMenu />
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-6xl"><ProgressBar percent={progress.percent} /></div>
      </header>
      {/* Funnel-level navigation. EXPORTAR RASCUNHO/VÁLIDO used to live here, disconnected from the
          validation context in REVISÃO — the real, validation-aware export actions live only inside
          Revisão now (see ReviewStep below). */}
      <nav className="mx-auto mt-5 flex max-w-6xl gap-1 px-5 md:px-8">
        {(
          [
            { key: "create", label: "Criar", onClick: () => persist("script"), active: step !== "review" },
            { key: "assets", label: "Arquivos", onClick: () => onAssets?.(), active: false },
            { key: "review", label: "Revisar", onClick: () => persist("review"), active: step === "review" },
          ] satisfies { key: string; label: string; onClick: () => void; active: boolean }[]
        ).map(({ key, label, onClick, active }) => (
          <button key={key} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-studio-surface-2 text-studio-text" : "text-studio-text-secondary hover:text-studio-text hover:bg-white/[.04]"}`}>
            {label}
          </button>
        ))}
      </nav>
      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-8 px-5 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside id="studio-scenes" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <Eyebrow>Cenas</Eyebrow>
            <GhostButton
              className="px-2 py-1 text-xs"
              onClick={() => {
                const next = addGuidedScene(funnel);
                onChange(next);
                const created = next.scenes.at(-1)!;
                onUi({ ...ui, mode: "guided", funnelId: funnel.id, sceneId: created.id, step: "script" });
              }}
            >
              + Nova cena
            </GhostButton>
          </div>
          {sceneOrderMismatch(funnel) && (
            <p className="rounded-lg border border-studio-warning/30 bg-studio-warning-soft px-3 py-2 text-xs text-studio-warning">
              A ordem desta lista é diferente da ordem real do funil (siga as setas ↑↓ para corrigir).
            </p>
          )}
          <ol className="space-y-1">
            {funnel.scenes.map((item, index) => {
              const itemStatus = sceneStatus(item, funnel);
              const done = itemStatus.video === "PRONTO" && itemStatus.test === "PRONTO";
              const started = itemStatus.script !== "NÃO INICIADO" || itemStatus.video === "PRONTO";
              const isActive = item.id === scene.id;
              const isRenaming = renamingSceneId === item.id;
              return (
                <li key={item.id} className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !isRenaming && persist("script", item.id)}
                    className={`group flex w-full items-start gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${isActive ? "border-studio-primary bg-studio-primary-soft" : "border-transparent hover:bg-white/[.035]"}`}
                  >
                    <span className="mt-0.5 font-mono text-xs text-studio-text-muted">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {done ? <span className="text-studio-success text-xs">✓</span> : started ? <Dot tone="primary" /> : <Dot />}
                        {isRenaming ? (
                          <input
                            autoFocus
                            value={renameDraft}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setRenameDraft(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(event) => { if (event.key === "Enter") commitRename(); if (event.key === "Escape") setRenamingSceneId(null); }}
                            className="w-full min-w-0 rounded border border-studio-primary/50 bg-white/[.06] px-1.5 py-0.5 text-sm text-studio-text focus:outline-none"
                          />
                        ) : (
                          <p className={`truncate text-sm ${isActive ? "font-semibold text-studio-text" : "text-studio-text-secondary"}`}>{item.title}</p>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-studio-text-muted">{done ? "Pronta" : started ? "Em andamento" : "Não iniciada"}</p>
                    </div>
                    <span className="hidden shrink-0 items-start gap-0.5 group-hover:flex">
                      <span className="flex flex-col gap-0.5">
                        <button aria-label="Mover cena para cima" disabled={index === 0} className="text-studio-text-muted hover:text-studio-text disabled:opacity-30" onClick={(event) => { event.stopPropagation(); onChange(reorderScenes(funnel, index, index - 1)); }}>↑</button>
                        <button aria-label="Mover cena para baixo" disabled={index === funnel.scenes.length - 1} className="text-studio-text-muted hover:text-studio-text disabled:opacity-30" onClick={(event) => { event.stopPropagation(); onChange(reorderScenes(funnel, index, index + 1)); }}>↓</button>
                      </span>
                      <button aria-label="Mais opções desta cena" className="rounded px-1 py-0.5 text-studio-text-muted hover:bg-white/[.08] hover:text-studio-text" onClick={(event) => { event.stopPropagation(); setSceneMenuOpen(sceneMenuOpen === item.id ? null : item.id); }}>•••</button>
                    </span>
                  </div>
                  {sceneMenuOpen === item.id && (
                    <div className="absolute right-2 top-2 z-10 w-36 rounded-lg border border-studio-border bg-studio-surface-2 py-1 shadow-xl">
                      <button
                        onClick={(event) => { event.stopPropagation(); setRenamingSceneId(item.id); setRenameDraft(item.title); setSceneMenuOpen(null); }}
                        className="block w-full px-3 py-1.5 text-left text-xs text-studio-text-secondary hover:bg-white/[.06]"
                      >
                        Renomear
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); onChange(duplicateGuidedScene(funnel, item.id)); setSceneMenuOpen(null); }}
                        className="block w-full px-3 py-1.5 text-left text-xs text-studio-text-secondary hover:bg-white/[.06]"
                      >
                        Duplicar
                      </button>
                      <button
                        disabled={funnel.scenes.length <= 1}
                        title={funnel.scenes.length <= 1 ? "Um funil precisa de ao menos uma cena" : undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          const refs = guidedSceneReferences(funnel, item.id);
                          if (refs.length && !confirm(`Esta cena é usada em ${refs.length} lugar(es):\n${refs.join("\n")}\n\nExcluir mesmo assim?`)) return;
                          onChange(deleteGuidedScene(funnel, item.id));
                          setSceneMenuOpen(null);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-xs text-studio-error hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </aside>
        <section className="space-y-6 pb-16">
          <Card className="p-4">
            <Eyebrow>Próximo passo</Eyebrow>
            <p className="mt-1 text-base text-studio-text">{nextGuidedStep(scene, funnel)}</p>
          </Card>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
            <Stepper steps={steps.map((item) => ({ id: item, label: labels[item], state: stepState(item) }))} current={step} onSelect={(id) => persist(id as Step)} />
            <div className="min-w-0 space-y-5">
              {step === "script" && <Script scene={scene} update={update} />}
              {step === "production" && <Production scene={scene} update={update} />}
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
              )}
              {step === "interactivity" && (
                <div className="space-y-6">
                  <GuidedEssentialInteractions funnel={funnel} scene={scene} urls={urls} onChange={onChange} onAttachAsset={() => onAttachPreview()} onAttachPreviewFile={onAttachPreviewFile} focusEventId={ui.eventId} onFocusHandled={clearFocusEventId} />
                  <GuidedComplexInteractions funnel={funnel} scene={scene} urls={urls} onChange={onChange} onAttachAsset={() => onAttachPreview()} onAttachPreviewFile={onAttachPreviewFile} focusEventId={ui.eventId} onFocusHandled={clearFocusEventId} />
                </div>
              )}
              {step === "test" && <TestStep funnel={funnel} scene={scene} urls={urls} onTested={() => onChange(markSceneTested(funnel, scene.id))} />}
              {step === "review" && <ReviewStep funnel={funnel} urls={urls} onUi={onUi} onChange={onChange} />}
              {step !== "review" && (
                <footer className="flex justify-between border-t border-studio-border pt-5">
                  <SecondaryButton onClick={() => persist(steps[Math.max(0, steps.indexOf(step as (typeof steps)[number]) - 1)]!)}>Voltar</SecondaryButton>
                  <PrimaryButton onClick={() => persist(steps[Math.min(steps.length - 1, steps.indexOf(step as (typeof steps)[number]) + 1)]!)}>Continuar</PrimaryButton>
                </footer>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
const fieldClass = "w-full rounded-lg border border-studio-border bg-white/[.03] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none transition-colors";
function Script({ scene, update }: { scene: any; update: (patch: any) => void }) {
  const guided = scene.guided || {};
  const script = guided.script || {};
  const [details, setDetails] = useState(false);
  const set = (key: string, value: string) =>
    update({ guided: { ...guided, script: { ...script, [key]: value } } });
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Roteiro da cena</SectionTitle>
        <HelpText className="mt-1">O que acontece nesta cena?</HelpText>
      </div>
      <input value={scene.title} onChange={(e) => update({ title: e.target.value })} placeholder="Nome da cena" className={`${fieldClass} text-base font-medium`} />
      <textarea value={script.happens || ""} onChange={(e) => set("happens", e.target.value)} placeholder="Descreva o que acontece, em poucas frases." rows={5} className={fieldClass} />
      <button onClick={() => setDetails(!details)} className="text-sm font-medium text-studio-text-secondary hover:text-studio-text transition-colors">
        {details ? "Ocultar detalhes" : "+ Adicionar objetivo, personagens e falas"}
      </button>
      {details && (
        <div className="space-y-4 rounded-xl border border-studio-border bg-white/[.02] p-4">
          <Field label="Objetivo"><input value={guided.objective || ""} onChange={(e) => update({ guided: { ...guided, objective: e.target.value } })} placeholder="O que essa cena precisa comunicar?" className={fieldClass} /></Field>
          <Field label="Personagens"><input value={script.who || ""} onChange={(e) => set("who", e.target.value)} placeholder="Quem aparece?" className={fieldClass} /></Field>
          <Field label="Falas"><textarea value={script.dialogue || ""} onChange={(e) => set("dialogue", e.target.value)} placeholder="O que é dito?" rows={3} className={fieldClass} /></Field>
          <Field label="Observações"><textarea value={script.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Observações" rows={2} className={fieldClass} /></Field>
        </div>
      )}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">{label}</span>
      {children}
    </label>
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
  const { message, show } = useToast();
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Produzir esta cena</SectionTitle>
        <span className="text-sm text-studio-text-muted">Passo {Math.min(activeIndex + 1, guide.steps.length)} de {guide.steps.length}</span>
      </div>
      <div className="space-y-2">
        {guide.steps.map((item: any, index: number) => {
          const open = index === activeIndex;
          return (
            <Card key={item.id} className={open ? "border-studio-primary/40 bg-studio-primary-soft/40 p-4" : "p-3"}>
              <div className="flex items-center gap-3">
                {item.completed ? <span className="text-studio-success">✓</span> : open ? <Dot tone="primary" /> : <Dot />}
                <span className={`text-sm font-semibold ${open ? "text-studio-text" : "text-studio-text-muted"}`}>{item.title}</span>
              </div>
              {open && (
                <div className="mt-4 space-y-3">
                  <HelpText>{item.instructions}</HelpText>
                  {item.prompt !== undefined && (
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Prompt{item.tool ? ` para ${item.tool}` : ""}</span>
                      <textarea
                        value={item.prompt || ""}
                        onChange={(e) => save(guide.steps.map((step: any, i: number) => (i === index ? { ...step, prompt: e.target.value } : step)))}
                        rows={4}
                        className={fieldClass}
                      />
                      <div className="mt-2 flex gap-2">
                        <SecondaryButton onClick={() => { navigator.clipboard?.writeText(item.prompt || ""); show("Copiado ✓"); }} className="text-xs">Copiar prompt</SecondaryButton>
                      </div>
                    </div>
                  )}
                  {item.type === "VIDEO_ANIMATION" && (
                    <div className="space-y-2 pt-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Takes</span>
                      {item.takes.map((take: any, takeIndex: number) => (
                        <TakeCard
                          key={take.id}
                          take={take}
                          index={takeIndex}
                          onToggle={() => save(guide.steps.map((step: any, i: number) => (i === index ? { ...step, takes: step.takes.map((t: any) => (t.id === take.id ? { ...t, completed: !t.completed } : t)) } : step)))}
                        />
                      ))}
                      <SecondaryButton
                        className="text-xs"
                        onClick={() => save(guide.steps.map((step: any, i: number) => (i === index ? { ...step, takes: [...step.takes, { id: uid("take"), title: "Novo take", completed: false }] } : step)))}
                      >
                        + Adicionar take
                      </SecondaryButton>
                    </div>
                  )}
                  <label className="flex items-center gap-2 pt-1 text-sm text-studio-text-secondary">
                    <input type="checkbox" checked={item.completed} onChange={(e) => save(guide.steps.map((step: any, i: number) => (i === index ? { ...step, completed: e.target.checked } : step)))} />
                    Marcar como concluído
                  </label>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Toast message={message} />
    </div>
  );
}
function TakeCard({ take, index, onToggle }: { take: any; index: number; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-studio-border bg-white/[.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] text-studio-text-muted">TAKE {String(index + 1).padStart(2, "0")}</span>
          <p className="mt-0.5 text-sm font-medium text-studio-text">{take.title}</p>
          {take.objective && <p className="mt-1 text-xs text-studio-text-muted">{take.objective}</p>}
        </div>
        <button onClick={onToggle} className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${take.completed ? "bg-studio-success-soft text-studio-success" : "bg-white/[.06] text-studio-text-muted"}`}>
          {take.completed ? "✓ Feito" : "Pendente"}
        </button>
      </div>
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
  update: (p: any, funnelOverride?: FunnelDefinition) => void;
  urls: Record<string, string>;
  onAttachPreview: (assetId?: string, sceneId?: string) => void;
  onAttachPreviewFile: (file: File, assetId?: string, sceneId?: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>Vídeo da cena</SectionTitle>
        <HelpText className="mt-1">Adicione o vídeo final desta cena.</HelpText>
      </div>
      {asset ? (
        asset.source === "preview" && !urls[asset.id] ? (
          <EmptyState title={`Arquivo local perdido: ${asset.fileName}`} description="Reanexe o arquivo para continuar vendo o preview." action={<SecondaryButton onClick={() => onAttachPreview(asset.id, scene.id)}>Reanexar arquivo</SecondaryButton>} />
        ) : (
          <div className="space-y-3">
            <Badge tone="success">✓ Vídeo adicionado</Badge>
            <GuidedPreview funnel={funnel} scene={scene} urls={urls} onMoment={() => undefined} />
          </div>
        )
      ) : (
        <EmptyState title="Nenhum vídeo adicionado." description="Envie o arquivo final ou escolha um já existente no funil." />
      )}
      <InlineMediaPicker label="Vídeo" mediaType="video" funnel={funnel} urls={urls} value={scene.videoAssetId} onSelect={(assetId, override) => update({ videoAssetId: assetId }, override)} onChange={onChange} onAttachPreview={(file, assetId) => onAttachPreviewFile(file, assetId, scene.id)} />
    </div>
  );
}
function TestStep({ funnel, scene, urls, onTested }: { funnel: FunnelDefinition; scene: any; urls: Record<string, string>; onTested: () => void }) {
  const tested = scene.guided?.tested;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Teste esta cena</SectionTitle>
          <HelpText className="mt-1">Use o preview abaixo para executar o vídeo real e testar as interações.</HelpText>
        </div>
        <Badge tone={tested ? "success" : "warning"}>{tested ? "Testada" : "Não testada"}</Badge>
      </div>
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
    onUi({ mode: "guided", funnelId: funnel.id, ...(target.sceneId ? { sceneId: target.sceneId } : {}), ...(target.eventId ? { eventId: target.eventId } : {}), step: target.step });
  };
  const totalIssues = summary.errors.length + summary.warnings.length;
  if (testing)
    return (
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <SectionTitle>Testar experiência completa</SectionTitle>
          <SecondaryButton onClick={() => setTesting(false)}>Sair do teste</SecondaryButton>
        </header>
        <GuidedPreview funnel={funnel} scene={funnel.scenes.find((scene) => scene.id === funnel.entrySceneId) || funnel.scenes[0]!} urls={urls} />
      </section>
    );
  return (
    <section className="space-y-5">
      <div>
        <SectionTitle>Revisão do funil</SectionTitle>
        <HelpText className="mt-1">{globalNextStep(funnel)}</HelpText>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ReviewCard title="Estrutura" ready={funnel.scenes.length > 0 && !summary.errors.some((issue) => issue.title.includes("Conexão") || issue.title.includes("Cena"))} text={`${funnel.scenes.length} cenas configuradas`} />
        <ReviewCard title="Vídeos" ready={summary.videos === funnel.scenes.length} text={`${summary.videos}/${funnel.scenes.length} vídeos configurados`} />
        <ReviewCard title="Interações" ready text={`${summary.interactions} interações`} />
        <ReviewCard title="Arquivos" ready={!summary.errors.some((issue) => issue.title.includes("Arquivo"))} text={`${funnel.assets.length} arquivos`} />
        <ReviewCard title="Testes" ready={summary.warnings.length === 0} text={`${summary.tested}/${funnel.scenes.length} cenas testadas`} />
        <ReviewCard title="Conexões" ready={!summary.errors.some((issue) => issue.title.includes("Conexão"))} text={funnel.scenes.map((scene) => scene.nextSceneId ? `${scene.title} ↓ ${funnel.scenes.find((item) => item.id === scene.nextSceneId)?.title || "?"}` : scene.title).join(" · ")} />
      </div>
      {totalIssues > 0 ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <SectionTitle className="text-base">Faltam {totalIssues} coisa{totalIssues === 1 ? "" : "s"} para ficar pronta</SectionTitle>
          </div>
          <div className="mt-3 divide-y divide-studio-border">
            {summary.issues.map((issue) => (
              <div className="flex items-center justify-between gap-3 py-2.5" key={issue.id}>
                <span className="flex items-center gap-2 text-sm text-studio-text-secondary">
                  <Badge tone={issue.severity === "error" ? "error" : "warning"}>{issue.severity === "error" ? "Erro" : "Atenção"}</Badge>
                  {issue.message}
                </span>
                <GhostButton onClick={() => fix(issue)} className="shrink-0 text-studio-primary-strong">Corrigir</GhostButton>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="border-studio-success/30 bg-studio-success-soft p-5">
          <p className="font-semibold text-studio-success">Sua experiência está pronta ✓</p>
          <HelpText className="mt-1">{funnel.title} · {funnel.scenes.length} cenas · {summary.interactions} interações · {summary.videos} vídeos · {funnel.assets.length} arquivos</HelpText>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => setTesting(true)}>▶ Testar experiência completa</PrimaryButton>
        <SecondaryButton onClick={() => download("draft")}>Exportar rascunho</SecondaryButton>
        <SecondaryButton disabled={summary.errors.length > 0} onClick={() => download("valid")}>Exportar projeto válido</SecondaryButton>
        <GhostButton disabled>Exportar para publicação — em breve</GhostButton>
      </div>
      {exported && <HelpText>Projeto exportado ✓ Na próxima etapa, este arquivo poderá virar um pacote para publicação na Cloudflare.</HelpText>}
    </section>
  );
}
function ReviewCard({ title, ready, text }: { title: string; ready: boolean; text: string }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-studio-text">{title}</span>
        <Badge tone={ready ? "success" : "warning"}>{ready ? "Pronto" : "Atenção"}</Badge>
      </div>
      <p className="mt-1.5 text-xs text-studio-text-muted">{text}</p>
    </Card>
  );
}

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
    <main className="min-h-screen bg-studio-bg text-studio-text p-8">
      <div className="max-w-4xl mx-auto">
        <PageTitle className="text-4xl">Funnel Studio</PageTitle>
        <HelpText className="mt-2 text-base">Crie experiências interativas sem precisar programar.</HelpText>
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          <button className="text-left p-7 rounded-2xl bg-studio-primary text-white transition-colors hover:bg-studio-primary-strong" onClick={onGuided}>
            <span className="block text-lg font-semibold">Criação guiada</span>
            <span className="block mt-1.5 text-sm text-white/80">Recomendado. Monte sua experiência passo a passo.</span>
          </button>
          <button className="text-left p-7 rounded-2xl border border-studio-border bg-studio-surface transition-colors hover:border-studio-border-strong" onClick={onAdvanced}>
            <span className="block text-lg font-semibold text-studio-text">Editor avançado</span>
            <span className="block mt-1.5 text-sm text-studio-text-muted">Controle cenas, timeline, eventos, triggers e ações.</span>
          </button>
        </div>
        <div className="mt-10 flex items-center justify-between">
          <SectionTitle className="text-xl">Meus funis</SectionTitle>
          <SecondaryButton onClick={() => setWizard(true)}>+ Nova experiência</SecondaryButton>
        </div>
        <div className="mt-3 grid gap-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-studio-text">{project.title}</p>
                <HelpText className="mt-0.5">
                  {project.id === funnel.id
                    ? `${funnel.scenes.length} cenas · ${progress.percent}% concluído`
                    : "Projeto salvo"}
                </HelpText>
              </div>
              <PrimaryButton onClick={onGuided}>Continuar</PrimaryButton>
            </Card>
          ))}
        </div>
      </div>
      {wizard && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-studio-surface-2 p-6 grid gap-4">
            <SectionTitle>O que você quer criar?</SectionTitle>
            <StudioSelect
              clearable={false}
              value={type}
              onChange={(next) => setType(next as typeof type)}
              options={[
                { value: "story", label: "História Interativa" },
                { value: "vsl", label: "VSL Interativa" },
                { value: "quiz", label: "Quiz / Diagnóstico" },
                { value: "gamified", label: "Funil Gamificado" },
                { value: "training", label: "Treinamento Interativo" },
                { value: "blank", label: "Começar do Zero" },
              ]}
            />
            <SectionTitle className="text-base">Como vamos chamar sua experiência?</SectionTitle>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome" className={fieldClass} />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional"
              className={fieldClass}
            />
            <SectionTitle className="text-base">Como você quer começar?</SectionTitle>
            <StudioSelect
              clearable={false}
              value={structure}
              onChange={(next) => setStructure(next as typeof structure)}
              options={[
                { value: "one", label: "Criar primeira cena" },
                { value: "three", label: "Criar estrutura com 3 cenas" },
                { value: "empty", label: "Começar vazio" },
              ]}
            />
            <div className="flex justify-between pt-2">
              <SecondaryButton onClick={() => setWizard(false)}>Voltar</SecondaryButton>
              <PrimaryButton
                disabled={!title.trim()}
                onClick={() => {
                  onNew(createGuidedFunnel(type, title, description, structure));
                  setWizard(false);
                }}
              >
                Continuar
              </PrimaryButton>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
