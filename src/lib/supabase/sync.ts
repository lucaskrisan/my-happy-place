import type { FunnelDefinition } from "@/funnel/schema/v1";
import { funnelSchema } from "@/funnel/schema/v1";
import { loadFunnel, loadProjects, saveFunnel } from "@/funnel/studio/studioState";
import { ensureProducts, saveProducts, type StudioProduct } from "@/funnel/studio/productState";
import { getSupabaseBrowserClient } from "./client";

// Cloud is JSONB-blob storage that mirrors localStorage's existing StudioProduct/FunnelDefinition shapes
// exactly — the Studio's business logic still reads/writes localStorage synchronously during a session;
// this only keeps Supabase as a durable, cross-device copy of the same data, written on every save.

export async function pullFromSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const [funnelsResult, productsResult] = await Promise.all([
    supabase.from("funnels").select("data").eq("owner_id", userId),
    supabase.from("products").select("data").eq("owner_id", userId),
  ]);
  if (funnelsResult.error) console.error("pullFromSupabase (funnels) failed", funnelsResult.error);
  if (productsResult.error) console.error("pullFromSupabase (products) failed", productsResult.error);
  for (const row of funnelsResult.data ?? []) {
    const parsed = funnelSchema.safeParse(row["data"]);
    if (parsed.success) saveFunnel(localStorage, parsed.data);
  }
  const products = (productsResult.data ?? []).map((row) => row["data"] as StudioProduct);
  if (products.length) saveProducts(localStorage, products);
}

export async function pushFunnelToSupabase(userId: string, funnel: FunnelDefinition): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("funnels").upsert({ id: funnel.id, owner_id: userId, data: funnel, updated_at: new Date().toISOString() });
  if (error) console.error("pushFunnelToSupabase failed", error);
}

export async function pushProductsToSupabase(userId: string, products: StudioProduct[]): Promise<void> {
  if (!products.length) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("products").upsert(
    products.map((product) => ({ id: product.id, owner_id: userId, data: product, updated_at: new Date().toISOString() })),
  );
  if (error) console.error("pushProductsToSupabase failed", error);
}

export async function deleteFunnelFromSupabase(funnelId: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().from("funnels").delete().eq("id", funnelId);
  if (error) console.error("deleteFunnelFromSupabase failed", error);
}

export async function deleteProductFromSupabase(productId: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().from("products").delete().eq("id", productId);
  if (error) console.error("deleteProductFromSupabase failed", error);
}

/** Pushes everything currently in localStorage — used once after first login so existing local data
 * (built up before Supabase was wired in) becomes visible in the cloud without waiting for the next edit. */
export async function pushAllLocalToSupabase(userId: string): Promise<void> {
  const products = ensureProducts(localStorage);
  await pushProductsToSupabase(userId, products);
  const projects = loadProjects(localStorage);
  for (const project of projects) {
    const funnel = loadFunnel(localStorage, project.id);
    if (funnel) await pushFunnelToSupabase(userId, funnel);
  }
}
