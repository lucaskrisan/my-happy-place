import type { InventoryObject } from "./remoteAssetCleanup";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
export async function fetchAssetInventory(funnelId: string, token: string): Promise<{ objects: InventoryObject[]; truncated: boolean; cursor?: string }> {
  const response = await fetch(`/api/studio/assets/inventory?funnelId=${encodeURIComponent(funnelId)}`, { headers: auth(token) });
  if (!response.ok) throw new Error(response.status === 401 ? "Autorização inválida." : response.status === 503 ? "Gerenciamento remoto não está configurado." : "Não foi possível carregar os arquivos.");
  return response.json();
}
export async function deleteRemoteAssetObject(funnelId: string, assetId: string, r2Key: string, token: string) {
  const response = await fetch("/api/studio/assets/object", { method: "DELETE", headers: { ...auth(token), "Content-Type": "application/json" }, body: JSON.stringify({ funnelId, assetId, r2Key }) });
  if (!response.ok) throw new Error(response.status === 401 ? "Autorização inválida." : response.status === 503 ? "Gerenciamento remoto não está configurado." : response.status === 400 ? "Este arquivo não pertence ao armazenamento deste projeto." : "Não foi possível excluir o arquivo.");
  return response.json() as Promise<{ deleted: boolean; key: string }>;
}
