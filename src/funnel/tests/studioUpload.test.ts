import { describe, expect, it } from "vitest";
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

const headers = (extra: Record<string, string> = {}) => ({
  Authorization: "Bearer secret",
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
  return put ? { STUDIO_UPLOAD_TOKEN: "secret", FUNNEL_MEDIA: put } : { STUDIO_UPLOAD_TOKEN: "secret" };
}

describe("studio upload endpoint", () => {
  it("rejects missing or invalid upload credentials", async () => {
    const env = environment({ put: async () => null, get: async () => null, head: async () => null });
    expect((await handleStudioAssetUpload(new Request("https://x/api", { method: "PUT" }), env)).status).toBe(401);
    expect((await handleStudioAssetUpload(request({ Authorization: "Bearer wrong" }), env)).status).toBe(401);
  });

  it("disables uploads when the server secret is absent", async () => {
    const env = environment({ put: async () => null, get: async () => null, head: async () => null });
    delete env.STUDIO_UPLOAD_TOKEN;
    expect((await handleStudioAssetUpload(request(), env)).status).toBe(503);
  });

  it("enforces MIME and content length limits before R2", async () => {
    const bucket = { put: async () => null, get: async () => null, head: async () => null };
    expect((await handleStudioAssetUpload(request({ "Content-Type": "text/html" }), environment(bucket))).status).toBe(415);
    expect((await handleStudioAssetUpload(request({ "Content-Length": "" }), environment(bucket))).status).toBe(411);
    expect((await handleStudioAssetUpload(request({ "Content-Length": "not-a-number" }), environment(bucket))).status).toBe(411);
    expect((await handleStudioAssetUpload(request({ "Content-Length": "0" }), environment(bucket))).status).toBe(411);
    expect((await handleStudioAssetUpload(request({ "Content-Length": String(STUDIO_UPLOAD_LIMIT_BYTES + 1) }), environment(bucket))).status).toBe(413);
  });

  it("sanitizes object keys and streams the request body to R2 with metadata", async () => {
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
    const json = (await response.json()) as { src: string; assetId: string; filename: string };
    expect(response.status).toBe(201);
    expect(received.key).toMatch(/^funnels\/funnel-a\/assets\/asset-..-one\//);
    expect(received.key).not.toContain("../");
    expect(await new Response(received.body).text()).toBe("test");
    expect(received.metadata).toMatchObject({ httpMetadata: { contentType: "video/mp4" } });
    expect(json.src).toMatch(/^\/media\/funnels\//);
    expect(json.assetId).toBe("asset/../one");
    expect(json.filename).toBe("Video-final.mp4");
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
  const remove = (body: unknown, token = "secret") => new Request("https://example.test/api/studio/assets/object", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  it("rejects missing secrets, invalid tokens, traversal, other funnels and legacy media", async () => {
    const bucket = { put: async () => null, get: async () => null, head: async () => null, delete: async () => undefined, list: async () => ({ objects: [], truncated: false }) };
    expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: "funnels/f/assets/a/v.mp4" }), {})).status).toBe(503);
    expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: "funnels/f/assets/a/v.mp4" }, "wrong"), environment(bucket))).status).toBe(401);
    for (const key of ["funnels/f/assets/a/../x", "funnels/other/assets/a/v", "scene-02/video/scene.mp4"]) expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: key }), environment(bucket))).status).toBe(400);
  });
  it("deletes only a valid studio key and inventories only its funnel prefix", async () => {
    let deleted = "", prefix = "";
    const bucket = { put: async () => null, get: async () => null, head: async () => null, delete: async (key: string | string[]) => { deleted = Array.isArray(key) ? key[0]! : key; }, list: async ({ prefix: value }: { prefix: string }) => { prefix = value; return { objects: [], truncated: false }; } };
    const key = "funnels/f/assets/a/v.mp4";
    expect((await handleStudioAssetDelete(remove({ funnelId: "f", assetId: "a", r2Key: key }), environment(bucket))).status).toBe(200);
    expect(deleted).toBe(key);
    expect((await handleStudioAssetInventory(new Request("https://x/api/studio/assets/inventory?funnelId=f", { headers: { Authorization: "Bearer secret" } }), environment(bucket))).status).toBe(200);
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
  const input = (xhr: FakeXhr, overrides: Partial<Parameters<typeof uploadPermanentAsset>[0]> = {}) => ({
    funnelId: "funnel",
    assetId: "preview",
    file: new File(["test"], "file.mp4", { type: "video/mp4" }),
    token: "secret",
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
    expect(xhr.headers.get("Authorization")).toBe("Bearer secret");
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
