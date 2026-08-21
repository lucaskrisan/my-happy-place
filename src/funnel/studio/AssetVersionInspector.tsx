import { useState } from "react";
import type { AssetRef, FunnelDefinition } from "../schema/v1";
import { deleteRemoteAssetObject } from "./remoteAssetClient";
import { removePreviousVersion } from "./remoteAssetCleanup";

export function AssetVersionInspector({ funnel, asset, token, onChange }: { funnel: FunnelDefinition; asset: Extract<AssetRef, { source: "permanent" }>; token: string; onChange: (next: FunnelDefinition) => void }) {
  const [error, setError] = useState("");
  const remove = async (key: string) => { if (!token || !confirm("Esta versão será removida permanentemente do armazenamento.")) return; setError(""); try { await deleteRemoteAssetObject(funnel.id, asset.id, key, token); onChange(removePreviousVersion(funnel, asset.id, key)); } catch { setError("Não foi possível excluir esta versão."); } };
  const fmt = (size?: number) => size === undefined ? "tamanho desconhecido" : `${Math.round(size / 1024 / 1024 * 10) / 10} MiB`;
  return <details><summary>VERSÕES</summary><div className="grid gap-1"><b>VERSÃO ATUAL</b><small>{asset.fileName || "Arquivo"} · {fmt(asset.size)} · {asset.uploadedAt || "data desconhecida"} · PERMANENTE</small>{(asset.previousVersions ?? []).length > 0 && <><b>VERSÕES ANTERIORES</b>{(asset.previousVersions ?? []).map((version) => <div key={version.r2Key}><small>{version.uploadedAt || "data desconhecida"} · {fmt(version.size)} · VERSÃO ANTERIOR</small><button disabled title="Exclusão remota temporariamente desativada enquanto esta função é validada.">EXCLUIR VERSÃO</button><details><summary>Detalhes técnicos</summary><small>{version.r2Key}<br />{version.etag || "etag indisponível"}</small></details></div>)}</>}{error && <><small className="text-red-400">{error}</small><button onClick={() => setError("")}>TENTAR NOVAMENTE</button></>}<small>Exclusão remota temporariamente desativada enquanto esta função é validada.</small></div></details>;
}
