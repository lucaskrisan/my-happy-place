import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { isStudioMediaType, STUDIO_MEDIA_TYPES } from "./funnel/assets/mediaPolicy";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type R2ObjectMetadata = {
  contentType?: string;
  cacheControl?: string;
};

type R2ObjectHead = {
  size: number;
  httpEtag: string;
  httpMetadata?: R2ObjectMetadata;
};

type R2Object = R2ObjectHead & {
  body: ReadableStream;
};

type FunnelMediaBucket = {
  get: (
    key: string,
    options?: { range: { offset: number; length?: number } },
  ) => Promise<R2Object | null>;
  head: (key: string) => Promise<R2ObjectHead | null>;
  put: (
    key: string,
    body: ReadableStream,
    options: {
      httpMetadata: { contentType: string; cacheControl: string };
      customMetadata: Record<string, string>;
    },
  ) => Promise<(R2ObjectHead & { key: string; uploaded: Date }) | null>;
};

export type WorkerEnv = {
  FUNNEL_MEDIA?: FunnelMediaBucket;
  STUDIO_UPLOAD_TOKEN?: string;
};

export const STUDIO_UPLOAD_PATH = "/api/studio/assets/upload";
export const STUDIO_UPLOAD_LIMIT_BYTES = 90 * 1024 * 1024;
export const STUDIO_UPLOAD_MIME_TYPES = STUDIO_MEDIA_TYPES;

type StudioUploadResponse = {
  assetId: string;
  key: string;
  src: string;
  filename: string;
  contentType: string;
  size: number;
  etag: string;
  uploadedAt: string;
};

type ByteRange = {
  offset: number;
  length: number;
  end: number;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function parseRange(value: string | null, size: number): ByteRange | "invalid" | undefined {
  if (!value) return undefined;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match) return "invalid";

  const startValue = match[1];
  const endValue = match[2];
  if (!startValue && !endValue) return "invalid";

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    const length = Math.min(suffixLength, size);
    return { offset: size - length, length, end: size - 1 };
  }

  const offset = Number(startValue);
  const requestedEnd = endValue ? Number(endValue) : size - 1;
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(requestedEnd) ||
    offset < 0 ||
    requestedEnd < offset ||
    offset >= size
  ) {
    return "invalid";
  }

  const end = Math.min(requestedEnd, size - 1);
  return { offset, length: end - offset + 1, end };
}

function getMediaKey(pathname: string): string | undefined {
  const rawKey = pathname.slice("/media/".length);
  if (!rawKey) return undefined;

  try {
    const key = decodeURIComponent(rawKey);
    if (key.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
      return undefined;
    }
    return key;
  } catch {
    return undefined;
  }
}

export function sanitizeStudioSegment(value: string, fallback: string): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
  return sanitized || fallback;
}

export function sanitizeStudioFilename(value: string): string {
  const name = value.replace(/\\/g, "/").split("/").at(-1) ?? "upload";
  return sanitizeStudioSegment(name, "upload");
}

export function buildStudioAssetKey(
  funnelId: string,
  assetId: string,
  filename: string,
  version = `${Date.now().toString(36)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`,
): string {
  return `funnels/${sanitizeStudioSegment(funnelId, "funnel")}/assets/${sanitizeStudioSegment(assetId, "asset")}/${version}-${sanitizeStudioFilename(filename)}`;
}

function studioUploadError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function decodeUploadFilename(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const decoded = decodeURIComponent(value);
    return decoded && decoded.length <= 512 ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export async function handleStudioAssetUpload(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (request.method !== "PUT")
    return new Response("Method not allowed", { status: 405, headers: { Allow: "PUT" } });

  const secret = env.STUDIO_UPLOAD_TOKEN;
  const authorized = secret && request.headers.get("Authorization") === `Bearer ${secret}`;
  if (!authorized) return studioUploadError(secret ? 401 : 503, secret ? "Upload unauthorized" : "Upload unavailable");
  if (!env.FUNNEL_MEDIA) return studioUploadError(503, "Upload unavailable");

  const funnelId = request.headers.get("X-Studio-Funnel-Id")?.trim();
  const assetId = request.headers.get("X-Studio-Asset-Id")?.trim();
  const filename = decodeUploadFilename(request.headers.get("X-Studio-Filename"));
  if (!funnelId || !assetId || !filename || !request.body)
    return studioUploadError(400, "Invalid upload request");

  const contentType = (request.headers.get("Content-Type") ?? "").split(";", 1)[0]!.trim().toLowerCase();
  if (!isStudioMediaType(contentType))
    return studioUploadError(415, "Unsupported media type");

  const rawLength = request.headers.get("Content-Length");
  const size = rawLength ? Number(rawLength) : NaN;
  if (!Number.isSafeInteger(size) || size <= 0) return studioUploadError(411, "Content length required");
  if (size > STUDIO_UPLOAD_LIMIT_BYTES) return studioUploadError(413, "Upload exceeds current limit");

  const uploadedAt = new Date().toISOString();
  const key = buildStudioAssetKey(funnelId, assetId, filename);
  try {
    const object = await env.FUNNEL_MEDIA.put(key, request.body, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        funnelId: sanitizeStudioSegment(funnelId, "funnel"),
        assetId: sanitizeStudioSegment(assetId, "asset"),
        filename: sanitizeStudioFilename(filename),
        uploadedAt,
      },
    });
    if (!object) return studioUploadError(500, "Unable to save upload");
    const payload: StudioUploadResponse = {
      assetId,
      key: object.key,
      src: `/media/${object.key.split("/").map(encodeURIComponent).join("/")}`,
      filename: sanitizeStudioFilename(filename),
      contentType,
      size: object.size,
      etag: object.httpEtag,
      uploadedAt: object.uploaded.toISOString(),
    };
    return Response.json(payload, { status: 201 });
  } catch (error) {
    console.error("Studio upload failed", error);
    return studioUploadError(500, "Unable to save upload");
  }
}

function mediaHeaders(object: R2ObjectHead, contentLength: number): Headers {
  return new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": object.httpMetadata?.cacheControl ?? "public, max-age=86400",
    "Content-Length": String(contentLength),
    "Content-Type": object.httpMetadata?.contentType ?? "video/mp4",
    ETag: object.httpEtag,
  });
}

async function handleMediaRequest(request: Request, bucket: FunnelMediaBucket): Promise<Response> {
  const url = new URL(request.url);
  const key = getMediaKey(url.pathname);
  if (!key) return new Response("Not found", { status: 404 });

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const metadata = await bucket.head(key);
  if (!metadata) return new Response("Not found", { status: 404 });

  const range = parseRange(request.headers.get("Range"), metadata.size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${metadata.size}`, "Accept-Ranges": "bytes" },
    });
  }

  const contentLength = range?.length ?? metadata.size;
  const headers = mediaHeaders(metadata, contentLength);
  if (range) headers.set("Content-Range", `bytes ${range.offset}-${range.end}/${metadata.size}`);

  if (request.method === "HEAD") {
    return new Response(null, { status: range ? 206 : 200, headers });
  }

  const object = await bucket.get(key, range ? { range: { offset: range.offset, length: range.length } } : undefined);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: unknown) {
    try {
      if (new URL(request.url).pathname.startsWith("/media/")) {
        if (!env.FUNNEL_MEDIA) {
          return new Response("Media storage is not configured", { status: 503 });
        }
        return await handleMediaRequest(request, env.FUNNEL_MEDIA);
      }
      if (new URL(request.url).pathname === STUDIO_UPLOAD_PATH) {
        return await handleStudioAssetUpload(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
