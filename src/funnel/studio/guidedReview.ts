import type { FunnelDefinition } from "../schema/v1";
import { validateFunnel, type FunnelValidationIssue } from "../validator/validateFunnel";
import { exportStudioFunnel } from "./studioState";
import { sceneStatus } from "./guidedState";

export type ReviewSeverity = "error" | "warning" | "ready";
export type HumanIssue = { id: string; title: string; message: string; severity: ReviewSeverity; sceneId?: string; eventId?: string; assetId?: string; suggestedStep?: "video" | "interactivity" | "test" | "review" };
const findId = (path: string, prefix: "scene" | "event" | "asset") => path.match(new RegExp(`${prefix}s?\\.([^.]*)`))?.[1];
export function humanizeValidationIssue(issue: FunnelValidationIssue): HumanIssue {
  const sceneId = findId(issue.path, "scene");
  const eventId = findId(issue.path, "event");
  const assetId = findId(issue.path, "asset");
  const map: Record<string, [string, string, HumanIssue["suggestedStep"]]> = {
    entry_scene_missing: ["Cena inicial inválida", "Escolha uma cena inicial existente.", "review"],
    scene_unreachable: ["Cena inacessível", "Esta cena não pode ser alcançada a partir do início.", "review"],
    scene_target_missing: ["Conexão inválida", "Esta cena ou interação aponta para uma cena que não existe.", "interactivity"],
    event_target_missing: ["Interação inválida", "Esta interação aponta para outra interação que não existe.", "interactivity"],
    asset_missing: ["Arquivo ausente", "Falta um arquivo usado nesta cena ou interação.", "video"],
    preview_asset: ["Arquivo local", "Este projeto ainda possui arquivos locais de preview. Use arquivos permanentes antes de exportar.", "video"],
    quiz_empty: ["Quiz incompleto", "Esta pergunta precisa de opções.", "interactivity"],
    quiz_options_empty: ["Quiz incompleto", "Esta pergunta precisa de opções.", "interactivity"],
    choice_empty: ["Escolha incompleta", "Adicione opções para esta escolha.", "interactivity"],
    messaging_empty: ["Conversa incompleta", "Adicione pelo menos uma mensagem.", "interactivity"],
    call_no_exit: ["Ligação sem saída", "Defina o que acontece depois da ligação.", "interactivity"],
    blocking_no_exit: ["Interação sem saída", "Esta interação pode deixar a pessoa presa sem continuar.", "interactivity"],
    time_outside_duration: ["Momento inválido", "Este momento está fora da duração conhecida do vídeo.", "interactivity"],
    before_end_outside_duration: ["Momento inválido", "Este tempo antes do final é maior que o vídeo.", "interactivity"],
  };
  const [title, message, suggestedStep] = map[issue.code] || ["Revise esta configuração", issue.message, "review"];
  return { id: `${issue.code}:${issue.path}`, title, message, severity: "error", ...(sceneId ? { sceneId } : {}), ...(eventId ? { eventId } : {}), ...(assetId ? { assetId } : {}), ...(suggestedStep ? { suggestedStep } : {}) };
}
export function finalizationChecklist(funnel: FunnelDefinition): HumanIssue[] {
  const issues = validateFunnel(funnel).map(humanizeValidationIssue);
  for (const scene of funnel.scenes) {
    if (!scene.videoAssetId) issues.push({ id: `video:${scene.id}`, title: "Vídeo pendente", message: `A cena “${scene.title}” ainda não possui vídeo.`, severity: "error", sceneId: scene.id, suggestedStep: "video" });
    if (sceneStatus(scene, funnel).test !== "PRONTO") issues.push({ id: `test:${scene.id}`, title: "Cena não testada", message: `A cena “${scene.title}” ainda precisa ser testada ou foi alterada depois do último teste.`, severity: "warning", sceneId: scene.id, suggestedStep: "test" });
  }
  return issues;
}
export function reviewSummary(funnel: FunnelDefinition) {
  const issues = finalizationChecklist(funnel);
  const videos = funnel.scenes.filter((scene) => Boolean(scene.videoAssetId)).length;
  const interactions = funnel.scenes.reduce((total, scene) => total + scene.events.length, 0);
  const tested = funnel.scenes.filter((scene) => sceneStatus(scene, funnel).test === "PRONTO").length;
  const readyScenes = funnel.scenes.filter((scene) => {
    const status = sceneStatus(scene, funnel);
    return status.script === "PRONTO" && Boolean(scene.videoAssetId) && status.test === "PRONTO";
  }).length;
  return { issues, errors: issues.filter((issue) => issue.severity === "error"), warnings: issues.filter((issue) => issue.severity === "warning"), videos, interactions, tested, readyScenes };
}
export function globalNextStep(funnel: FunnelDefinition) {
  const summary = reviewSummary(funnel);
  if (summary.errors.length) return summary.errors[0]!.message;
  if (summary.warnings.length) return summary.warnings[0]!.message;
  return "Todas as cenas estão prontas. Revise sua experiência e exporte o projeto válido.";
}
export function goToIssue(issue: HumanIssue) { return { sceneId: issue.sceneId, eventId: issue.eventId, step: issue.suggestedStep || "review" } as const; }
export function exportGuidedProject(funnel: FunnelDefinition, type: "draft" | "valid") {
  const review = reviewSummary(funnel);
  const core = exportStudioFunnel(funnel, type === "valid" ? "valid" : "draft");
  const errors = review.errors;
  const ok = type === "draft" || (core.ok && errors.length === 0);
  return { ok, issues: errors, json: JSON.stringify({ exportVersion: 1, exportType: type, exportedAt: new Date().toISOString(), funnel: JSON.parse(core.json) }, null, 2) };
}
