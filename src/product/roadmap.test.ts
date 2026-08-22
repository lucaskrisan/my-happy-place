import { describe, expect, it } from "vitest";
import { ROADMAP, type RoadmapStatus } from "./roadmap";

const VALID_STATUS: RoadmapStatus[] = ["DONE", "IN_PROGRESS", "NEXT", "TODO", "BLOCKED", "PAUSED"];

describe("roadmap integrity", () => {
  it("has unique task ids", () => {
    const ids = ROADMAP.tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique phase ids", () => {
    const ids = ROADMAP.phases.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every task references a real phase", () => {
    const phaseIds = new Set(ROADMAP.phases.map((p) => p.id));
    for (const t of ROADMAP.tasks) {
      expect(phaseIds.has(t.phaseId), `${t.id} references unknown phase "${t.phaseId}"`).toBe(true);
    }
  });

  it("every dependency points at a real task", () => {
    const taskIds = new Set(ROADMAP.tasks.map((t) => t.id));
    for (const t of ROADMAP.tasks) {
      for (const dep of t.dependencies) {
        expect(taskIds.has(dep), `${t.id} depends on unknown task "${dep}"`).toBe(true);
      }
    }
  });

  it("every task has a valid status", () => {
    for (const t of ROADMAP.tasks) {
      expect(VALID_STATUS.includes(t.status), `${t.id} has invalid status "${t.status}"`).toBe(true);
    }
  });

  it("a DONE task never depends on a task that is still TODO or BLOCKED", () => {
    const byId = new Map(ROADMAP.tasks.map((t) => [t.id, t]));
    for (const t of ROADMAP.tasks) {
      if (t.status !== "DONE") continue;
      for (const depId of t.dependencies) {
        const dep = byId.get(depId);
        if (!dep) continue;
        expect(
          dep.status === "TODO" || dep.status === "BLOCKED",
          `${t.id} is DONE but depends on "${depId}" which is still ${dep.status}`,
        ).toBe(false);
      }
    }
  });

  it("EXTERNAL-scope tasks are excluded from CORE progress counting", () => {
    const external = ROADMAP.tasks.filter((t) => t.scope === "EXTERNAL");
    expect(external.length).toBeGreaterThan(0);
    // sanity: the marketing-site task specifically must be scoped EXTERNAL, per the registered architecture decision
    const marketing = ROADMAP.tasks.find((t) => t.id === "EXTERNAL-001");
    expect(marketing?.scope).toBe("EXTERNAL");
  });

  it("every DONE task has non-empty acceptanceCriteria", () => {
    for (const t of ROADMAP.tasks) {
      if (t.status !== "DONE") continue;
      expect(t.acceptanceCriteria.length, `${t.id} is DONE but has no acceptanceCriteria`).toBeGreaterThan(0);
    }
  });

  it("no task id is reused across phases", () => {
    const seen = new Map<string, string>();
    for (const t of ROADMAP.tasks) {
      expect(seen.has(t.id)).toBe(false);
      seen.set(t.id, t.phaseId);
    }
  });
});
