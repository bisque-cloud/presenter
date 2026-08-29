/**
 * @bisque/sdk — the Bisque API from a program.
 *
 * Zero dependencies; uses the global `fetch` (Node 18+, Bun, Deno, browsers).
 * The REST surface it wraps is described at https://bisque.today/openapi.json;
 * how to get a credential is at https://bisque.today/auth.md.
 *
 *   import { Bisque } from "@bisque/sdk";
 *   const bisque = new Bisque({ apiKey: process.env.BISQUE_API_KEY });
 *   const spec = await bisque.presentations.spec();      // read the format first
 *   const created = await bisque.presentations.create({ indexHtml });
 *   const status = await bisque.presentations.waitUntilReady(created.presentationId);
 *   console.log(status.webUrl);
 */

export const DEFAULT_BASE_URL = "https://bisque.today";
export const SDK_VERSION = "0.1.0";

// --- types (mirror components.schemas in /openapi.json) ------------------

export type Visibility = "public" | "unlisted" | "private" | "org";

export interface ApiErrorBody {
  requestId?: string;
  error: { code: string; message: string };
}

export interface RateLimit {
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetSec: number;
  policy?: string;
  /** Present on a 429. */
  retryAfterSec?: number;
}

export interface TranscriptSlide {
  slideIndex: number;
  startSec: number;
  title: string;
  /** The slide's narration. */
  text: string;
}

export interface PresentationContext {
  requestId: string;
  presentationId: string;
  title: string;
  description?: string | null;
  handle: string;
  slug: string;
  webUrl: string;
  visibility: string;
  publishedAt?: string | null;
  transcript: TranscriptSlide[];
  transcriptTruncatedSlides?: number;
  contextMd?: string | null;
  contextTruncated?: boolean;
}

export interface PresentationSummary {
  presentationId: string;
  title: string;
  slug: string;
  visibility: Visibility;
  publishStatus: string;
  webUrl: string;
  createdAt?: string | null;
}

export interface PresentationPage {
  requestId: string;
  items: PresentationSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreatePresentationRequest {
  /** The whole html-presentation/v1 file. Fetch the format with `presentations.spec()` first. */
  indexHtml: string;
  title?: string;
  /** URL slug under your channel. Reuse it to republish. */
  slug?: string;
  presentationId?: string;
  handle?: string;
  visibility?: Visibility;
  org?: string;
  contextMd?: string;
  designMd?: string;
  voiceId?: string;
  speechSpeed?: number;
  voiceStability?: number;
  assets?: Record<string, unknown>;
}

export interface CreatePresentationResult {
  requestId: string;
  presentationId: string;
  webUrl: string;
  status: "ready" | "queued";
  statusUrl: string;
  narration?: Record<string, unknown>;
}

export interface PresentationStatus {
  requestId: string;
  presentationId: string;
  webUrl?: string;
  publishStatus: string;
  ready: boolean;
  visibility?: string;
  narration?: Record<string, unknown>;
}

export interface NarratedWord {
  word: string;
  start: number;
  end: number;
}

export interface NarratedSlideAudio {
  slideKey?: string;
  slideIndex?: number;
  words: NarratedWord[];
  durationMs: number;
  size: number;
  /** sha256 of the MP3 bytes. */
  hash: string;
  contentType?: "audio/mpeg";
}

export interface PublishNarratedRequest extends Omit<
  CreatePresentationRequest,
  "assets"
> {
  audio?: NarratedSlideAudio[];
  assets?: Array<{ path: string; size: number; hash: string }>;
}

export interface PublishNarratedResult {
  requestId: string;
  presentationId: string;
  webUrl?: string;
  uploadUrls: Array<Record<string, unknown>>;
  completeUrl: string;
  files: Array<Record<string, unknown>>;
}

export interface ListPresentationsParams {
  limit?: number;
  cursor?: string;
  visibility?: Visibility;
}

export type PresentationRef =
  | { url: string }
  | { handle: string; slug: string };

export interface AskItem {
  url: string;
  name: string;
  site: string;
  score: number;
  description: string;
  schema_object: Record<string, unknown>;
}

export interface AskResponse {
  _meta: {
    version: string;
    response_type: string;
    mode?: string;
    site?: string;
  };
  query_id: string;
  query: string;
  results: AskItem[];
}

export interface RequestOptions {
  /** Sent as `Idempotency-Key`; a UUID is generated when omitted on a POST. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface BisqueOptions {
  /** `bisque_live_…` API key or an OAuth access token. Reads work without one. */
  apiKey?: string;
  /** Defaults to https://bisque.today. */
  baseUrl?: string;
  /** Substitute fetch (tests, proxies). */
  fetch?: typeof fetch;
  /** Automatic retries on 429 and 5xx, honouring Retry-After. Default 2. */
  maxRetries?: number;
  userAgent?: string;
}

// --- errors --------------------------------------------------------------

export class BisqueError extends Error {
  readonly status: number;
  /** Stable upper-snake-case code from the API, when the body carried one. */
  readonly code: string | null;
  readonly requestId: string | null;
  readonly rateLimit: RateLimit | null;
  readonly body: unknown;

  constructor(
    message: string,
    fields: {
      status: number;
      code?: string | null;
      requestId?: string | null;
      rateLimit?: RateLimit | null;
      body?: unknown;
    },
  ) {
    super(message);
    this.name = "BisqueError";
    this.status = fields.status;
    this.code = fields.code ?? null;
    this.requestId = fields.requestId ?? null;
    this.rateLimit = fields.rateLimit ?? null;
    this.body = fields.body;
  }
}

// --- helpers -------------------------------------------------------------

export function parseRateLimit(headers: Headers): RateLimit | null {
  const limit = headers.get("ratelimit-limit");
  if (limit === null) return null;
  const rl: RateLimit = {
    limit: Number(limit),
    remaining: Number(headers.get("ratelimit-remaining") ?? "0"),
    resetSec: Number(headers.get("ratelimit-reset") ?? "0"),
  };
  const policy = headers.get("ratelimit-policy");
  if (policy) rl.policy = policy;
  const retry = headers.get("retry-after");
  if (retry !== null && !Number.isNaN(Number(retry))) {
    rl.retryAfterSec = Number(retry);
  }
  return rl;
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error("aborted"));
      },
      { once: true },
    );
  });
}

function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Fallback for runtimes without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// --- client --------------------------------------------------------------

export class Bisque {
  readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly userAgent: string;
  /** Rate-limit headers from the most recent response that carried them. */
  lastRateLimit: RateLimit | null = null;

  constructor(options: BisqueOptions = {}) {
    this.baseUrl = stripSlash(options.baseUrl ?? DEFAULT_BASE_URL);
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new Error("No fetch available; pass one in options.fetch.");
    }
    this.maxRetries = options.maxRetries ?? 2;
    this.userAgent = options.userAgent ?? `bisque-sdk/${SDK_VERSION}`;
  }

  /** Raw request with auth, retries, rate-limit capture, and error mapping. */
  async request<T>(
    method: "GET" | "POST",
    path: string,
    init: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
      accept?: string;
      idempotencyKey?: string;
      signal?: AbortSignal;
      auth?: "required" | "optional";
    } = {},
  ): Promise<{ data: T; response: Response }> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(init.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    if (init.auth === "required" && !this.apiKey) {
      throw new BisqueError(
        `${method} ${path} needs a credential; pass apiKey (see https://bisque.today/auth.md).`,
        { status: 0, code: "MISSING_CREDENTIAL" },
      );
    }
    const headers: Record<string, string> = {
      accept: init.accept ?? "application/json",
      "user-agent": this.userAgent,
    };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    let body: string | undefined;
    if (method === "POST") {
      headers["content-type"] = "application/json";
      headers["idempotency-key"] = init.idempotencyKey ?? uuid();
      body = JSON.stringify(init.body ?? {});
    }

    let attempt = 0;
    for (;;) {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body,
        signal: init.signal,
      });
      const rateLimit = parseRateLimit(response.headers);
      if (rateLimit) this.lastRateLimit = rateLimit;

      if (response.ok) {
        const text = await response.text();
        const contentType = response.headers.get("content-type") ?? "";
        const data = (
          contentType.includes("application/json") ? JSON.parse(text) : text
        ) as T;
        return { data, response };
      }

      const retriable = response.status === 429 || response.status >= 500;
      if (retriable && attempt < this.maxRetries) {
        attempt += 1;
        const retryAfter = rateLimit?.retryAfterSec;
        const waitMs =
          retryAfter !== undefined
            ? Math.min(retryAfter, 30) * 1000
            : 250 * 2 ** attempt;
        await sleep(waitMs, init.signal);
        continue;
      }

      let parsed: unknown = null;
      let message = `${method} ${path} failed with HTTP ${response.status}`;
      try {
        parsed = await response.json();
      } catch {
        parsed = null;
      }
      const err = parsed as Partial<ApiErrorBody> | null;
      if (err?.error?.message) message = err.error.message;
      throw new BisqueError(message, {
        status: response.status,
        code: err?.error?.code ?? null,
        requestId: err?.requestId ?? null,
        rateLimit,
        body: parsed,
      });
    }
  }

  readonly presentations = {
    /**
     * The html-presentation/v1 authoring format, as markdown. Pass a module
     * name (`charts`, `macos`, …) for one part. Read it before writing HTML.
     */
    spec: async (part?: string, opts: RequestOptions = {}): Promise<string> => {
      const path = part
        ? `/api/presentations/spec/${encodeURIComponent(part)}`
        : "/api/presentations/spec";
      const { data } = await this.request<string>("GET", path, {
        accept: "text/markdown",
        signal: opts.signal,
      });
      return data;
    },

    /** Read any shared presentation: metadata, transcript, context.md. */
    context: async (
      ref: PresentationRef,
      opts: RequestOptions = {},
    ): Promise<PresentationContext> => {
      const query =
        "url" in ref
          ? { url: ref.url }
          : { handle: ref.handle, slug: ref.slug };
      const { data } = await this.request<PresentationContext>(
        "GET",
        "/api/presentations/context",
        { query, signal: opts.signal, auth: "optional" },
      );
      return data;
    },

    /** Your presentations, newest first. */
    list: async (
      params: ListPresentationsParams = {},
      opts: RequestOptions = {},
    ): Promise<PresentationPage> => {
      const { data } = await this.request<PresentationPage>(
        "GET",
        "/api/presentations",
        {
          query: {
            limit: params.limit,
            cursor: params.cursor,
            visibility: params.visibility,
          },
          signal: opts.signal,
          auth: "required",
        },
      );
      return data;
    },

    /** Every page of `list`, as one async iterator. */
    listAll: async function* (
      this: Bisque,
      params: Omit<ListPresentationsParams, "cursor"> = {},
      opts: RequestOptions = {},
    ): AsyncGenerator<PresentationSummary> {
      let cursor: string | undefined;
      do {
        const page: PresentationPage = await this.presentations.list(
          { ...params, cursor },
          opts,
        );
        for (const item of page.items) yield item;
        cursor = page.hasMore && page.nextCursor ? page.nextCursor : undefined;
      } while (cursor);
    }.bind(this),

    /** Publish from HTML; narration is synthesized server-side. Poll `status`. */
    create: async (
      req: CreatePresentationRequest,
      opts: RequestOptions = {},
    ): Promise<CreatePresentationResult> => {
      const { data } = await this.request<CreatePresentationResult>(
        "POST",
        "/api/presentations/create",
        {
          body: req,
          idempotencyKey: opts.idempotencyKey,
          signal: opts.signal,
          auth: "required",
        },
      );
      return data;
    },

    /** Narration and publish progress for one of your presentations. */
    status: async (
      presentationId: string,
      opts: RequestOptions = {},
    ): Promise<PresentationStatus> => {
      const { data } = await this.request<PresentationStatus>(
        "GET",
        "/api/presentations/status",
        { query: { presentationId }, signal: opts.signal, auth: "required" },
      );
      return data;
    },

    /** Poll `status` until `ready` is true. Rejects with BisqueError on timeout. */
    waitUntilReady: async (
      presentationId: string,
      opts: RequestOptions & { intervalMs?: number; timeoutMs?: number } = {},
    ): Promise<PresentationStatus> => {
      const interval = opts.intervalMs ?? 3000;
      const deadline = Date.now() + (opts.timeoutMs ?? 10 * 60_000);
      for (;;) {
        const status = await this.presentations.status(presentationId, opts);
        if (status.ready) return status;
        if (status.publishStatus === "failed") {
          throw new BisqueError(
            `Presentation ${presentationId} failed to publish.`,
            {
              status: 0,
              code: "PUBLISH_FAILED",
              requestId: status.requestId,
              body: status,
            },
          );
        }
        if (Date.now() >= deadline) {
          throw new BisqueError(
            `Presentation ${presentationId} was not ready after ${opts.timeoutMs ?? 600000} ms.`,
            {
              status: 0,
              code: "TIMEOUT",
              requestId: status.requestId,
              body: status,
            },
          );
        }
        await sleep(interval, opts.signal);
      }
    },

    /**
     * Publish with audio you synthesized yourself. Returns signed upload
     * targets; PUT each file's bytes there, then POST `completeUrl` with
     * the echoed `files`. API-key callers only.
     */
    publishNarrated: async (
      req: PublishNarratedRequest,
      opts: RequestOptions = {},
    ): Promise<PublishNarratedResult> => {
      const { data } = await this.request<PublishNarratedResult>(
        "POST",
        "/api/presentations/publish-narrated",
        {
          body: req,
          idempotencyKey: opts.idempotencyKey,
          signal: opts.signal,
          auth: "required",
        },
      );
      return data;
    },
  };

  /** oEmbed payload for a watch URL. */
  async oembed(
    url: string,
    opts: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    const { data } = await this.request<Record<string, unknown>>(
      "GET",
      "/api/oembed",
      { query: { url, format: "json" }, signal: opts.signal },
    );
    return data;
  }

  /** Ask a natural-language question (NLWeb) over the docs and public presentations. */
  async ask(
    query: string,
    opts: RequestOptions & { prev?: string[] } = {},
  ): Promise<AskResponse> {
    const { data } = await this.request<AskResponse>("POST", "/ask", {
      body: {
        query,
        ...(opts.prev && opts.prev.length > 0
          ? { prev: opts.prev.join(", ") }
          : {}),
        streaming: false,
      },
      idempotencyKey: opts.idempotencyKey,
      signal: opts.signal,
    });
    return data;
  }

  /** The OpenAPI 3.1 document this SDK wraps. */
  async openapi(opts: RequestOptions = {}): Promise<Record<string, unknown>> {
    const { data } = await this.request<Record<string, unknown>>(
      "GET",
      "/openapi.json",
      { signal: opts.signal },
    );
    return data;
  }
}

export default Bisque;
