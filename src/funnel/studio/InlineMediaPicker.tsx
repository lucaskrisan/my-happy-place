import { useEffect, useRef, useState } from "react";
import type { AssetRef, FunnelDefinition } from "../schema/v1";
import { ASSET_UPLOAD_SESSION_KEY } from "./AssetManager";
import { addPermanentUrl, assetStatus, promoteAssetInFunnel } from "./assetManagerState";
import { isStudioMediaType, studioMediaTypeForMime, uploadPermanentAsset, type UploadStatus } from "./permanentUpload";
import { uid } from "./studioState";

type Props = { label: string; mediaType: AssetRef["mediaType"]; funnel: FunnelDefinition; urls: Record<string, string>; value?: string | undefined; onSelect: (assetId?: string) => void; onChange: (funnel: FunnelDefinition) => void; onAttachPreview?: (file: File, assetId?: string) => void };
const accepts: Record<AssetRef["mediaType"], string> = { video: "video/mp4,video/webm", audio: "audio/mpeg,audio/mp4,audio/wav,audio/ogg", image: "image/jpeg,image/png,image/webp" };
const assetName = (asset: AssetRef) => asset.source === "preview" ? asset.fileName : asset.fileName || asset.url.split("/").at(-1) || "Arquivo";

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
  return <div className="grid gap-1"><b>{label}</b><button type="button" onClick={() => setOpen(true)}>{current ? assetName(current) : `Escolher ou enviar ${mediaType === "video" ? "vídeo" : mediaType === "audio" ? "áudio" : "imagem"}`}</button>{current?.source === "preview" && <small>{unresolved ? `PRECISA SER REANEXADO — ${current.fileName}` : "LOCAL — SOMENTE PREVIEW"}</small>}{value && <button type="button" onClick={() => onSelect(undefined)}>REMOVER</button>}{open && <div className="rounded border border-zinc-600 bg-zinc-900 p-3 grid gap-2" role="dialog" aria-label={`Arquivos para ${label}`}><b>ARQUIVOS DO PROJETO</b>{assets.length ? assets.map((asset) => <button type="button" key={asset.id} onClick={() => { if (asset.source === "preview" && !urls[asset.id]) return setError(`Este arquivo precisa ser reanexado: ${asset.fileName}`); onSelect(asset.id); setOpen(false); }}>{assetName(asset)} — {asset.source === "permanent" ? "PERMANENTE" : assetStatus(asset, urls) === "unresolved" ? "PRECISA SER REANEXADO" : "LOCAL"}</button>) : <small>Você ainda não adicionou nenhum arquivo compatível.</small>}{unresolved && <><button type="button" onClick={() => choose(true, current.id)}>REANEXAR</button>{token && <button type="button" onClick={() => choose(false, current.id)}>REANEXAR E TORNAR PERMANENTE</button>}</>}<input ref={input} className="hidden" type="file" accept={accepts[mediaType]} onChange={(event) => { const file = event.target.files?.[0], previewOnly = event.currentTarget.dataset["previewOnly"] === "true", assetId = event.currentTarget.dataset["assetId"] || undefined; if (file) void upload(file, previewOnly, assetId); event.currentTarget.dataset["previewOnly"] = ""; event.currentTarget.dataset["assetId"] = ""; event.target.value = ""; }} />{token ? <><button type="button" onClick={() => choose(false)}>ENVIAR E SALVAR NO PROJETO</button><button type="button" onClick={() => choose(true)}>USAR SÓ PARA PREVIEW</button></> : <><small>UPLOAD PERMANENTE DESATIVADO</small><input type="password" placeholder="TOKEN DE AUTORIA" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} /><button type="button" onClick={() => { if (!tokenDraft.trim()) return; sessionStorage.setItem(ASSET_UPLOAD_SESSION_KEY, tokenDraft.trim()); setToken(tokenDraft.trim()); setTokenDraft(""); }}>CONFIGURAR UPLOAD</button><button type="button" onClick={() => choose(true)}>USAR SÓ PARA PREVIEW</button></>}<label>COLAR URL<input value={url} onChange={(event) => setUrl(event.target.value)} /></label><button type="button" onClick={() => { if (!url.trim()) return; const next = addPermanentUrl(funnel, url.trim(), mediaType), asset = next.assets.at(-1)!; onChange(next); onSelect(asset.id); setOpen(false); }}>ADICIONAR URL</button>{status && <div role="status">{status === "uploading" ? `ENVIANDO ${progress}%` : status.toUpperCase()} {status === "uploading" && <button type="button" onClick={() => controller.current?.abort()}>CANCELAR</button>}</div>}{error && <small role="alert">{error}</small>}<button type="button" onClick={() => setOpen(false)}>CANCELAR</button></div>}</div>;
}
