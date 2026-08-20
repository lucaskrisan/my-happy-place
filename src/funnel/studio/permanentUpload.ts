import type { AssetRef } from "../schema/v1";
import { isStudioMediaType, studioMediaTypeForMime } from "../assets/mediaPolicy";

export { isStudioMediaType, studioMediaTypeForMime };

export type UploadStatus = "waiting" | "uploading" | "processing" | "completed" | "error" | "cancelled";

export type PermanentUploadResult = {
  assetId: string;
  key: string;
  src: string;
  filename: string;
  contentType: string;
  size: number;
  etag: string;
  uploadedAt: string;
};

export type UploadErrorCode = "unauthorized" | "too_large" | "invalid_type" | "cancelled" | "offline" | "server";

export class PermanentUploadError extends Error {
  constructor(
    public readonly code: UploadErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type UploadProgress = (progress: number, status: UploadStatus) => void;

export type UploadXmlHttpRequest = {
  readonly upload: { onprogress: ((event: ProgressEvent<EventTarget>) => void) | null };
  readyState: number;
  status: number;
  responseText: string;
  onload: ((event: ProgressEvent<EventTarget>) => void) | null;
  onerror: ((event: ProgressEvent<EventTarget>) => void) | null;
  onabort: ((event: ProgressEvent<EventTarget>) => void) | null;
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body: Document | XMLHttpRequestBodyInit | null): void;
  abort(): void;
};

export type UploadPermanentAssetInput = {
  funnelId: string;
  assetId: string;
  file: File;
  token: string;
  onProgress?: UploadProgress;
  signal?: AbortSignal;
  endpoint?: string;
  xhrFactory?: () => UploadXmlHttpRequest;
};

const humanError = (status: number): PermanentUploadError => {
  if (status === 401 || status === 403)
    return new PermanentUploadError("unauthorized", "Upload não autorizado.");
  if (status === 413)
    return new PermanentUploadError("too_large", "Este arquivo é maior que o limite atual.");
  if (status === 415)
    return new PermanentUploadError("invalid_type", "Este tipo de arquivo não é permitido.");
  return new PermanentUploadError("server", "Não foi possível salvar o arquivo. Tente novamente.");
};

export function uploadPermanentAsset({
  funnelId,
  assetId,
  file,
  token,
  onProgress,
  signal,
  endpoint = "/api/studio/assets/upload",
  xhrFactory = () => new XMLHttpRequest(),
}: UploadPermanentAssetInput): Promise<PermanentUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = xhrFactory();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const abort = () => {
      xhr.abort();
    };
    if (signal?.aborted) {
      onProgress?.(0, "cancelled");
      reject(new PermanentUploadError("cancelled", "Upload cancelado."));
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    onProgress?.(0, "waiting");
    xhr.open("PUT", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Studio-Funnel-Id", funnelId);
    xhr.setRequestHeader("X-Studio-Asset-Id", assetId);
    xhr.setRequestHeader("X-Studio-Filename", encodeURIComponent(file.name));
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)), "uploading");
    };
    xhr.onload = () =>
      finish(() => {
        if (xhr.status < 200 || xhr.status >= 300) {
          onProgress?.(0, "error");
          return reject(humanError(xhr.status));
        }
        try {
          onProgress?.(100, "processing");
          const result = JSON.parse(xhr.responseText) as PermanentUploadResult;
          if (!result.assetId || !result.src.startsWith("/media/")) throw new Error("Invalid response");
          onProgress?.(100, "completed");
          resolve(result);
        } catch {
          onProgress?.(0, "error");
          reject(new PermanentUploadError("server", "Não foi possível salvar o arquivo. Tente novamente."));
        }
      });
    xhr.onerror = () =>
      finish(() => {
        onProgress?.(0, "error");
        reject(new PermanentUploadError("offline", "Sem conexão com o servidor."));
      });
    xhr.onabort = () =>
      finish(() => {
        onProgress?.(0, "cancelled");
        reject(new PermanentUploadError("cancelled", "Upload cancelado."));
      });
    onProgress?.(0, "uploading");
    xhr.send(file);
  });
}

/** Promote only after the Worker confirms R2 storage; all existing references keep this id. */
export function promotePreviewAsset(
  asset: Extract<AssetRef, { source: "preview" }>,
  result: PermanentUploadResult,
): Extract<AssetRef, { source: "permanent" }> {
  if (asset.id !== result.assetId) throw new Error("Upload result does not match preview asset");
  return {
    id: asset.id,
    mediaType: asset.mediaType,
    source: "permanent",
    url: result.src,
    fileName: result.filename,
    contentType: result.contentType,
    size: result.size,
    uploadedAt: result.uploadedAt,
    r2Key: result.key,
    etag: result.etag,
  };
}
