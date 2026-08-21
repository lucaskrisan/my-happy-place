import { describe, expect, it } from "vitest";
import {
  defaultEvent,
  duplicateFunnel,
  emptyFunnel,
  exportFunnel,
  exportStudioFunnel,
  findAssetUsages,
  importFunnel,
  loadFunnel,
  previewAssetsNeedReattach,
  removeAsset,
  reorderScenes,
  saveFunnel,
  serializeForStorage,
} from "../studio/studioState";
import { validateFunnel } from "../validator/validateFunnel";
import { attachFunnel, createProduct, ensureProducts } from "../studio/productState";
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) || null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
describe("Studio local operations", () => {
  it("autosave persists and reloads a funnel", () => {
    const storage = new MemoryStorage();
    const funnel = emptyFunnel("Autosave");
    saveFunnel(storage, funnel);
    expect(loadFunnel(storage, funnel.id)?.title).toBe("Autosave");
  });
  it("organizes existing funnels under the default product without duplicating them", () => {
    const storage = new MemoryStorage();
    const funnel = emptyFunnel("Principal");
    saveFunnel(storage, funnel);
    const [product] = ensureProducts(storage);
    expect(product?.name).toBe("DESAFIO 14 DIAS");
    expect(product?.funnelIds).toEqual([funnel.id]);
  });
  it("creates a product and attaches a funnel by reference", () => {
    const storage = new MemoryStorage();
    const product = createProduct(storage, "Novo produto", "Descrição");
    const funnel = emptyFunnel("Novo funil");
    const attached = attachFunnel(storage, product.id, funnel);
    expect(attached?.funnelIds).toEqual([funnel.id]);
  });
  it("reorders scenes without changing ids", () => {
    const funnel = emptyFunnel();
    funnel.scenes.push({ id: "scene-2", title: "Dois", events: [] });
    const next = reorderScenes(funnel, 1, 0);
    expect(next.scenes.map((s) => s.id)).toEqual(["scene-2", funnel.entrySceneId]);
  });
  it("creates a time event at the playhead for timeline dragging", () => {
    const event = defaultEvent("quiz", 17.3);
    expect(event.trigger).toEqual({ kind: "TIME", seconds: 17.3 });
  });
  it("roundtrips valid export and rejects invalid import", () => {
    const funnel = emptyFunnel();
    const parsed = importFunnel(exportFunnel(funnel).json);
    expect(parsed.funnel?.id).toBe(funnel.id);
    expect(importFunnel("{bad").funnel).toBeNull();
  });
  it("duplicates a funnel with a new outer id and preserved internal references", () => {
    const funnel = emptyFunnel();
    const copy = duplicateFunnel(funnel);
    expect(copy.id).not.toBe(funnel.id);
    expect(copy.entrySceneId).toBe(funnel.entrySceneId);
  });
  it("reports deleting a referenced scene through validator integration", () => {
    const funnel = emptyFunnel();
    funnel.scenes.push({ id: "next", title: "Next", events: [] });
    funnel.scenes[0]!.nextSceneId = "next";
    funnel.scenes = funnel.scenes.filter((s) => s.id !== "next");
    expect(validateFunnel(funnel).some((x) => x.code === "scene_target_missing")).toBe(true);
  });
  it("marks persisted local preview assets as requiring reattachment", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({
      id: "local-video",
      mediaType: "video",
      source: "preview",
      objectUrl: "blob:old",
      fileName: "local.mp4",
    });
    expect(previewAssetsNeedReattach(funnel)).toEqual(["local-video"]);
  });
  it("drops local object URLs while retaining reattach metadata", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({
      id: "local-video",
      mediaType: "video",
      source: "preview",
      objectUrl: "blob:old",
      fileName: "local.mp4",
      status: "ready",
    });
    const stored = serializeForStorage(funnel);
    expect(stored.assets[0]).toMatchObject({ id: "local-video", status: "needs_reattach" });
    expect(stored.assets[0]).not.toHaveProperty("objectUrl");
  });
  it("allows draft export but blocks valid export when preview media is unresolved", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({
      id: "local-video",
      mediaType: "video",
      source: "preview",
      fileName: "local.mp4",
    });
    expect(exportStudioFunnel(funnel, "draft").ok).toBe(true);
    expect(exportStudioFunnel(funnel, "valid").ok).toBe(false);
  });
  it("creates complete editable defaults for audio and notification", () => {
    expect(defaultEvent("audio", 2).block).toBe("audio");
    const notification = defaultEvent("notification", 2);
    expect(notification.block === "notification" && notification.onTap).toEqual([]);
  });
  it("finds asset usages across scene, call, notification and messaging", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({ id: "a", mediaType: "audio", source: "permanent", url: "/a.mp3" });
    funnel.scenes[0]!.videoAssetId = "a";
    funnel.scenes[0]!.events = [
      { ...defaultEvent("incoming_call"), voiceAssetId: "a" } as any,
      { ...defaultEvent("notification"), soundAssetId: "a" } as any,
      {
        ...defaultEvent("messaging"),
        messages: [{ id: "m", type: "voice_once", audioAssetId: "a" }],
      } as any,
    ];
    expect(findAssetUsages(funnel, "a")).toHaveLength(4);
    expect(findAssetUsages(funnel, "missing")).toEqual([]);
  });
  it("removes an unused asset and clears every supported used reference", () => {
    const funnel = emptyFunnel();
    funnel.assets.push({ id: "a", mediaType: "audio", source: "permanent", url: "/a.mp3" });
    funnel.scenes[0]!.events = [
      { ...defaultEvent("audio"), assetId: "a" } as any,
      { ...defaultEvent("incoming_call"), voiceAssetId: "a" } as any,
    ];
    const next = removeAsset(funnel, "a");
    expect(next.assets).toEqual([]);
    expect(
      next.scenes[0]!.events[0]!.block === "audio" && next.scenes[0]!.events[0]!.assetId,
    ).toBeUndefined();
    expect(
      next.scenes[0]!.events[1]!.block === "incoming_call" &&
        next.scenes[0]!.events[1]!.voiceAssetId,
    ).toBeUndefined();
  });
});
