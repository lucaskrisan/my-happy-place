import type React from "react";
import type {
  ActionDefinition,
  FunnelDefinition,
  SceneEventDefinition,
  TriggerDefinition,
} from "../../schema/v1";
import { funnelBlockRegistry } from "../../registry/blockRegistry";
import { assetName } from "../assetManagerState";

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="grid gap-1 text-xs text-zinc-400">
    {label}
    {children}
  </label>
);
export function AssetSelect({
  funnel,
  value,
  onChange,
  mediaType,
}: {
  funnel: FunnelDefinition;
  value?: string | undefined;
  onChange: (value?: string | undefined) => void;
  mediaType?: "video" | "audio" | "image" | undefined;
}) {
  return (
    <select value={value || ""} onChange={(event) => onChange(event.target.value || undefined)}>
      <option value="">nenhum</option>
      {funnel.assets
        .filter((asset) => !mediaType || asset.mediaType === mediaType)
        .map((asset) => (
          <option value={asset.id} key={asset.id}>
            {assetName(asset)} {asset.source === "preview" && !asset.objectUrl ? "(reanexar)" : ""}
          </option>
        ))}
    </select>
  );
}
export function TriggerInspector({
  funnel,
  event,
  onChange,
}: {
  funnel: FunnelDefinition;
  event: SceneEventDefinition;
  onChange: (event: SceneEventDefinition) => void;
}) {
  const allowed = funnelBlockRegistry.get(event.block)?.allowedTriggers || [];
  const set = (trigger: TriggerDefinition) =>
    onChange({ ...event, trigger } as SceneEventDefinition);
  const trigger = event.trigger;
  return (
    <section className="grid gap-2">
      <b>TRIGGER</b>
      <Field label="Tipo">
        <select
          value={trigger.kind}
          onChange={(e) => {
            const kind = e.target.value as TriggerDefinition["kind"];
            set(
              kind === "TIME"
                ? { kind, seconds: 0 }
                : kind === "BEFORE_END"
                  ? { kind, seconds: 2 }
                  : kind === "INTERACTION_COMPLETE"
                    ? { kind, interactionId: event.id }
                    : { kind },
            );
          }}
        >
          {allowed.map((kind) => (
            <option key={kind}>{kind}</option>
          ))}
        </select>
      </Field>
      {(trigger.kind === "TIME" || trigger.kind === "BEFORE_END") && (
        <Field label={trigger.kind === "TIME" ? "Segundo" : "Segundos antes do fim"}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={trigger.seconds}
            onChange={(e) => set({ ...trigger, seconds: Math.max(0, Number(e.target.value)) })}
          />
        </Field>
      )}
      {trigger.kind === "INTERACTION_COMPLETE" && (
        <Field label="Interação de origem">
          <select
            value={trigger.interactionId}
            onChange={(e) => set({ ...trigger, interactionId: e.target.value })}
          >
            <option value="">selecionar evento</option>
            {funnel.scenes
              .flatMap((scene) => scene.events)
              .filter((candidate) => candidate.id !== event.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.id} — {candidate.block}
                </option>
              ))}
          </select>
        </Field>
      )}
    </section>
  );
}
export function ActionInspector({
  funnel,
  event,
  actions,
  onChange,
  label = "AÇÕES",
}: {
  funnel: FunnelDefinition;
  event: SceneEventDefinition;
  actions: ActionDefinition[];
  onChange: (actions: ActionDefinition[]) => void;
  label?: string;
}) {
  const update = (index: number, action: ActionDefinition) =>
    onChange(actions.map((item, i) => (i === index ? action : item)));
  const make = (type: ActionDefinition["type"]): ActionDefinition =>
    type === "GO_TO_SCENE"
      ? { type, sceneId: funnel.entrySceneId }
      : type === "OPEN_EVENT"
        ? { type, eventId: event.id }
        : { type };
  return (
    <section className="grid gap-2">
      <div className="flex justify-between">
        <b>{label}</b>
        <button onClick={() => onChange([...actions, { type: "RESUME_VIDEO" }])}>+ ação</button>
      </div>
      {actions.map((action, index) => (
        <div className="grid grid-cols-[1fr_auto] gap-1" key={index}>
          <select
            value={action.type}
            onChange={(e) => update(index, make(e.target.value as ActionDefinition["type"]))}
          >
            {[
              "RESUME_VIDEO",
              "PAUSE_VIDEO",
              "NEXT_SCENE",
              "GO_TO_SCENE",
              "OPEN_EVENT",
              "STOP",
              "COMPLETE_SCENE",
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          {action.type === "GO_TO_SCENE" && (
            <select
              value={action.sceneId}
              onChange={(e) => update(index, { ...action, sceneId: e.target.value })}
            >
              {funnel.scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title}
                </option>
              ))}
            </select>
          )}
          {action.type === "OPEN_EVENT" && (
            <select
              value={action.eventId}
              onChange={(e) => update(index, { ...action, eventId: e.target.value })}
            >
              {funnel.scenes
                .flatMap((scene) => scene.events)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.id} — {candidate.block}
                  </option>
                ))}
            </select>
          )}
          <button onClick={() => onChange(actions.filter((_, i) => i !== index))}>×</button>
        </div>
      ))}
    </section>
  );
}
