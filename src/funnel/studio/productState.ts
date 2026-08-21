import type { FunnelDefinition } from "../schema/v1";
import { loadProjects, uid, type StudioStorage } from "./studioState";

export const PRODUCT_INDEX_KEY = "funnel-studio:v1:product-catalog";

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
  if (products.length) return products;
  const funnels = loadProjects(storage);
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
