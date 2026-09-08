// Which provider a `provider/model` id names, and where its API lives.
//
// The provider ids and key environment variables come from the models.dev
// catalog OpenCode resolves models against. `basePath` is the path segment
// each provider's SDK expects to find under the base URL, so the key proxy
// can sit in front without the SDK's own path prefix appearing twice.

export type ProxyUpstream = {
  /** Origin the proxy forwards to. */
  origin: string;
  /** Header the key is written into, replacing whatever the client sent. */
  header: string;
  /** Prefix on the header value, e.g. `Bearer `. */
  prefix: string;
  /** Path the provider's SDK expects under the base URL. */
  basePath: string;
  /** Environment variable name the provider's key is normally read from. */
  envVar: string;
};

const UPSTREAMS: Record<string, ProxyUpstream> = {
  anthropic: { origin: "https://api.anthropic.com", header: "x-api-key", prefix: "", basePath: "", envVar: "ANTHROPIC_API_KEY" },
  openai: { origin: "https://api.openai.com", header: "authorization", prefix: "Bearer ", basePath: "/v1", envVar: "OPENAI_API_KEY" },
  google: { origin: "https://generativelanguage.googleapis.com", header: "x-goog-api-key", prefix: "", basePath: "/v1beta", envVar: "GOOGLE_GENERATIVE_AI_API_KEY" },
  xai: { origin: "https://api.x.ai", header: "authorization", prefix: "Bearer ", basePath: "/v1", envVar: "XAI_API_KEY" },
};

/** The provider half of a `provider/model` id. */
export function providerOf(model: string): string {
  return model.split("/")[0];
}

/** Where to forward, and how to authenticate, for a provider id. */
export function proxyUpstream(provider: string): ProxyUpstream {
  const up = UPSTREAMS[provider];
  if (!up) {
    throw new Error(`No key-proxy route for provider '${provider}'. Supported: ${Object.keys(UPSTREAMS).join(", ")}. Open an issue to add one.`);
  }
  return up;
}

/** Provider ids this action can put a key proxy in front of. */
export function supportedProviders(): string[] {
  return Object.keys(UPSTREAMS);
}
