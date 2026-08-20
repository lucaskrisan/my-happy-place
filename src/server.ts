import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

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
};

type WorkerEnv = {
  FUNNEL_MEDIA?: FunnelMediaBucket;
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
