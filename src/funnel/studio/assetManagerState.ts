import type { AssetRef, FunnelDefinition } from "../schema/v1";
import { findAssetUsages, removeAsset, uid } from "./studioState";
import { invalidateStructuralTests } from "./guidedState";
import type { PermanentUploadResult } from "./permanentUpload";

export type AssetFilter = "all" | "video" | "audio" | "image" | "local" | "permanent" | "problem";
export type AssetStatus = "permanent" | "local" | "unresolved";

export const assetStatus = (asset: AssetRef, urls: Record<string, string>): AssetStatus =>
  asset.source === "permanent" ? "permanent" : urls[asset.id] ? "local" : "unresolved";

export function filterAssets(
  assets: AssetRef[],
  urls: Record<string, string>,
  filter: AssetFilter,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return assets.filter((asset) => {
    const status = assetStatus(asset, urls);
    const matchesFilter = filter === "all" || filter === asset.mediaType || filter === status || (filter === "problem" && status === "unresolved");
    const name = asset.source === "preview" ? asset.fileName : asset.fileName || asset.url;
    return matchesFilter && (!needle || `${name} ${asset.mediaType}`.toLowerCase().includes(needle));
  });
}

export function assetSummary(funnel: FunnelDefinition, urls: Record<string, string>) {
  const summary = { total: funnel.assets.length, permanent: 0, local: 0, unresolved: 0, errors: 0 };
  funnel.assets.forEach((asset) => {
    const status = assetStatus(asset, urls);
    if (status === "permanent") summary.permanent++;
    if (status === "local") summary.local++;
    if (status === "unresolved") summary.unresolved++;
  });
  return summary;
}

export function addPermanentUrl(
  funnel: FunnelDefinition,
  url: string,
  mediaType: AssetRef["mediaType"],
  name?: string,
) {
  return {
    ...funnel,
    assets: [...funnel.assets, { id: uid(mediaType), mediaType, source: "permanent" as const, url, ...(name ? { fileName: name } : {}) }],
  };
}

export function promoteAssetInFunnel(
  funnel: FunnelDefinition,
  assetId: string,
  result: PermanentUploadResult,
) {
  const asset = funnel.assets.find((item) => item.id === assetId);
  if (!asset || asset.source !== "preview") return funnel;
  const next = {
    ...funnel,
    assets: funnel.assets.map((item) => item.id !== assetId ? item : {
      id: item.id,
      mediaType: item.mediaType,
      source: "permanent" as const,
      url: result.src,
      fileName: result.filename,
      contentType: result.contentType,
      size: result.size,
      uploadedAt: result.uploadedAt,
      r2Key: result.key,
      etag: result.etag,
    }),
  };
  return invalidateStructuralTests(funnel, next);
}

export function replacePermanentAsset(
  funnel: FunnelDefinition,
  assetId: string,
  result: PermanentUploadResult,
) {
  const current = funnel.assets.find((asset) => asset.id === assetId);
  if (!current || current.source !== "permanent") return funnel;
  const previous = current.r2Key ? { r2Key: current.r2Key, ...(current.etag ? { etag: current.etag } : {}), ...(current.uploadedAt ? { uploadedAt: current.uploadedAt } : {}), ...(current.size !== undefined ? { size: current.size } : {}) } : undefined;
  const next = {
    ...funnel,
    assets: funnel.assets.map((asset) => asset.id === assetId ? {
      ...asset,
      url: result.src,
      fileName: result.filename,
      contentType: result.contentType,
      size: result.size,
      uploadedAt: result.uploadedAt,
      r2Key: result.key,
      etag: result.etag,
      previousVersions: [...(current.previousVersions ?? []), ...(previous ? [previous] : [])],
    } : asset),
  };
  return invalidateStructuralTests(funnel, next);
}

export function renameAsset(funnel: FunnelDefinition, assetId: string, fileName: string) {
  return { ...funnel, assets: funnel.assets.map((asset) => asset.id === assetId ? { ...asset, fileName } : asset) };
}

export function removeUnusedAsset(funnel: FunnelDefinition, assetId: string) {
  return findAssetUsages(funnel, assetId).length ? funnel : removeAsset(funnel, assetId);
}
