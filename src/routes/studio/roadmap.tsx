import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { useProfile } from "@/lib/supabase/useProfile";
import { PageTitle, SectionTitle, Eyebrow, HelpText, Card, Breadcrumb, Badge, type Tone } from "@/funnel/studio/ui";
import { UserMenu } from "@/funnel/studio/UserMenu";
import { ROADMAP, tasksByPhase, phaseProgress, nowTasks, coreProgress, currentPhase, type RoadmapStatus, type RoadmapTask } from "@/product/roadmap";

export const Route = createFileRoute("/studio/roadmap")({ component: InternalRoadmapPage });

const STATUS_TONE: Record<RoadmapStatus, Tone> = {
  DONE: "success",
  IN_PROGRESS: "primary",
  NEXT: "primary",
  TODO: "neutral",
  BLOCKED: "error",
  PAUSED: "warning",
};
const STATUS_LABEL: Record<RoadmapStatus, string> = {
  DONE: "concluído",
  IN_PROGRESS: "em andamento",
  NEXT: "próximo",
  TODO: "a fazer",
  BLOCKED: "bloqueado",
  PAUSED: "pausado",
};

type Filter = "TODOS" | "AGORA" | "PROXIMOS" | "CONCLUIDOS" | "BLOQUEADOS";

function InternalRoadmapPage() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const userId = session.status === "signed-in" ? session.session.user.id : undefined;
  const profileState = useProfile(userId);
  const isAdmin = profileState.status === "ready" && profileState.profile?.role === "admin";

  useEffect(() => {
    if (session.status === "signed-out") void navigate({ to: "/login", search: { redirect: "/studio/roadmap" } });
    else if (session.status === "signed-in" && profileState.status === "ready" && profileState.profile && profileState.profile.role !== "admin")
      void navigate({ to: "/studio" });
  }, [session.status, profileState.status, profileState.status === "ready" ? profileState.profile?.role : undefined, navigate]);

  const [filter, setFilter] = useState<Filter>("TODOS");
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const progress = coreProgress();
  const phase = currentPhase();
  const now = nowTasks(3);

  const categories = useMemo(() => Array.from(new Set(ROADMAP.phases.map((p) => p.category))), []);

  const matchesFilter = (task: RoadmapTask) => {
    if (filter === "AGORA") return task.status === "IN_PROGRESS";
    if (filter === "PROXIMOS") return task.status === "NEXT" || task.status === "TODO";
    if (filter === "CONCLUIDOS") return task.status === "DONE";
    if (filter === "BLOQUEADOS") return task.status === "BLOCKED" || task.status === "PAUSED";
    return true;
  };

  if (!isAdmin) {
    return <main className="grid min-h-screen place-items-center bg-studio-bg text-studio-text-muted">Carregando…</main>;
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visiblePhases = ROADMAP.phases.filter((p) => !category || p.category === category);

  return (
    <main className="min-h-screen bg-studio-bg text-studio-text">
      <header className="sticky top-0 z-20 border-b border-studio-border bg-studio-bg/90 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Breadcrumb items={[{ label: "Meus produtos", onClick: () => void navigate({ to: "/studio" }) }, { label: "Administração", onClick: () => void navigate({ to: "/studio/admin" }) }, "Roadmap"]} />
          <div className="flex items-center gap-3">
            <Link to="/studio/admin" className="text-sm font-medium text-studio-text-secondary hover:text-studio-text transition-colors">Voltar</Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Eyebrow>Roadmap interno · visão completa</Eyebrow>
        <PageTitle className="mt-3">Roadmap do produto</PageTitle>
        <HelpText className="mt-2">
          Fase atual: <span className="text-studio-text">{phase?.name ?? "—"}</span> · {progress.done}/{progress.total} tarefas core concluídas
        </HelpText>

        <div className="mt-6">
          <SectionTitle>Agora</SectionTitle>
          <div className="mt-3 grid gap-2">
            {now.length === 0 && <HelpText>Nenhuma tarefa em andamento no momento.</HelpText>}
            {now.map((task) => <TaskCard key={task.id} task={task} expanded={expanded.has(task.id)} onToggle={() => toggle(task.id)} />)}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          {(["TODOS", "AGORA", "PROXIMOS", "CONCLUIDOS", "BLOQUEADOS"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${filter === f ? "bg-studio-primary text-white" : "bg-white/[.06] text-studio-text-secondary hover:bg-white/[.1]"}`}
            >
              {f}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-studio-border" />
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${!category ? "bg-studio-primary-soft text-studio-primary-strong" : "bg-white/[.06] text-studio-text-secondary hover:bg-white/[.1]"}`}
          >
            todas categorias
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${category === c ? "bg-studio-primary-soft text-studio-primary-strong" : "bg-white/[.06] text-studio-text-secondary hover:bg-white/[.1]"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8">
          {visiblePhases.map((p) => {
            const tasks = tasksByPhase(p.id).filter(matchesFilter);
            if (!tasks.length) return null;
            const prog = phaseProgress(p.id);
            return (
              <div key={p.id}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <SectionTitle>{p.name}</SectionTitle>
                    <HelpText className="mt-0.5">{p.description}</HelpText>
                  </div>
                  <Badge tone="neutral">{prog.done}/{prog.total}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {tasks.map((task) => <TaskCard key={task.id} task={task} expanded={expanded.has(task.id)} onToggle={() => toggle(task.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function TaskCard({ task, expanded, onToggle }: { task: RoadmapTask; expanded: boolean; onToggle: () => void }) {
  return (
    <Card className="p-4">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-sm font-medium text-studio-text">{task.id} · {task.title}</p>
          {task.dependencies.length > 0 && (
            <p className="mt-0.5 text-xs text-studio-text-muted">depende de: {task.dependencies.join(", ")}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={task.scope === "EXTERNAL" ? "warning" : "neutral"}>{task.scope}</Badge>
          <Badge tone="neutral">{task.priority}</Badge>
          <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
        </div>
      </button>
      {expanded && (
        <div className="mt-3 grid gap-2 border-t border-studio-border pt-3 text-sm text-studio-text-secondary">
          <p>{task.description}</p>
          {task.acceptanceCriteria.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-studio-text-muted">Critérios de aceite</p>
              <ul className="mt-1 list-inside list-disc">
                {task.acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {task.internalNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-studio-text-muted">Notas internas</p>
              <p>{task.internalNotes}</p>
            </div>
          )}
          {(task.evidence.commit || task.evidence.tests || task.evidence.build || task.evidence.deployStatus || task.evidence.notes) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-studio-text-muted">Evidência</p>
              <ul className="mt-1 grid gap-0.5 text-xs text-studio-text-muted">
                {task.evidence.commit && <li>commit: {task.evidence.commit}</li>}
                {task.evidence.tests && <li>testes: {task.evidence.tests}</li>}
                {task.evidence.typecheck && <li>typecheck: {task.evidence.typecheck}</li>}
                {task.evidence.build && <li>build: {task.evidence.build}</li>}
                {task.evidence.deployStatus && <li>deploy: {task.evidence.deployStatus}</li>}
                {task.evidence.deployUrl && <li>url: {task.evidence.deployUrl}</li>}
                {task.evidence.notes && <li>{task.evidence.notes}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
