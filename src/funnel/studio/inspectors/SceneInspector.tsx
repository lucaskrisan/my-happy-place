import type { FunnelDefinition, SceneDefinition } from "../../schema/v1";
import { AssetSelect, Field } from "./shared";
export function SceneInspector({
  funnel,
  scene,
  onChange,
}: {
  funnel: FunnelDefinition;
  scene: SceneDefinition;
  onChange: (patch: Partial<SceneDefinition>) => void;
}) {
  return (
    <section className="grid gap-2">
      <b>CENA</b>
      <Field label="Título">
        <input value={scene.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Descrição">
        <textarea
          value={scene.description || ""}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
        />
      </Field>
      <Field label="Vídeo">
        <AssetSelect
          funnel={funnel}
          mediaType="video"
          value={scene.videoAssetId}
          onChange={(videoAssetId) => onChange({ videoAssetId })}
        />
      </Field>
      <Field label="Poster">
        <AssetSelect
          funnel={funnel}
          mediaType="image"
          value={scene.posterAssetId}
          onChange={(posterAssetId) => onChange({ posterAssetId })}
        />
      </Field>
      <Field label="Fit">
        <select
          value={scene.fit || "contain"}
          onChange={(e) => onChange({ fit: e.target.value as "contain" | "cover" })}
        >
          <option>contain</option>
          <option>cover</option>
        </select>
      </Field>
      <Field label="Volume">
        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={scene.volume ?? 1}
          onChange={(e) => onChange({ volume: Number(e.target.value) })}
        />
      </Field>
      <Field label="startAt">
        <input
          type="number"
          min="0"
          step="0.01"
          value={scene.startAt ?? 0}
          onChange={(e) => onChange({ startAt: Number(e.target.value) })}
        />
      </Field>
      <Field label="endAt">
        <input
          type="number"
          min="0"
          step="0.01"
          value={scene.endAt ?? ""}
          onChange={(e) =>
            onChange({ endAt: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
      </Field>
      <Field label="Próxima cena">
        <select
          value={scene.nextSceneId || ""}
          onChange={(e) => onChange({ nextSceneId: e.target.value || undefined })}
        >
          <option value="">nenhuma</option>
          {funnel.scenes
            .filter((candidate) => candidate.id !== scene.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
        </select>
      </Field>
      <small>ID: {scene.id}</small>
    </section>
  );
}
