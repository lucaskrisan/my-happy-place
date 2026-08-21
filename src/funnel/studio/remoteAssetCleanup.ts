import type { AssetRef, FunnelDefinition } from "../schema/v1";
import { findAssetUsages } from "./studioState";

export type InventoryObject = { key: string; size: number; etag: string; uploadedAt: string; contentType?: string };
export type InventoryClass = "current" | "old_version" | "possible_orphan";
export type ClassifiedObject = InventoryObject & { classification: InventoryClass; assetId?: string };

export function classifyInventory(funnel: FunnelDefinition, objects: InventoryObject[]): ClassifiedObject[] {
  const permanent = funnel.assets.filter((asset): asset is Extract<AssetRef, { source: "permanent" }> => asset.source === "permanent");
  const current = new Map(permanent.filter((asset) => asset.r2Key).map((asset) => [asset.r2Key!, asset.id]));
  const old = new Map(permanent.flatMap((asset) => (asset.previousVersions ?? []).map((version) => [version.r2Key, asset.id] as const)));
  return objects.map((item) => current.has(item.key) ? { ...item, classification: "current", ...(current.get(item.key) ? { assetId: current.get(item.key)! } : {}) } : old.has(item.key) ? { ...item, classification: "old_version", ...(old.get(item.key) ? { assetId: old.get(item.key)! } : {}) } : { ...item, classification: "possible_orphan" });
}

export function canDeleteCurrentAsset(funnel: FunnelDefinition, assetId: string) { return findAssetUsages(funnel, assetId).length === 0; }
export function removePreviousVersion(funnel: FunnelDefinition, assetId: string, key: string) { return { ...funnel, assets: funnel.assets.map((asset) => asset.id !== assetId || asset.source !== "permanent" ? asset : { ...asset, previousVersions: (asset.previousVersions ?? []).filter((version) => version.r2Key !== key) }) }; }
export function storageSummary(items: ClassifiedObject[]) { return items.reduce((summary, item) => { if (item.classification === "current") summary.current += item.size; else if (item.classification === "old_version") summary.old += item.size; else summary.orphan += item.size; return summary; }, { current: 0, old: 0, orphan: 0 }); }
