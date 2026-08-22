import { ROADMAP, coreProgress, currentPhase, nowTasks, type RoadmapTask } from "./roadmap";

/**
 * The only bridge between the internal roadmap data and anything sent to a browser at /roadmap.
 * Allowlist, not a blocklist: every field below is named explicitly, so a new field added to
 * RoadmapTask/RoadmapEvidence in the future is private by default until someone deliberately adds it
 * here — never leaked by accident. See docs/ROADMAP_PROTOCOL.md §Public sanitization.
 */

export type PublicRoadmapTask = {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  status: RoadmapTask["status"];
  priority: RoadmapTask["priority"];
};

export type PublicRoadmapPhase = {
  id: string;
  name: string;
  description: string;
  category: string;
  done: number;
  total: number;
};

export type PublicRoadmap = {
  productName: string;
  tagline: string;
  category: string;
  conceptMessage: string;
  coreDone: number;
  coreTotal: number;
  currentPhaseId: string | null;
  now: PublicRoadmapTask[];
  phases: PublicRoadmapPhase[];
  tasks: PublicRoadmapTask[];
};

function toPublicTask(t: RoadmapTask): PublicRoadmapTask {
  return {
    id: t.id,
    phaseId: t.phaseId,
    title: t.title,
    // Prefer the public-facing description when the author wrote one; never fall back to internalNotes.
    description: t.publicDescription ?? t.description,
    status: t.status,
    priority: t.priority,
  };
}

export function toPublicRoadmap(): PublicRoadmap {
  const core = coreProgress();
  const phase = currentPhase();
  return {
    productName: ROADMAP.productName,
    tagline: ROADMAP.tagline,
    category: ROADMAP.category,
    conceptMessage: ROADMAP.conceptMessage,
    coreDone: core.done,
    coreTotal: core.total,
    currentPhaseId: phase?.id ?? null,
    now: nowTasks(3).map(toPublicTask),
    phases: ROADMAP.phases.map((p) => {
      const tasksInPhase = ROADMAP.tasks.filter((t) => t.phaseId === p.id && t.scope === "CORE");
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        done: tasksInPhase.filter((t) => t.status === "DONE").length,
        total: tasksInPhase.length,
      };
    }),
    // EXTERNAL-scope tasks are omitted entirely — they aren't this product's progress to show.
    tasks: ROADMAP.tasks.filter((t) => t.scope === "CORE").map(toPublicTask),
  };
}
