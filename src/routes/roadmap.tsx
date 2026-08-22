import { createFileRoute } from "@tanstack/react-router";
import { toPublicRoadmap, type PublicRoadmapTask } from "@/product/publicRoadmap";
import { Badge, HelpText, type Tone } from "@/funnel/studio/ui";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — Funnel Studio" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Acompanhe a evolução do Funnel Studio." },
    ],
  }),
  component: PublicRoadmapPage,
});

const STATUS_TONE: Record<PublicRoadmapTask["status"], Tone> = {
  DONE: "success",
  IN_PROGRESS: "primary",
  NEXT: "primary",
  TODO: "neutral",
  BLOCKED: "error",
  PAUSED: "warning",
};
const STATUS_LABEL: Record<PublicRoadmapTask["status"], string> = {
  DONE: "pronto",
  IN_PROGRESS: "em construção",
  NEXT: "próximo",
  TODO: "planejado",
  BLOCKED: "pausado",
  PAUSED: "pausado",
};

function PublicRoadmapPage() {
  const roadmap = toPublicRoadmap();
  const currentPhase = roadmap.phases.find((p) => p.id === roadmap.currentPhaseId);
  const nextPhases = roadmap.phases
    .filter((p) => p.id !== roadmap.currentPhaseId && p.total > 0 && p.done < p.total)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-studio-bg text-studio-text">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-studio-primary">Roadmap do produto</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-studio-text text-balance">{roadmap.productName}</h1>
        <p className="mt-2 text-lg text-studio-text-secondary">{roadmap.tagline}</p>
        <p className="mt-4 text-sm italic text-studio-text-muted">"{roadmap.conceptMessage}"</p>

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-studio-border bg-studio-surface p-5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.08]">
            <div
              className="h-full rounded-full bg-studio-primary transition-all"
              style={{ width: `${roadmap.coreTotal ? Math.round((roadmap.coreDone / roadmap.coreTotal) * 100) : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-medium text-studio-text-secondary">{roadmap.coreDone}/{roadmap.coreTotal} concluído</span>
        </div>
        {currentPhase && <HelpText className="mt-2">Fase atual: {currentPhase.name}</HelpText>}

        {roadmap.now.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-studio-text">Agora</h2>
            <div className="mt-3 grid gap-2">
              {roadmap.now.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-studio-border bg-studio-surface px-4 py-3">
                  <p className="text-sm font-medium text-studio-text">{task.title}</p>
                  <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {nextPhases.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-studio-text">Próximo</h2>
            <div className="mt-3 grid gap-2">
              {nextPhases.map((phase) => (
                <div key={phase.id} className="rounded-xl border border-studio-border bg-studio-surface px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-studio-text">{phase.name}</p>
                    <span className="text-xs text-studio-text-muted">{phase.done}/{phase.total}</span>
                  </div>
                  <p className="mt-1 text-sm text-studio-text-muted">{phase.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-16 text-center text-xs text-studio-text-muted">Última atualização automática a cada nova entrega.</p>
      </section>
    </main>
  );
}
