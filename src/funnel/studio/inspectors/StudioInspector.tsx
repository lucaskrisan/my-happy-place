import type { FunnelDefinition, SceneDefinition, SceneEventDefinition } from "../../schema/v1";
import { validateFunnel, type FunnelValidationIssue } from "../../validator/validateFunnel";
import { SceneInspector } from "./SceneInspector";
import { TriggerInspector, ActionInspector } from "./shared";
import { AudioInspector } from "./AudioInspector";
import { CallInspector } from "./CallInspector";
import { NotificationInspector } from "./NotificationInspector";
import { MessagingInspector } from "./MessagingInspector";
import { QuizInspector } from "./QuizInspector";
import { ChoiceInspector } from "./ChoiceInspector";
import { TransitionInspector } from "./TransitionInspector";
export function StudioInspector({
  funnel,
  scene,
  event,
  onScene,
  onEvent,
  onTest,
  onDuplicate,
  onDelete,
  onIssue,
}: {
  funnel: FunnelDefinition;
  scene: SceneDefinition;
  event?: SceneEventDefinition;
  onScene: (patch: Partial<SceneDefinition>) => void;
  onEvent: (event: SceneEventDefinition) => void;
  onTest: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onIssue: (issue: FunnelValidationIssue) => void;
}) {
  const issues = validateFunnel(funnel);
  return (
    <aside className="border-l border-zinc-800 p-3 overflow-auto text-sm grid content-start gap-3">
      {!event ? (
        <SceneInspector funnel={funnel} scene={scene} onChange={onScene} />
      ) : (
        <>
          <div className="flex justify-between">
            <b>{event.block.toUpperCase()}</b>
            <span className="font-mono text-[10px]">{event.id}</span>
          </div>
          <TriggerInspector funnel={funnel} event={event} onChange={onEvent} />
          {event.block === "audio" && (
            <AudioInspector funnel={funnel} event={event} onChange={onEvent} onTest={onTest} />
          )}{" "}
          {event.block === "incoming_call" && (
            <CallInspector funnel={funnel} event={event} onChange={onEvent} onTest={onTest} />
          )}{" "}
          {event.block === "notification" && (
            <NotificationInspector
              funnel={funnel}
              event={event}
              onChange={onEvent}
              onTest={onTest}
            />
          )}{" "}
          {event.block === "messaging" && (
            <MessagingInspector funnel={funnel} event={event} onChange={onEvent} onTest={onTest} />
          )}{" "}
          {event.block === "quiz" && (
            <QuizInspector funnel={funnel} event={event} onChange={onEvent} onTest={onTest} />
          )}{" "}
          {event.block === "choice" && (
            <ChoiceInspector funnel={funnel} event={event} onChange={onEvent} onTest={onTest} />
          )}{" "}
          {event.block === "scene_transition" && (
            <TransitionInspector funnel={funnel} event={event} onChange={onEvent} onTest={onTest} />
          )}{" "}
          {event.block === "video" && (
            <p className="text-xs text-zinc-400">Bloco de vídeo usa o asset configurado na cena.</p>
          )}
          <ActionInspector
            funnel={funnel}
            event={event}
            actions={event.actions}
            onChange={(actions) => onEvent({ ...event, actions })}
          />
          <button onClick={onTest}>TESTAR EVENTO</button>
          <button onClick={onDuplicate}>DUPLICAR</button>
          <button onClick={onDelete}>EXCLUIR</button>
        </>
      )}
      <hr />
      <b>VALIDAÇÃO — {issues.length}</b>
      {issues.map((issue, index) => (
        <button
          className="text-left text-xs text-red-400"
          key={`${issue.path}-${index}`}
          onClick={() => onIssue(issue)}
        >
          {issue.code}: {issue.message}
        </button>
      ))}
    </aside>
  );
}
