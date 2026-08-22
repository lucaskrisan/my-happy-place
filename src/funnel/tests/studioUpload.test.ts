import { describe, expect, it, vi } from "vitest";
import {
  STUDIO_UPLOAD_LIMIT_BYTES,
  buildStudioAssetKey,
  handleStudioAssetUpload,
  handleStudioAssetDelete,
  handleStudioAssetInventory,
  type WorkerEnv,
} from "../../server";
import {
  PermanentUploadError,
  promotePreviewAsset,
  uploadPermanentAsset,
  type UploadXmlHttpRequest,
} from "../studio/permanentUpload";

// Upload authorization now runs entirely on the caller's Supabase session (no shared static upload
// token) — this fakes the Supabase Admin API's auth.getUser(token) so tests can exercise "signed in with
// a valid session" vs "no session / expired session" without hitting a real Supabase project.
const VALID_TOKEN = "valid-session-token";
const FAKE_SUPABASE_SECRET = "test-fixture-service-role-key";
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) =>
        token === VALID_TOKEN
          ? { data: { user: { id: "user-1" } }, error: null }
          : { data: { user: null }, error: new Error("invalid or expired session") },
    },
  }),
}));

const headers = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${VALID_TOKEN}`,
  "X-Studio-Funnel-Id": "funnel/a",
  "X-Studio-Asset-Id": "asset/../one",
  "X-Studio-Filename": encodeURIComponent("../Vídeo final.mp4"),
  "Content-Type": "video/mp4",
  "Content-Length": "4",
  ...extra,
});

function request(extra: Record<string, string> = {}) {
  return new Request("https://example.test/api/studio/assets/upload", {
    method: "PUT",
    headers: headers(extra),
    body: "test",
  });
}

function environment(put?: NonNullable<WorkerEnv["FUNNEL_MEDIA"]>): WorkerEnv {
  const base: WorkerEnv = { SUPABASE_URL: "https://example.test", SUPABASE_SECRET_KEY: FAKE_SUPABASE_SECRET };
  return put ? { ...base, FUNNEL_MEDIA: put } : base;
}

describe("studio upload endpoint", () => {
  it("rejects a signed-out (missing) or invalid/expired session — no manual token accepted or required", async () => {
    const env = environment({ put: async () => null, get: async () => null, head: async () => null });
    expect((await handleStudioAssetUpload(new Request("https://x/api", { method: "PUT" }), env)).status).toBe(401);
    expect((await handleStudioAssetUpload(request({ Authorization: "Bearer expired-or-wrong" }), env)).status).toBe(401);
  });

  it("disables uploads when Supabase isn't configured server-side (not when a client token is missing)", async () => {
    const env = environment({ put: async () => null, get: async () => null, head: async () => null });
    delete env.SUPABASE_URL;
    expect((await handleStudioAssetUpload(request(), env)).status).toBe(503);
  });

  it("enforces MIME and content length limits before R2, for an authenticated user", async () => {
    const bucket = { put: async () => null, get: async () => null, head: async () => null };
    expect((await handleStudioAssetUpload(request({ "Content-Type": "text/html" }), environment(bucket))).status).toBe(415);
    expect((await handleStudioAssetUpload(request({ "Content-Length": "" }), environment(bucket))).status).toBe(411);
    expect((await handleStudioAssetUpload(request({ "Content-Length": "not-a-number" }), environment(bucket))).status).toBe(411);
    expect((await handleStudioAssetUpload(request({ "Content-Length": "0" }), environment(bucket))).status).toBe(411);
    expect((await handleStudioAssetUpload(request({ "Content-Length": String(STUDIO_UPLOAD_LIMIT_BYTES + 1) }), environment(bucket))).status).toBe(413);
  });

  it("sanitizes object keys and streams the request body to R2 with metadata for a valid session", async () => {
    let received: { key?: string; body?: ReadableStream; metadata?: unknown } = {};
    const bucket = {
      put: async (key: string, body: ReadableStream, metadata: unknown) => {
        received = { key, body, metadata };
        return { key, size: 4, httpEtag: '"etag"', uploaded: new Date("2026-01-01T00:00:00.000Z") };
      },
      get: async () => null,
      head: async () => null,
    };
    const response = await handleStudioAssetUpload(request(), environment(bucket));
    const raw = await response.text();
    const json = JSON.parse(raw) as { src: string; assetId: string; filename: string };
    expect(response.status).toBe(201);
    expect(received.key).toMatch(/^funnels\/funnel-a\/assets\/asset-..-one\//);
    expect(received.key).not.toContain("../");
    expect(await new Response(received.body).text()).toBe("test");
    expect(received.metadata).toMatchObject({ httpMetadata: { contentType: "video/mp4" } });
    expect(json.src).toMatch(/^\/media\/funnels\//);
    expect(json.assetId).toBe("asset/../one");
    expect(json.filename).toBe("Video-final.mp4");
    // No secret (Supabase service key, or anything else server-side) is ever echoed back to the browser.
    expect(raw).not.toContain(FAKE_SUPABASE_SECRET);
    expect(raw).not.toMatch(/token|secret/i);
  });

  it("returns a safe server error when R2 fails", async () => {
    const bucket = { put: async () => { throw new Error("R2 exploded"); }, get: async () => null, head: async () => null };
    const response = await handleStudioAssetUpload(request(), environment(bucket));
    expect(response.status).toBe(500);
    expect((await response.json()) as { error: string }).toEqual({ error: "Unable to save upload" });
  });

  it("builds a bounded traversal-safe key", () => {
    const key = buildStudioAssetKey("../../funnel", "a/b", "../../x.mp4", "version");
    expect(key).toBe("funnels/funnel/assets/a-b/version-x.mp4");
  });
});

describe("studio asset cleanup endpoint", () => {
  const remove = (body: unknown, token = VALID_TOKEN) => new Request("https://example.test/api/studio/assets/object", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  it("rejects unconfigured Supabase, invalid/expired sessions, traversal, other funnels and legacy media", async () => {
    const bucket = { put: async () => null, get: async () => null, head: async () => null, delete: async () => undefined, list: async () => ({ objects: [], truncated: false }) };
    expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: "funnels/f/assets/a/v.mp4" }), {})).status).toBe(503);
    expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: "funnels/f/assets/a/v.mp4" }, "expired-or-wrong"), environment(bucket))).status).toBe(401);
    for (const key of ["funnels/f/assets/a/../x", "funnels/other/assets/a/v", "scene-02/video/scene.mp4"]) expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: key }), environment(bucket))).status).toBe(400);
  });
  it("deletes only a valid studio key and inventories only its funnel prefix, for a signed-in user", async () => {
    let deleted = "", prefix = "";
    const bucket = { put: async () => null, get: async () => null, head: async () => null, delete: async (key: string | string[]) => { deleted = Array.isArray(key) ? key[0]! : key; }, list: async ({ prefix: value }: { prefix: string }) => { prefix = value; return { objects: [], truncated: false }; } };
    const key = "funnels/f/assets/a/v.mp4";
    expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: key }), environment(bucket))).status).toBe(200);
    expect(deleted).toBe(key);
    expect((await handleStudioAssetInventory(new Request("https://x/api/studio/assets/inventory?funnelId=f", { headers: { Authorization: `Bearer ${VALID_TOKEN}` } }), environment(bucket))).status).toBe(200);
    expect(prefix).toBe("funnels/f/assets/");
  });
});

class FakeXhr implements UploadXmlHttpRequest {
  upload = { onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null };
  readyState = 0;
  status = 201;
  responseText = JSON.stringify({ assetId: "preview", key: "funnels/f/assets/preview/v-file.mp4", src: "/media/funnels/f/assets/preview/v-file.mp4", filename: "file.mp4", contentType: "video/mp4", size: 4, etag: '"etag"', uploadedAt: "2026-01-01T00:00:00.000Z" });
  onload: ((event: ProgressEvent<EventTarget>) => void) | null = null;
  onerror: ((event: ProgressEvent<EventTarget>) => void) | null = null;
  onabort: ((event: ProgressEvent<EventTarget>) => void) | null = null;
  headers = new Map<string, string>();
  open() {}
  setRequestHeader(name: string, value: string) { this.headers.set(name, value); }
  send() {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 4 } as ProgressEvent<EventTarget>);
    this.onload?.({} as ProgressEvent<EventTarget>);
  }
  abort() { this.onabort?.({} as ProgressEvent<EventTarget>); }
}

describe("studio upload client", () => {
  // The client-side uploader takes whatever bearer token it's handed — it doesn't know or care whether
  // that's a Supabase access token or (as before) a manually pasted secret. What changed is *where the
  // token comes from* on the React side (the live Supabase session, not sessionStorage), covered above.
  const input = (xhr: FakeXhr, overrides: Partial<Parameters<typeof uploadPermanentAsset>[0]> = {}) => ({
    funnelId: "funnel",
    assetId: "preview",
    file: new File(["test"], "file.mp4", { type: "video/mp4" }),
    token: VALID_TOKEN,
    xhrFactory: () => xhr,
    ...overrides,
  });

  it("reports upload progress and returns a permanent R2 result", async () => {
    const xhr = new FakeXhr();
    const progress: number[] = [];
    const result = await uploadPermanentAsset({ ...input(xhr), onProgress: (value) => progress.push(value) });
    expect(progress).toContain(50);
    expect(progress.at(-1)).toBe(100);
    expect(result.src).toMatch(/^\/media\//);
    expect(xhr.headers.get("Authorization")).toBe(`Bearer ${VALID_TOKEN}`);
  });

  it("maps unauthorized errors and cancellation", async () => {
    const unauthorized = new FakeXhr();
    unauthorized.status = 401;
    await expect(uploadPermanentAsset(input(unauthorized))).rejects.toMatchObject({ code: "unauthorized" });
    const cancelled = new FakeXhr();
    cancelled.send = () => undefined;
    const controller = new AbortController();
    const pending = uploadPermanentAsset({ ...input(cancelled), signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(PermanentUploadError);
  });

  it("promotes a preview only after success and preserves its asset id", () => {
    const preview = { id: "preview", mediaType: "video" as const, source: "preview" as const, fileName: "file.mp4", objectUrl: "blob:preview" };
    const xhr = new FakeXhr();
    const result = JSON.parse(xhr.responseText) as Parameters<typeof promotePreviewAsset>[1];
    const permanent = promotePreviewAsset(preview, result);
    expect(permanent).toMatchObject({ id: "preview", source: "permanent", url: result.src });
    expect(() => promotePreviewAsset(preview, { ...result, assetId: "other" })).toThrow();
  });
});
