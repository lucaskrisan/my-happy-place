import { useEffect, useRef, useState } from "react";
import type { AssetRef, FunnelDefinition } from "../schema/v1";
import { ASSET_UPLOAD_SESSION_KEY } from "./AssetManager";
import { addPermanentUrl, assetName, assetStatus, promoteAssetInFunnel } from "./assetManagerState";
import { isStudioMediaType, studioMediaTypeForMime, uploadPermanentAsset, type UploadStatus } from "./permanentUpload";
import { uid } from "./studioState";
import { HelpText, PrimaryButton, SecondaryButton, GhostButton, Badge } from "./ui";

type Props = { label: string; mediaType: AssetRef["mediaType"]; funnel: FunnelDefinition; urls: Record<string, string>; value?: string | undefined; onSelect: (assetId?: string) => void; onChange: (funnel: FunnelDefinition) => void; onAttachPreview?: (file: File, assetId?: string) => void };
const accepts: Record<AssetRef["mediaType"], string> = { video: "video/mp4,video/webm", audio: "audio/mpeg,audio/mp4,audio/wav,audio/ogg", image: "image/jpeg,image/png,image/webp" };
const mediaWord = (mediaType: AssetRef["mediaType"]) => (mediaType === "video" ? "vídeo" : mediaType === "audio" ? "áudio" : "imagem");
const fieldClass = "w-full rounded-lg border border-studio-border bg-white/[.04] p-2.5 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none transition-colors";

export function InlineMediaPicker({ label, mediaType, funnel, urls, value, onSelect, onChange, onAttachPreview }: Props) {
  const [open, setOpen] = useState(false), [token, setToken] = useState(""), [tokenDraft, setTokenDraft] = useState(""), [url, setUrl] = useState(""), [status, setStatus] = useState<UploadStatus | null>(null), [progress, setProgress] = useState(0), [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null), controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => setToken(sessionStorage.getItem(ASSET_UPLOAD_SESSION_KEY) || ""), []);
  const assets = funnel.assets.filter((asset) => asset.mediaType === mediaType), current = assets.find((asset) => asset.id === value);
  const invalid = (file: File) => !isStudioMediaType(file.type) || studioMediaTypeForMime(file.type) !== mediaType;
  const attach = (file: File, assetId: string) => { if (!onAttachPreview) return setError("O preview local não está disponível neste campo."); onAttachPreview(file, assetId); onSelect(assetId); setOpen(false); };
  const upload = async (file: File, previewOnly: boolean, existingId?: string) => {
    setError("");
    if (invalid(file)) return setError("Este tipo de arquivo não é aceito neste campo.");
    if (file.size > 90 * 1024 * 1024) return setError("Este arquivo passa do limite atual de 90 MiB.");
    const assetId = existingId || uid(mediaType);
    if (previewOnly || !token) return attach(file, assetId);
    controller.current = new AbortController(); setProgress(0); setStatus("uploading");
    try {
      const result = await uploadPermanentAsset({ funnelId: funnel.id, assetId, file, token, signal: controller.current.signal, onProgress: (next, phase) => { setProgress(next); setStatus(phase); } });
      const old = funnel.assets.find((asset) => asset.id === assetId);
      const next = old?.source === "preview" ? promoteAssetInFunnel(funnel, assetId, result) : { ...funnel, assets: [...funnel.assets, { id: assetId, mediaType, source: "permanent" as const, url: result.src, fileName: result.filename, contentType: result.contentType, size: result.size, uploadedAt: result.uploadedAt, r2Key: result.key, etag: result.etag }] };
      onChange(next); onSelect(assetId); setStatus("completed"); setOpen(false);
    } catch (reason) { setStatus(reason instanceof Error && (reason as { code?: string }).code === "cancelled" ? "cancelled" : "error"); setError(reason instanceof Error ? reason.message : "Não foi possível salvar este arquivo."); }
  };
  const choose = (previewOnly: boolean, assetId?: string) => { if (!input.current) return; input.current.dataset["previewOnly"] = String(previewOnly); input.current.dataset["assetId"] = assetId || ""; input.current.click(); };
  const unresolved = current?.source === "preview" && assetStatus(current, urls) === "unresolved";
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 min-w-0 rounded-lg border border-dashed border-studio-border-strong bg-white/[.02] px-3.5 py-2.5 text-left text-sm text-studio-text-secondary transition-colors hover:border-studio-primary/40 hover:text-studio-text"
        >
          {current ? <span className="truncate text-studio-text">{assetName(current)}</span> : `Escolher arquivo ou enviar novo ${mediaWord(mediaType)}`}
        </button>
        {value && <GhostButton type="button" onClick={() => onSelect(undefined)} className="shrink-0 text-xs">Remover</GhostButton>}
      </div>
      {current?.source === "preview" && <Badge tone={unresolved ? "warning" : "neutral"}>{unresolved ? `Precisa ser reanexado — ${current.fileName}` : "Local — somente preview"}</Badge>}
      {open && (
        <div className="space-y-3 rounded-xl border border-studio-border bg-studio-surface-2 p-4" role="dialog" aria-label={`Arquivos para ${label}`}>
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Meus arquivos</span>
            {assets.length ? (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {assets.map((asset) => (
                  <button
                    type="button"
                    key={asset.id}
                    onClick={() => { if (asset.source === "preview" && !urls[asset.id]) return setError(`Este arquivo precisa ser reanexado: ${asset.fileName}`); onSelect(asset.id); setOpen(false); }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-studio-text-secondary transition-colors hover:bg-white/[.05] hover:text-studio-text"
                  >
                    <span className="truncate">{assetName(asset)}</span>
                    <Badge tone={asset.source === "permanent" ? "success" : assetStatus(asset, urls) === "unresolved" ? "warning" : "neutral"}>{asset.source === "permanent" ? "Permanente" : assetStatus(asset, urls) === "unresolved" ? "Reanexar" : "Local"}</Badge>
                  </button>
                ))}
              </div>
            ) : (
              <HelpText className="text-xs">Você ainda não adicionou nenhum arquivo compatível.</HelpText>
            )}
            {unresolved && (
              <div className="mt-2 flex gap-2">
                <SecondaryButton type="button" onClick={() => choose(true, current.id)} className="text-xs">Reanexar</SecondaryButton>
                {token && <SecondaryButton type="button" onClick={() => choose(false, current.id)} className="text-xs">Reanexar e tornar permanente</SecondaryButton>}
              </div>
            )}
          </div>
          <input ref={input} className="hidden" type="file" accept={accepts[mediaType]} onChange={(event) => { const file = event.target.files?.[0], previewOnly = event.currentTarget.dataset["previewOnly"] === "true", assetId = event.currentTarget.dataset["assetId"] || undefined; if (file) void upload(file, previewOnly, assetId); event.currentTarget.dataset["previewOnly"] = ""; event.currentTarget.dataset["assetId"] = ""; event.target.value = ""; }} />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Enviar novo</span>
            {token ? (
              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="button" onClick={() => choose(false)} className="text-xs">Enviar e salvar no projeto</PrimaryButton>
                <SecondaryButton type="button" onClick={() => choose(true)} className="text-xs">Usar só para preview</SecondaryButton>
              </div>
            ) : (
              <div className="space-y-2">
                <HelpText className="text-xs">Upload permanente desativado — informe o token de autoria para enviar arquivos definitivos.</HelpText>
                <input type="password" placeholder="Token de autoria" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} className={fieldClass} />
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton type="button" onClick={() => { if (!tokenDraft.trim()) return; sessionStorage.setItem(ASSET_UPLOAD_SESSION_KEY, tokenDraft.trim()); setToken(tokenDraft.trim()); setTokenDraft(""); }} className="text-xs">Configurar upload</SecondaryButton>
                  <GhostButton type="button" onClick={() => choose(true)} className="text-xs">Usar só para preview</GhostButton>
                </div>
              </div>
            )}
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Ou cole uma URL</span>
            <div className="flex gap-2">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" className={fieldClass} />
              <SecondaryButton type="button" onClick={() => { if (!url.trim()) return; const next = addPermanentUrl(funnel, url.trim(), mediaType), asset = next.assets.at(-1)!; onChange(next); onSelect(asset.id); setOpen(false); }} className="shrink-0 text-xs">Adicionar</SecondaryButton>
            </div>
          </div>
          {status && (
            <div role="status" className="flex items-center gap-2 text-xs text-studio-text-secondary">
              <span>{status === "uploading" ? `Enviando ${progress}%` : status}</span>
              {status === "uploading" && <GhostButton type="button" onClick={() => controller.current?.abort()} className="px-2 py-1 text-xs">Cancelar</GhostButton>}
            </div>
          )}
          {error && <p role="alert" className="text-xs text-studio-error">{error}</p>}
          <GhostButton type="button" onClick={() => setOpen(false)} className="text-xs">Fechar</GhostButton>
        </div>
      )}
    </div>
  );
}
