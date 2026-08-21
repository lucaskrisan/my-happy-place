import { describe, expect, it } from "vitest";
import {
  buildSceneCards,
  funnelHealth,
  summaryCounts,
  checkpointsFor,
  blueprintNavTargets,
  editorAvancadoTarget,
  ADVANCED_EDITOR_ROUTE,
  SCENE_CHECKPOINTS,
  PLANNED_PRODUCTION,
} from "../studio/blueprintData";
import { marinaOfficialFunnel } from "../definitions/marinaOfficialFunnel";
import { marinaProofFunnel } from "../definitions/marinaProofs";
import { STORY_MAP } from "@/dev/story-checkpoints";

describe("Blueprint — derives everything from the official funnel, never a parallel copy", () => {
  it("reads the real official funnel (DESAFIO 14 DIAS / FUNIL PRINCIPAL), not the technical proof", () => {
    expect(marinaOfficialFunnel.title).toBe("FUNIL PRINCIPAL");
    expect(marinaOfficialFunnel.id).not.toBe(marinaProofFunnel.id);
  });

  it("represents all 12 checkpoints across the official scenes", () => {
    const representedIds = new Set(Object.values(SCENE_CHECKPOINTS).flat());
    for (const checkpoint of STORY_MAP) expect(representedIds.has(checkpoint.id)).toBe(true);
  });

  it("shows O Espelho as the last integrated scene", () => {
    const cards = buildSceneCards(marinaOfficialFunnel);
    const last = cards.at(-1)!;
    expect(last.scene.title).toBe("O Espelho");
    expect(last.nextSceneTitle).toBeUndefined();
    const lastCheckpoint = STORY_MAP.at(-1)!;
    expect(lastCheckpoint.title).toBe("O ESPELHO");
  });

  it("marks A Foto Que Nunca É Boa as planned production metadata, not an integrated scene", () => {
    expect(PLANNED_PRODUCTION.title).toBe("A Foto Que Nunca É Boa");
    expect(PLANNED_PRODUCTION.status).toBe("planejada");
    const titles = marinaOfficialFunnel.scenes.map((scene) => scene.title);
    expect(titles).not.toContain(PLANNED_PRODUCTION.title);
    const ids = marinaOfficialFunnel.scenes.map((scene) => scene.id);
    expect(ids.some((id) => id.includes("foto"))).toBe(false);
  });

  it("computes health from the real validator, not decorative status", () => {
    const health = funnelHealth(marinaOfficialFunnel);
    // Reachability, assets and validator issues are all clean on the static definition; "tested" is
    // legitimately not ok yet, since testing only happens by clicking through the Guided Builder.
    expect(health.find((item) => item.label.includes("alcançáveis"))?.ok).toBe(true);
    expect(health.find((item) => item.label.includes("validator sem erros"))?.ok).toBe(true);
    expect(health.find((item) => item.label.includes("preview"))?.ok).toBe(true);
    const brokenFunnel = { ...marinaOfficialFunnel, entrySceneId: "does-not-exist" };
    const brokenHealth = funnelHealth(brokenFunnel);
    expect(brokenHealth.some((item) => !item.ok)).toBe(true);
  });

  it("confirms the technical proof is flagged separate from the official funnel", () => {
    const health = funnelHealth(marinaOfficialFunnel);
    const proofItem = health.find((item) => item.label.includes("proof técnico"));
    expect(proofItem?.ok).toBe(true);
    const proofHealth = funnelHealth(marinaProofFunnel);
    expect(proofHealth.find((item) => item.label.includes("proof técnico"))?.ok).toBe(false);
  });

  it("summarizes counts that add up to the real scene total", () => {
    const counts = summaryCounts(marinaOfficialFunnel);
    expect(counts.scenes).toBe(marinaOfficialFunnel.scenes.length);
    expect(counts.ready + counts.inProgress + counts.notStarted).toBe(counts.scenes);
  });

  it("resolves checkpointsFor a scene using STORY_MAP data, not invented labels", () => {
    const checkpoints = checkpointsFor("scene-01-a-porta");
    expect(checkpoints[0]?.title).toBe("A PORTA");
  });

  it("resolves the primary navigation links back into Studio's own existing view/UI shapes", () => {
    const targets = blueprintNavTargets(marinaOfficialFunnel, "product-desafio-14-dias");
    expect(targets.funil.view).toEqual({ kind: "funnel", productId: "product-desafio-14-dias", funnelId: marinaOfficialFunnel.id });
    expect(targets.funil.ui.step).toBe("script");
    expect(targets.revisao.ui.step).toBe("review");
    expect(targets.arquivos.view.funnelId).toBe(marinaOfficialFunnel.id);
  });

  it("sends 'Editor Avançado' to the dedicated Advanced Editor route, since /studio always forces Guided mode", () => {
    expect(ADVANCED_EDITOR_ROUTE).toBe("/dev/funnel-studio");
    expect(editorAvancadoTarget(marinaOfficialFunnel)).toEqual({ mode: "advanced", funnelId: marinaOfficialFunnel.id });
  });
});
