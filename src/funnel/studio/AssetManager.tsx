import { useEffect, useMemo, useRef, useState } from "react";
import type { AssetRef, FunnelDefinition } from "../schema/v1";
import { isStudioMediaType, studioMediaTypeForMime, uploadPermanentAsset, type UploadStatus } from "./permanentUpload";
import { findAssetUsages, uid } from "./studioState";
import { addPermanentUrl, assetStatus, assetSummary, filterAssets, promoteAssetInFunnel, removeUnusedAsset, renameAsset, replacePermanentAsset, type AssetFilter } from "./assetManagerState";
import { AssetCleanupPanel } from "./AssetCleanupPanel";
import { AssetVersionInspector } from "./AssetVersionInspector";
import { PageTitle, HelpText, Card, Badge, PrimaryButton, SecondaryButton, GhostButton, EmptyState, StudioSelect } from "./ui";

export const ASSET_UPLOAD_SESSION_KEY = "funnel-studio:upload-token";
const ACCEPT = "video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,image/jpeg,image/png,image/webp";
type QueueMode = "promote" | "direct" | "replace";
type QueueItem = { id: string; assetId: string; file: File; mode: QueueMode; status: UploadStatus; progress: number; error?: string };
type PickMode = "local" | "direct" | "replace" | "reattach-promote";
type Props = { funnel: FunnelDefinition; urls: Record<string, string>; onChange: (next: FunnelDefinition) => void; onAttachPreview: (file: File, assetId?: string) => void; onRevoke: (assetId: string) => void; onClose: () => void; onOpenUsage: (path: string) => void };
const fileName = (asset: AssetRef) => asset.source === "preview" ? asset.fileName : asset.fileName || asset.url.split("/").at(-1) || "Arquivo";
const statusTone = (asset: AssetRef, urls: Record<string, string>) => asset.source === "permanent" ? "success" as const : assetStatus(asset, urls) === "unresolved" ? "warning" as const : "neutral" as const;
const statusLabel = (asset: AssetRef, urls: Record<string, string>) => asset.source === "permanent" ? "Permanente" : assetStatus(asset, urls) === "unresolved" ? "Precisa ser reanexado" : "Local — preview";
const typeLabel = (type: AssetRef["mediaType"]) => type === "video" ? "Vídeo" : type === "audio" ? "Áudio" : "Imagem";
const typeIcon = (type: AssetRef["mediaType"]) => type === "video" ? "🎬" : type === "audio" ? "🔊" : "🖼️";
const humanUploadError = (message: string) => message.includes("maior") ? "O limite atual é 90 MiB por arquivo." : message.includes("autoriz") ? "A autorização de upload não é válida." : message.includes("conex") ? "Sem conexão com o servidor." : message;
const FILTERS: { id: AssetFilter; label: string }[] = [
  { id: "all", label: "Todos" }, { id: "video", label: "Vídeos" }, { id: "audio", label: "Áudios" }, { id: "image", label: "Imagens" },
  { id: "local", label: "Locais" }, { id: "permanent", label: "Permanentes" }, { id: "problem", label: "Com problema" },
];
const fieldClass = "w-full rounded-lg border border-studio-border bg-white/[.04] p-2.5 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none transition-colors";

export function AssetManager({ funnel, urls, onChange, onAttachPreview, onRevoke, onClose, onOpenUsage }: Props) {
  const [filter, setFilter] = useState<AssetFilter>("all"); const [query, setQuery] = useState(""); const [selectedId, setSelectedId] = useState<string>(); const [token, setToken] = useState(""); const [tokenDraft, setTokenDraft] = useState(""); const [showToken, setShowToken] = useState(false); const [queue, setQueue] = useState<QueueItem[]>([]); const [permanentUrl, setPermanentUrl] = useState(""); const [permanentName, setPermanentName] = useState(""); const [permanentType, setPermanentType] = useState<AssetRef["mediaType"]>("video");
  const input = useRef<HTMLInputElement>(null); const controllers = useRef(new Map<string, AbortController>()); const files = useRef(new Map<string, File>());
  useEffect(() => { setToken(sessionStorage.getItem(ASSET_UPLOAD_SESSION_KEY) || ""); }, []);
  const assets = useMemo(() => filterAssets(funnel.assets, urls, filter, query), [filter, funnel.assets, query, urls]);
  const selected = funnel.assets.find((asset) => asset.id === selectedId) || assets[0]; const summary = assetSummary(funnel, urls);
  const patchQueue = (id: string, patch: Partial<QueueItem>) => setQueue((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const valid = (file: File) => isStudioMediaType(file.type) && !!studioMediaTypeForMime(file.type);
  const attachLocal = (file: File, assetId?: string) => { if (!valid(file)) return alert("Este tipo de arquivo não é aceito."); const id = assetId || uid(studioMediaTypeForMime(file.type)!); files.current.set(id, file); onAttachPreview(file, id); setSelectedId(id); };
  const pick = (mode: PickMode, assetId?: string) => { if (!input.current) return; input.current.dataset["mode"] = mode; input.current.dataset["assetId"] = assetId || ""; input.current.click(); };
  const saveToken = () => { if (!tokenDraft.trim()) return; sessionStorage.setItem(ASSET_UPLOAD_SESSION_KEY, tokenDraft.trim()); setToken(tokenDraft.trim()); setTokenDraft(""); setShowToken(false); };
  const clearToken = () => { sessionStorage.removeItem(ASSET_UPLOAD_SESSION_KEY); setToken(""); };
  const execute = async (item: QueueItem) => { const controller = new AbortController(); controllers.current.set(item.id, controller); try { const result = await uploadPermanentAsset({ funnelId: funnel.id, assetId: item.assetId, file: item.file, token, signal: controller.signal, onProgress: (progress, status) => patchQueue(item.id, { progress, status }) }); const next = item.mode === "promote" ? promoteAssetInFunnel(funnel, item.assetId, result) : item.mode === "replace" ? replacePermanentAsset(funnel, item.assetId, result) : { ...funnel, assets: [...funnel.assets, { id: item.assetId, mediaType: studioMediaTypeForMime(item.file.type)!, source: "permanent" as const, url: result.src, fileName: result.filename, contentType: result.contentType, size: result.size, uploadedAt: result.uploadedAt, r2Key: result.key, etag: result.etag }] }; onChange(next); if (item.mode === "promote") onRevoke(item.assetId); patchQueue(item.id, { status: "completed", progress: 100 }); setSelectedId(item.assetId); } catch (error) { const cancelled = error instanceof Error && error.name === "PermanentUploadError" && (error as { code?: string }).code === "cancelled"; patchQueue(item.id, { status: cancelled ? "cancelled" : "error", error: humanUploadError(error instanceof Error ? error.message : "Não foi possível salvar este arquivo.") }); } finally { controllers.current.delete(item.id); } };
  const enqueue = (assetId: string, file: File, mode: QueueMode) => { if (!token) { setShowToken(true); return; } const item: QueueItem = { id: uid("upload"), assetId, file, mode, status: "waiting", progress: 0 }; setQueue((items) => [...items, item]); void execute(item); };
  const handleFile = (file: File, mode: PickMode, assetId?: string) => { if (mode === "local") return attachLocal(file, assetId); if (mode === "direct") { if (!valid(file)) return alert("Este tipo de arquivo não é aceito."); return enqueue(uid(studioMediaTypeForMime(file.type)!), file, "direct"); } const asset = funnel.assets.find((item) => item.id === assetId); if (!asset) return; if (mode === "replace") return enqueue(asset.id, file, "replace"); attachLocal(file, asset.id); enqueue(asset.id, file, "promote"); };
  const preview = selected?.source === "permanent" ? selected.url : selected ? urls[selected.id] : undefined; const usage = selected ? findAssetUsages(funnel, selected.id) : [];
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 p-4 text-studio-text">
      <section className="mx-auto grid h-full max-w-6xl grid-rows-[auto_auto_1fr_auto] gap-4 rounded-2xl border border-studio-border bg-studio-bg p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <PageTitle className="text-xl">Arquivos</PageTitle>
            <HelpText className="mt-1">{summary.total} arquivos · {summary.permanent} permanentes · {summary.local} locais{summary.unresolved ? ` · ${summary.unresolved} precisam ser reanexados` : ""}</HelpText>
          </div>
          <GhostButton onClick={onClose}>Fechar</GhostButton>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <input placeholder="Buscar arquivo" value={query} onChange={(event) => setQuery(event.target.value)} className={`${fieldClass} max-w-[220px]`} />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button key={item.id} onClick={() => setFilter(item.id)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === item.id ? "bg-studio-primary text-white" : "bg-white/[.04] text-studio-text-secondary hover:text-studio-text"}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={() => pick("local")} className="text-xs">+ Adicionar arquivo</SecondaryButton>
            <GhostButton disabled={!token} onClick={() => pick("direct")} className="text-xs">Enviar direto</GhostButton>
            {token ? (
              <>
                <Badge tone="success">Upload permanente ativado</Badge>
                <GhostButton onClick={clearToken} className="text-xs">Remover autorização</GhostButton>
              </>
            ) : (
              <GhostButton onClick={() => setShowToken(true)} className="text-xs">Configurar upload</GhostButton>
            )}
          </div>
        </div>
        {showToken && (
          <div className="flex gap-2">
            <input type="password" autoComplete="off" placeholder="Token de autoria" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} className={fieldClass} />
            <PrimaryButton onClick={saveToken} className="shrink-0 text-xs">Ativar upload</PrimaryButton>
          </div>
        )}
        <input ref={input} className="hidden" type="file" accept={ACCEPT} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) handleFile(file, (event.currentTarget.dataset["mode"] || "local") as PickMode, event.currentTarget.dataset["assetId"] || undefined); event.currentTarget.value = ""; }} />

        <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          <div
            className="overflow-auto rounded-xl border border-dashed border-studio-border-strong p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); Array.from(event.dataTransfer.files).forEach((file) => attachLocal(file)); }}
          >
            <HelpText className="mb-3 text-xs">Arraste arquivos aqui ou use “+ Adicionar arquivo”.</HelpText>
            {assets.length ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {assets.map((asset) => (
                  <button key={asset.id} onClick={() => setSelectedId(asset.id)} className={`rounded-xl border p-2.5 text-left transition-colors ${selected?.id === asset.id ? "border-studio-primary bg-studio-primary-soft" : "border-studio-border bg-white/[.02] hover:border-studio-border-strong"}`}>
                    <div className="grid h-20 place-items-center rounded-lg bg-white/[.04] text-2xl">{typeIcon(asset.mediaType)}</div>
                    <p className="mt-2 truncate text-sm font-medium text-studio-text">{fileName(asset)}</p>
                    <div className="mt-1"><Badge tone={statusTone(asset, urls)}>{statusLabel(asset, urls)}</Badge></div>
                    <p className="mt-1 text-[11px] text-studio-text-muted">{asset.source === "permanent" && asset.size ? `${Math.round(asset.size / 1024 / 1024 * 10) / 10} MiB` : "tamanho desconhecido"} · usado em {findAssetUsages(funnel, asset.id).length} lugares</p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhum arquivo encontrado." description="Envie um arquivo ou ajuste os filtros." />
            )}
          </div>

          <aside className="overflow-auto rounded-xl border border-studio-border p-3">
            {selected ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-studio-text">{fileName(selected)}</p>
                  <p className="mt-0.5 text-xs text-studio-text-muted">{typeLabel(selected.mediaType)} · {statusLabel(selected, urls)}</p>
                </div>
                {preview && selected.mediaType === "video" && <video controls src={preview} className="w-full rounded-lg" />}
                {preview && selected.mediaType === "audio" && <audio controls src={preview} className="w-full" />}
                {preview && selected.mediaType === "image" && <img src={preview} alt={fileName(selected)} className="w-full rounded-lg" />}
                {selected.source === "preview" && !urls[selected.id] && <SecondaryButton className="w-full text-xs" onClick={() => pick(token ? "reattach-promote" : "local", selected.id)}>{token ? "Reanexar e tornar permanente" : "Reanexar"}</SecondaryButton>}
                {selected.source === "preview" && urls[selected.id] && <SecondaryButton className="w-full text-xs" onClick={() => { const file = files.current.get(selected.id); if (file) enqueue(selected.id, file, "promote"); else pick("local", selected.id); }}>Tornar permanente</SecondaryButton>}
                {selected.source === "permanent" && <SecondaryButton className="w-full text-xs" onClick={() => pick("replace", selected.id)}>Substituir arquivo</SecondaryButton>}
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Nome</span>
                  <input value={fileName(selected)} onChange={(event) => onChange(renameAsset(funnel, selected.id, event.target.value))} className={fieldClass} />
                </label>
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Usado em {usage.length} lugares</span>
                  <div className="space-y-0.5">
                    {usage.map((item) => <button className="block text-left text-xs text-studio-primary-strong hover:underline" key={item.path} onClick={() => onOpenUsage(item.path)}>Abrir — {item.label}</button>)}
                  </div>
                  {usage.length ? (
                    <HelpText className="mt-1 text-xs">Este arquivo está sendo usado. Remova as referências antes de removê-lo do projeto.</HelpText>
                  ) : (
                    <GhostButton className="mt-1.5 text-xs text-studio-error" onClick={() => { onRevoke(selected.id); onChange(removeUnusedAsset(funnel, selected.id)); setSelectedId(undefined); }}>Remover do projeto</GhostButton>
                  )}
                </div>
                <details className="rounded-lg border border-studio-border bg-white/[.02] p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Gerenciamento avançado</summary>
                  <div className="mt-3 space-y-3">
                    {selected.source === "permanent" && <AssetVersionInspector funnel={funnel} asset={selected} token={token} onChange={onChange} />}
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[10px] text-studio-text-muted">{JSON.stringify(selected, null, 2)}</pre>
                  </div>
                </details>
              </div>
            ) : (
              <HelpText>Selecione um arquivo.</HelpText>
            )}
            <div className="mt-4 space-y-2 border-t border-studio-border pt-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Colar URL permanente</span>
              <input placeholder="https://... ou /media/..." value={permanentUrl} onChange={(event) => setPermanentUrl(event.target.value)} className={fieldClass} />
              <input placeholder="Nome opcional" value={permanentName} onChange={(event) => setPermanentName(event.target.value)} className={fieldClass} />
              <StudioSelect
                clearable={false}
                value={permanentType}
                onChange={(next) => setPermanentType(next as AssetRef["mediaType"])}
                options={[
                  { value: "video", label: "Vídeo" },
                  { value: "audio", label: "Áudio" },
                  { value: "image", label: "Imagem" },
                ]}
              />
              <SecondaryButton className="w-full text-xs" onClick={() => { if (!permanentUrl.trim()) return; onChange(addPermanentUrl(funnel, permanentUrl.trim(), permanentType, permanentName.trim() || undefined)); setPermanentUrl(""); setPermanentName(""); }}>Adicionar URL</SecondaryButton>
            </div>
          </aside>
        </div>

        <details className="rounded-xl border border-studio-border p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Gerenciamento avançado — versões, inventário e limpeza</summary>
          <div className="mt-3">
            <AssetCleanupPanel funnel={funnel} token={token} onChange={onChange} />
          </div>
        </details>
        {queue.length > 0 && (
          <section className="max-h-40 space-y-1.5 overflow-auto border-t border-studio-border pt-2">
            {queue.map((item) => (
              <div className="flex items-center gap-2 text-xs" key={item.id}>
                <span className="w-40 truncate text-studio-text-secondary">{item.file.name}</span>
                <progress value={item.progress} max="100" className="h-1.5 flex-1 accent-studio-primary" />
                <Badge tone={item.status === "completed" ? "success" : item.status === "error" ? "error" : "neutral"}>{item.status} {item.progress}%</Badge>
                {item.status === "uploading" && <GhostButton onClick={() => controllers.current.get(item.id)?.abort()} className="px-2 py-1 text-xs">Cancelar</GhostButton>}
                {item.status === "error" && <GhostButton onClick={() => void execute(item)} className="px-2 py-1 text-xs">Tentar novamente</GhostButton>}
                {item.error && <span className="text-studio-error">{item.error}</span>}
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  );
}
