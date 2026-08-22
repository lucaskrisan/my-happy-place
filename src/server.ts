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
  delete?: (key: string | string[]) => Promise<void>;
  list?: (options: { prefix: string; cursor?: string }) => Promise<{ objects: Array<{ key: string; size: number; etag: string; uploaded: Date; httpMetadata?: R2ObjectMetadata }>; truncated: boolean; cursor?: string }>;
};

export type WorkerEnv = {
  FUNNEL_MEDIA?: FunnelMediaBucket;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  KAWAIPAY_WEBHOOK_TOKEN?: string;
};

export const STUDIO_UPLOAD_PATH = "/api/studio/assets/upload";
export const STUDIO_ASSET_DELETE_PATH = "/api/studio/assets/object";
export const STUDIO_ASSET_INVENTORY_PATH = "/api/studio/assets/inventory";
export const STUDIO_UPLOAD_LIMIT_BYTES = 90 * 1024 * 1024;
export const STUDIO_UPLOAD_MIME_TYPES = STUDIO_MEDIA_TYPES;
export const ADMIN_CLIENTS_PATH = "/api/admin/clients";
export const BILLING_CHECKOUT_PATH = "/api/billing/checkout-session";
export const BILLING_SUBSCRIBE_PATH = "/api/billing/subscribe";
export const BILLING_WEBHOOK_PATH = "/api/billing/webhook";
export const KAWAIPAY_WEBHOOK_PATH = "/api/billing/kawaipay-webhook";

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

function studioAssetPrefix(funnelId: string, assetId?: string) {
  const funnel = sanitizeStudioSegment(funnelId, "funnel");
  return `funnels/${funnel}/assets/${assetId ? `${sanitizeStudioSegment(assetId, "asset")}/` : ""}`;
}

// Any signed-in Studio user may upload/manage their own permanent media — this is not an admin-only
// action. The caller's Supabase access token (the same one already used for /studio, /studio/admin, and
// billing) proves who they are; we verify it server-side against Supabase before touching R2. No shared
// static secret, no token pasted into the UI, and nothing beyond a pass/fail ever reaches the browser.
async function requireStudioUser(request: Request, env: WorkerEnv): Promise<{ userId: string } | { error: Response }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return { error: studioUploadError(503, "Upload unavailable") };
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: studioUploadError(401, "Unauthorized") };
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { error: studioUploadError(401, "Unauthorized") };
  return { userId: data.user.id };
}

export async function handleStudioAssetDelete(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "DELETE") return new Response("Method not allowed", { status: 405, headers: { Allow: "DELETE" } });
  const auth = await requireStudioUser(request, env);
  if ("error" in auth) return auth.error;
  if (!env.FUNNEL_MEDIA?.delete) return studioUploadError(503, "Remote management unavailable");
  let body: { funnelId?: string; assetId?: string; r2Key?: string };
  try { body = await request.json(); } catch { return studioUploadError(400, "Invalid delete request"); }
  if (!body.funnelId || !body.assetId || !body.r2Key || body.r2Key.split("/").some((segment) => !segment || segment === "." || segment === "..") || !body.r2Key.startsWith(studioAssetPrefix(body.funnelId, body.assetId))) return studioUploadError(400, "Invalid asset key");
  try { await env.FUNNEL_MEDIA.delete(body.r2Key); return Response.json({ deleted: true, key: body.r2Key }); }
  catch { return studioUploadError(500, "Unable to delete file"); }
}

export async function handleStudioAssetInventory(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });
  const auth = await requireStudioUser(request, env);
  if ("error" in auth) return auth.error;
  if (!env.FUNNEL_MEDIA?.list) return studioUploadError(503, "Remote management unavailable");
  const url = new URL(request.url), funnelId = url.searchParams.get("funnelId");
  if (!funnelId) return studioUploadError(400, "Invalid inventory request");
  const listed = await env.FUNNEL_MEDIA.list({ prefix: studioAssetPrefix(funnelId), ...(url.searchParams.get("cursor") ? { cursor: url.searchParams.get("cursor")! } : {}) });
  return Response.json({ objects: listed.objects.map((item) => ({ key: item.key, size: item.size, etag: item.etag, uploadedAt: item.uploaded.toISOString(), contentType: item.httpMetadata?.contentType })), truncated: listed.truncated, cursor: listed.cursor });
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

  const auth = await requireStudioUser(request, env);
  if ("error" in auth) return auth.error;
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

// Creating/removing a login is a privileged operation (Supabase's admin.* auth API, which requires the
// secret/service_role key) — it can only run here, server-side, never in the browser. The caller's own
// Supabase access token proves who they are; we then check their profile role ourselves before doing
// anything, so this endpoint can't be used by a non-admin even if they know the URL shape.
async function requireAdmin(request: Request, env: WorkerEnv) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return { error: new Response("Admin API unavailable", { status: 503 }) } as const;
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: new Response("Unauthorized", { status: 401 }) } as const;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: new Response("Unauthorized", { status: 401 }) } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profile?.role !== "admin") return { error: new Response("Forbidden", { status: 403 }) } as const;
  return { supabase } as const;
}

export async function handleAdminClients(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST" && request.method !== "DELETE")
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST, DELETE" } });
  const auth = await requireAdmin(request, env);
  if ("error" in auth) return auth.error;

  if (request.method === "POST") {
    let body: { email?: string; password?: string };
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
    if (!body.email?.trim() || !body.password || body.password.length < 8)
      return Response.json({ error: "E-mail e senha (mínimo 8 caracteres) são obrigatórios." }, { status: 400 });
    const { data, error } = await auth.supabase.auth.admin.createUser({ email: body.email.trim(), password: body.password, email_confirm: true });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ id: data.user.id, email: data.user.email }, { status: 201 });
  }

  // DELETE
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const { error } = await auth.supabase.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ deleted: true });
}

async function stripeRequest(env: WorkerEnv, method: string, path: string, params?: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(params ? { body: params } : {}),
  });
  const data = (await response.json()) as Record<string, any>;
  return { ok: response.ok, data };
}

// Embedded checkout (Stripe Elements, card fields live inside the page) needs a subscription's client
// secret up front, not a redirect URL — this creates the customer (reusing one if this email already has
// a Stripe customer, so retries don't pile up duplicate customer records) and an incomplete subscription
// whose first invoice's PaymentIntent the client confirms directly.
export async function handleBillingSubscribe(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return Response.json({ error: "Pagamento indisponível no momento." }, { status: 503 });
  let body: { email?: string; name?: string; phone?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const email = body.email?.trim();
  if (!email) return Response.json({ error: "E-mail é obrigatório." }, { status: 400 });

  const existing = await stripeRequest(env, "GET", `customers?email=${encodeURIComponent(email)}&limit=1`);
  if (!existing.ok) return Response.json({ error: existing.data["error"]?.message || "Não foi possível iniciar o pagamento." }, { status: 400 });
  let customerId: string | undefined = existing.data["data"]?.[0]?.id;

  if (!customerId) {
    const customerParams = new URLSearchParams({ email });
    if (body.name?.trim()) customerParams.set("name", body.name.trim());
    if (body.phone?.trim()) customerParams.set("phone", body.phone.trim());
    const created = await stripeRequest(env, "POST", "customers", customerParams);
    if (!created.ok) return Response.json({ error: created.data["error"]?.message || "Não foi possível iniciar o pagamento." }, { status: 400 });
    customerId = created.data["id"];
  }

  const subscriptionParams = new URLSearchParams({
    customer: customerId!,
    "items[0][price]": env.STRIPE_PRICE_ID,
    payment_behavior: "default_incomplete",
    "payment_settings[save_default_payment_method]": "on_subscription",
    "expand[0]": "latest_invoice.payments",
  });
  const subscription = await stripeRequest(env, "POST", "subscriptions", subscriptionParams);
  if (!subscription.ok) return Response.json({ error: subscription.data["error"]?.message || "Não foi possível iniciar o pagamento." }, { status: 400 });

  // Newer Stripe API versions no longer populate latest_invoice.payment_intent even when expanded —
  // the PaymentIntent id now lives under latest_invoice.payments.data[0].payment.payment_intent.
  const paymentIntentId = subscription.data["latest_invoice"]?.payments?.data?.[0]?.payment?.payment_intent;
  if (!paymentIntentId) return Response.json({ error: "Não foi possível iniciar o pagamento." }, { status: 400 });

  const paymentIntent = await stripeRequest(env, "GET", `payment_intents/${paymentIntentId}`);
  const clientSecret = paymentIntent.data["client_secret"];
  if (!paymentIntent.ok || !clientSecret) return Response.json({ error: "Não foi possível iniciar o pagamento." }, { status: 400 });
  return Response.json({ clientSecret, subscriptionId: subscription.data["id"] });
}

export async function handleBillingCheckout(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return Response.json({ error: "Pagamento indisponível no momento." }, { status: 503 });
  let body: { email?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const email = body.email?.trim();
  if (!email) return Response.json({ error: "E-mail é obrigatório." }, { status: 400 });
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    customer_email: email,
    success_url: `${origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/signup`,
  });
  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const session = (await stripeResponse.json()) as { url?: string; error?: { message: string } };
  if (!stripeResponse.ok) return Response.json({ error: session.error?.message || "Não foi possível iniciar o pagamento." }, { status: 400 });
  return Response.json({ url: session.url });
}

// Stripe signs each webhook payload as HMAC-SHA256("{timestamp}.{rawBody}", webhook_secret) — verifying
// this (rather than trusting the request outright) is what stops anyone who finds this URL from minting
// their own "payment succeeded" events and getting a free account.
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=") as [string, string]));
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export async function handleBillingWebhook(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  if (!env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return new Response("Unavailable", { status: 503 });
  const signature = request.headers.get("Stripe-Signature");
  const rawBody = await request.text();
  if (!signature || !(await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("Invalid signature", { status: 400 });
  }
  let event: { type: string; data: { object: Record<string, any> } };
  try { event = JSON.parse(rawBody); } catch { return new Response("Invalid payload", { status: 400 }); }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

  // Creates the account and emails them a "set your password" link in one call — no separate
  // password-delivery step needed, Supabase's own transactional email handles it. Shared by both the
  // hosted-Checkout flow (checkout.session.completed) and the embedded-Elements flow
  // (invoice.payment_succeeded), which surface the paying email under different field names.
  const activateAccount = async (email: string | undefined, customerId: string | undefined) => {
    if (!email) return;
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
    if (invited?.user) {
      await supabase.from("profiles").update({ stripe_customer_id: customerId, subscription_status: "active" }).eq("id", invited.user.id);
    } else if (inviteError?.message?.includes("already been registered")) {
      // Existing account paying again (e.g. resubscribing) — just reactivate it.
      await supabase.from("profiles").update({ stripe_customer_id: customerId, subscription_status: "active" }).eq("email", email);
    } else if (inviteError) {
      console.error("Stripe webhook: inviteUserByEmail failed", inviteError);
    }
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await activateAccount(session["customer_details"]?.email || session["customer_email"], session["customer"]);
  }
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    // Only the subscription's first invoice should create the account — later renewals hit this same
    // event but the account (and inviteUserByEmail's "already been registered" branch) already exists.
    await activateAccount(invoice["customer_email"], invoice["customer"]);
  }
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const customerId: string | undefined = subscription["customer"];
    const status = subscription["status"] === "active" ? "active" : subscription["status"] === "past_due" ? "past_due" : "canceled";
    if (customerId) await supabase.from("profiles").update({ subscription_status: status }).eq("stripe_customer_id", customerId);
  }
  return Response.json({ received: true });
}

// KawaiPay's own docs/payload shape aren't known yet — this verifies the shared token (embedded in the
// webhook URL itself, since KawaiPay's "Token" field's exact header convention isn't confirmed) and logs
// the raw payload so the "approved sale" field names can be nailed down from a real event, then activates
// the account the same way the Stripe webhook does. Field-name guesses below will likely need adjusting
// once a real payload is seen.
export async function handleKawaipayWebhook(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  if (!env.KAWAIPAY_WEBHOOK_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return new Response("Unavailable", { status: 503 });
  const token = new URL(request.url).searchParams.get("token");
  if (token !== env.KAWAIPAY_WEBHOOK_TOKEN) return new Response("Unauthorized", { status: 401 });

  let payload: Record<string, any>;
  try { payload = await request.json(); } catch { return new Response("Invalid payload", { status: 400 }); }
  console.log("KawaiPay webhook received", JSON.stringify(payload));

  const eventLabel = String(payload["event"] ?? payload["type"] ?? payload["status"] ?? "").toLowerCase();
  const isApproved = /aprovad|approved|paid|completed|compra_aprovada/.test(eventLabel);
  const email: string | undefined =
    payload["customer"]?.email ?? payload["buyer"]?.email ?? payload["customer_email"] ?? payload["email"];

  if (isApproved && email) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
    if (invited?.user) {
      await supabase.from("profiles").update({ subscription_status: "active" }).eq("id", invited.user.id);
    } else if (inviteError?.message?.includes("already been registered")) {
      await supabase.from("profiles").update({ subscription_status: "active" }).eq("email", email);
    } else if (inviteError) {
      console.error("KawaiPay webhook: inviteUserByEmail failed", inviteError);
    }
  }
  return Response.json({ received: true });
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
      if (new URL(request.url).pathname === STUDIO_ASSET_DELETE_PATH) {
        return await handleStudioAssetDelete(request, env);
      }
      if (new URL(request.url).pathname === STUDIO_ASSET_INVENTORY_PATH) {
        return await handleStudioAssetInventory(request, env);
      }
      if (new URL(request.url).pathname === ADMIN_CLIENTS_PATH) {
        return await handleAdminClients(request, env);
      }
      if (new URL(request.url).pathname === BILLING_CHECKOUT_PATH) {
        return await handleBillingCheckout(request, env);
      }
      if (new URL(request.url).pathname === BILLING_SUBSCRIBE_PATH) {
        return await handleBillingSubscribe(request, env);
      }
      if (new URL(request.url).pathname === BILLING_WEBHOOK_PATH) {
        return await handleBillingWebhook(request, env);
      }
      if (new URL(request.url).pathname === KAWAIPAY_WEBHOOK_PATH) {
        return await handleKawaipayWebhook(request, env);
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
