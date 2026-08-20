import { describe, expect, it } from "vitest";
import { emptyFunnel, importFunnel } from "../studio/studioState";
import { createGuidedInteraction, markSceneTested, updateGuidedInteraction } from "../studio/guidedState";
import { exportGuidedProject, finalizationChecklist, globalNextStep, goToIssue, humanizeValidationIssue, reviewSummary } from "../studio/guidedReview";

describe("Guided final review", () => {
  it("humanizes validator issues and provides a correction destination", () => {
    const issue = humanizeValidationIssue({ code: "quiz_options_empty", message: "raw", path: "events.quiz-1" });
    expect(issue.message).toMatch(/opções/);
    expect(goToIssue(issue).step).toBe("interactivity");
  });
  it("reports missing video as a blocking review issue and untested scene as warning", () => {
    const funnel = emptyFunnel();
    const summary = reviewSummary(funnel);
    expect(summary.errors.some((issue) => issue.suggestedStep === "video")).toBe(true);
    expect(summary.warnings.some((issue) => issue.suggestedStep === "test")).toBe(true);
  });
  it("allows draft export but blocks valid export while local preview or errors exist", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({ id: "local", mediaType: "video", source: "preview", fileName: "scene.mp4", status: "needs_reattach" });
    funnel.scenes[0]!.videoAssetId = "local";
    expect(exportGuidedProject(funnel, "draft").ok).toBe(true);
    expect(exportGuidedProject(funnel, "valid").ok).toBe(false);
  });
  it("exports a valid review-ready project and preserves the funnel payload", () => {
    let funnel = emptyFunnel();
    funnel.assets.push({ id: "video", mediaType: "video", source: "permanent", url: "/video.mp4" });
    funnel.scenes[0]!.videoAssetId = "video";
    funnel = markSceneTested(funnel, funnel.entrySceneId);
    const result = exportGuidedProject(funnel, "valid");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.json).funnel.scenes[0].videoAssetId).toBe("video");
    expect(importFunnel(result.json).funnel?.id).toBe(funnel.id);
  });
  it("builds a complete guided mutation flow that can be reviewed", () => {
    let funnel = emptyFunnel();
    funnel.assets.push({ id: "video", mediaType: "video", source: "permanent", url: "/video.mp4" });
    funnel.scenes[0]!.videoAssetId = "video";
    funnel = createGuidedInteraction(funnel, funnel.entrySceneId, "quiz");
    const quiz = funnel.scenes[0]!.events[0] as any;
    funnel = updateGuidedInteraction(funnel, funnel.entrySceneId, { ...quiz, trigger: { kind: "TIME", seconds: 17.3 }, actions: [{ type: "RESUME_VIDEO" }] });
    funnel = markSceneTested(funnel, funnel.entrySceneId);
    expect(finalizationChecklist(funnel).filter((issue) => issue.severity === "error")).toHaveLength(0);
    expect(globalNextStep(funnel)).toMatch(/prontas/);
  });
});
