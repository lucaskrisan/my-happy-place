import { describe, expect, it } from "vitest";
import { marinaOfficialFunnel } from "../definitions/marinaOfficialFunnel";
import { marinaProofFunnel } from "../definitions/marinaProofs";
import { validateFunnel } from "../validator/validateFunnel";

const findScene = (id: string) => marinaOfficialFunnel.scenes.find((scene) => scene.id === id);
const eventsOf = (sceneId: string) => findScene(sceneId)?.events ?? [];

describe("Marina official funnel (FUNIL PRINCIPAL)", () => {
  it("exists, is titled correctly and is not the technical runtime proof", () => {
    expect(marinaOfficialFunnel.id).not.toBe(marinaProofFunnel.id);
    expect(marinaOfficialFunnel.title).toBe("FUNIL PRINCIPAL");
    expect(marinaOfficialFunnel.guided?.description).toBe("Experiência interativa da Marina");
  });

  it("starts at A Porta, the real entry point of the experience", () => {
    expect(marinaOfficialFunnel.entrySceneId).toBe("scene-01-a-porta");
    expect(findScene(marinaOfficialFunnel.entrySceneId)).toBeDefined();
  });

  it("passes the validator with no blocking issues", () => {
    const issues = validateFunnel(marinaOfficialFunnel);
    expect(issues).toEqual([]);
  });

  it("keeps every scene up to O Espelho reachable from the entry scene", () => {
    const issues = validateFunnel(marinaOfficialFunnel);
    expect(issues.some((issue) => issue.code === "scene_unreachable")).toBe(false);
    // 4 scenes for checkpoints 01+02, then one scene per remaining checkpoint through O Espelho.
    expect(marinaOfficialFunnel.scenes).toHaveLength(10);
  });

  it("references only assets that are actually declared", () => {
    const issues = validateFunnel(marinaOfficialFunnel);
    expect(issues.some((issue) => issue.code === "asset_missing")).toBe(false);
    expect(marinaOfficialFunnel.assets.every((asset) => asset.source === "permanent")).toBe(true);
  });

  it("represents the dinner scene with its prediction quiz and the mamãe notification", () => {
    const events = eventsOf("scene-02-jantar");
    const quiz = events.find((event) => event.block === "quiz");
    const notification = events.find((event) => event.block === "notification");
    expect(quiz && quiz.block === "quiz" ? quiz.trigger : undefined).toEqual({ kind: "TIME", seconds: 19 });
    expect(notification && notification.block === "notification" ? notification.senderName : undefined).toBe("Mamãe");
  });

  it("represents the WhatsApp beat as a voice_once message inside Lúcia's audio scene", () => {
    const messaging = eventsOf("scene-02-lucia-audio").find((event) => event.block === "messaging");
    expect(messaging && messaging.block === "messaging" ? messaging.messages.map((m) => m.type) : []).toEqual(["text", "voice_once"]);
  });

  it("represents Outro Dia leading into A Consequência and its 'Agora é Sobre Você' quiz", () => {
    expect(findScene("scene-03-outro-dia")?.nextSceneId).toBe("scene-03-consequencia");
    const quiz = eventsOf("scene-03-consequencia").find((event) => event.block === "quiz");
    expect(quiz && quiz.block === "quiz" ? quiz.questions[0]?.options.map((o) => o.value) : []).toEqual([
      "self_erasure",
      "avoidance",
      "hypervigilance",
      "assertive",
    ]);
  });

  it("represents the Marina do Futuro call", () => {
    const call = eventsOf("scene-04-marina-futuro").find((event) => event.block === "incoming_call");
    expect(call && call.block === "incoming_call" ? call.callerName : undefined).toBe("Marina");
  });

  it("represents O Espelho with its closing quiz and marks the real end of production", () => {
    const scene = findScene("scene-05-espelho");
    expect(scene?.nextSceneId).toBeUndefined();
    const quiz = eventsOf("scene-05-espelho").find((event) => event.block === "quiz");
    expect(quiz?.actions).toEqual([{ type: "COMPLETE_SCENE" }]);
  });
});
