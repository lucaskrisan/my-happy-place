import type { FunnelDefinition } from "../schema/v1";
import { deleteFunnelData, loadProjects, uid, type StudioStorage } from "./studioState";
import { marinaProofFunnel } from "../definitions/marinaProofs";

export const PRODUCT_INDEX_KEY = "funnel-studio:v1:product-catalog";
/** The technical runtime proof (see src/routes/dev/funnel-runtime-proof.tsx) must never be treated as a
 * product's official funnel — it exists only to exercise the runtime engine under /dev. */
const TECHNICAL_PROOF_FUNNEL_ID = marinaProofFunnel.id;

export type StudioProduct = {
  id: string;
  name: string;
  description?: string;
  funnelIds: string[];
  createdAt: number;
  updatedAt: number;
};

const safeRead = (storage: StudioStorage): StudioProduct[] => {
  try {
    const value = JSON.parse(storage.getItem(PRODUCT_INDEX_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export function saveProducts(storage: StudioStorage, products: StudioProduct[]) {
  storage.setItem(PRODUCT_INDEX_KEY, JSON.stringify(products));
}

/** Migrates the existing local Funnel Studio index into the first product without copying funnels. */
export function ensureProducts(storage: StudioStorage): StudioProduct[] {
  const products = safeRead(storage);
  if (products.length) return sanitizeTechnicalProof(storage, products);
  const funnels = loadProjects(storage).filter((funnel) => funnel.id !== TECHNICAL_PROOF_FUNNEL_ID);
  const now = Date.now();
  const starter: StudioProduct = {
    id: "product-desafio-14-dias",
    name: "DESAFIO 14 DIAS",
    description: "Produto principal com a experiência interativa da Marina.",
    funnelIds: funnels.map((funnel) => funnel.id),
    createdAt: now,
    updatedAt: now,
  };
  saveProducts(storage, [starter]);
  return [starter];
}

/** Self-heals product state saved before the technical proof was excluded from product catalogs:
 * removes marina-runtime-proof from every product's funnel list so it never displays as an official funnel. */
function sanitizeTechnicalProof(storage: StudioStorage, products: StudioProduct[]): StudioProduct[] {
  let changed = false;
  const next = products.map((product) => {
    if (!product.funnelIds.includes(TECHNICAL_PROOF_FUNNEL_ID)) return product;
    changed = true;
    return { ...product, funnelIds: product.funnelIds.filter((id) => id !== TECHNICAL_PROOF_FUNNEL_ID) };
  });
  if (changed) saveProducts(storage, next);
  return next;
}

/** Moves a funnel to the front of a product's funnel list so it reliably acts as the "Funil Principal". */
export function pinFunnelFirst(storage: StudioStorage, productId: string, funnelId: string) {
  const products = ensureProducts(storage).map((product) => {
    if (product.id !== productId || !product.funnelIds.includes(funnelId)) return product;
    return { ...product, funnelIds: [funnelId, ...product.funnelIds.filter((id) => id !== funnelId)] };
  });
  saveProducts(storage, products);
  return products.find((product) => product.id === productId);
}

export function createProduct(storage: StudioStorage, name: string, description?: string): StudioProduct {
  const product: StudioProduct = {
    id: uid("product"),
    name: name.trim(),
    ...(description?.trim() ? { description: description.trim() } : {}),
    funnelIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveProducts(storage, [...ensureProducts(storage), product]);
  return product;
}

export function attachFunnel(storage: StudioStorage, productId: string, funnel: FunnelDefinition) {
  const products = ensureProducts(storage).map((product) =>
    product.id !== productId
      ? product
      : {
          ...product,
          funnelIds: product.funnelIds.includes(funnel.id)
            ? product.funnelIds
            : [...product.funnelIds, funnel.id],
          updatedAt: Date.now(),
        },
  );
  saveProducts(storage, products);
  return products.find((product) => product.id === productId);
}

export function productFunnelCount(product: StudioProduct) {
  return product.funnelIds.length;
}

export function renameProduct(storage: StudioStorage, productId: string, name: string, description?: string) {
  const products = ensureProducts(storage).map((product) =>
    product.id !== productId
      ? product
      : { ...product, name: name.trim() || product.name, ...(description?.trim() ? { description: description.trim() } : {}), updatedAt: Date.now() },
  );
  saveProducts(storage, products);
  return products.find((product) => product.id === productId);
}

/** Deletes a product and, for any funnel that was only attached to this product, its underlying data too
 * (a funnel attached to more than one product is left alone so the other product keeps working). */
export function deleteProduct(storage: StudioStorage, productId: string) {
  const products = ensureProducts(storage);
  const target = products.find((product) => product.id === productId);
  const remaining = products.filter((product) => product.id !== productId);
  saveProducts(storage, remaining);
  if (target) {
    const stillReferenced = new Set(remaining.flatMap((product) => product.funnelIds));
    for (const funnelId of target.funnelIds) if (!stillReferenced.has(funnelId)) deleteFunnelData(storage, funnelId);
  }
  return remaining;
}
