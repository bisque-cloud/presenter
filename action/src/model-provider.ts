// Which provider a run uses, which model it defaults to, and where that
// provider's API lives.
//
// `claude-code` is the one provider that is a subscription rather than an
// API key: the token `claude setup-token` prints, which bills a Claude Pro,
// Max, Team or Enterprise plan. Anthropic's terms allow that token only in
// Claude Code itself, so this provider runs Claude Code where every other
// provider runs OpenCode, behind the same key proxy.
//
// The maintainer supplies one provider key and nothing else. That key names
// the provider, so the action can pick a model known to write well for it
// rather than making them choose one. `model` overrides the default, and
// then its provider has to be the one whose key was supplied.
//
// Provider ids and key environment variables come from the models.dev
// catalog OpenCode resolves models against. `basePath` is the path segment
// each provider's SDK expects under the base URL, so the key proxy can sit
// in front without that prefix appearing twice.

export type Provider =
  | "claude-code"
  | "anthropic"
  | "openai"
  | "google"
  | "xai";

export type ProviderSpec = {
  /** The action input carrying this provider's key. */
  input: string;
  /** The harness that runs the model. */
  engine: "opencode" | "claude-code";
  /**
   * What this provider runs when `model` is empty. These are the strongest
   * general models each provider offers, not the cheapest: an explainer is
   * read by everyone deciding whether to upgrade, and the difference between
   * a good model and a cheap one is visible in the first ten seconds.
   */
  defaultModel: string;
  /** Reasoning effort for the default model, where the provider has one. */
  defaultVariant: string;
  /** Origin the key proxy forwards to. */
  origin: string;
  /** Header the key is written into, replacing whatever the client sent. */
  header: string;
  /** Prefix on the header value, for example `Bearer `. */
  prefix: string;
  /** Path the provider's SDK expects under the base URL. */
  basePath: string;
};

/**
 * Ordered. When more than one key is supplied the first match wins, so the
 * order is by how good the default model is rather than alphabetical.
 */
export const PROVIDERS: Array<[Provider, ProviderSpec]> = [
  // First: a plan someone already pays for comes before a metered key.
  [
    "claude-code",
    {
      input: "claude-code-oauth-token",
      engine: "claude-code",
      // Whatever model the plan's Claude Code defaults to; `model` names
      // another, as anthropic/<id> or claude-code/<id>.
      defaultModel: "default",
      defaultVariant: "",
      origin: "https://api.anthropic.com",
      // Claude Code sends a subscription token as a bearer token, to
      // ANTHROPIC_BASE_URL like every other request it makes.
      header: "authorization",
      prefix: "Bearer ",
      basePath: "",
    },
  ],
  [
    "anthropic",
    {
      input: "anthropic-api-key",
      engine: "opencode",
      defaultModel: "claude-opus-5",
      defaultVariant: "medium",
      origin: "https://api.anthropic.com",
      header: "x-api-key",
      prefix: "",
      basePath: "",
    },
  ],
  [
    "openai",
    {
      input: "openai-api-key",
      engine: "opencode",
      defaultModel: "gpt-5.6-sol",
      defaultVariant: "medium",
      origin: "https://api.openai.com",
      header: "authorization",
      prefix: "Bearer ",
      basePath: "/v1",
    },
  ],
  [
    "google",
    {
      input: "google-api-key",
      engine: "opencode",
      defaultModel: "gemini-3.1-pro-preview",
      defaultVariant: "",
      origin: "https://generativelanguage.googleapis.com",
      header: "x-goog-api-key",
      prefix: "",
      basePath: "/v1beta",
    },
  ],
  [
    "xai",
    {
      input: "xai-api-key",
      engine: "opencode",
      defaultModel: "grok-4.6",
      defaultVariant: "",
      origin: "https://api.x.ai",
      header: "authorization",
      prefix: "Bearer ",
      basePath: "/v1",
    },
  ],
];

const BY_ID = new Map(PROVIDERS);

/** The provider half of a `provider/model` id. */
export function providerOf(model: string): string {
  return model.split("/")[0];
}

/** Where to forward, and how to authenticate, for a provider id. */
export function specFor(provider: string): ProviderSpec {
  const spec = BY_ID.get(provider as Provider);
  if (!spec) {
    throw new Error(
      `This action has no route for provider '${provider}'. It supports ${PROVIDERS.map(([p]) => p).join(", ")}.`,
    );
  }
  return spec;
}

export type Resolved = {
  provider: Provider;
  model: string;
  variant: string;
  key: string;
};

/**
 * Work out what to run from the keys that were supplied and the optional
 * `model` and `variant` overrides. `keys` is the provider id mapped to
 * whatever that input held; empty strings count as absent.
 */
export function resolveRun(
  keys: Partial<Record<Provider, string>>,
  model = "",
  variant = "",
): Resolved | { error: string; missingKey?: true } {
  const supplied = PROVIDERS.filter(([p]) => (keys[p] ?? "").trim().length > 0);
  const inputs = PROVIDERS.map(([, s]) => s.input).join(", ");

  if (supplied.length === 0) {
    return {
      error: `Set one provider key: ${inputs}. The key decides which model authors the explainer.`,
      missingKey: true,
    };
  }

  if (model) {
    // A Claude model named with only a subscription token runs on the
    // subscription, through Claude Code.
    const claudeCode = (keys["claude-code"] ?? "").trim();
    if (
      claudeCode &&
      !(keys.anthropic ?? "").trim() &&
      providerOf(model) === "anthropic"
    ) {
      model = `claude-code/${model.slice("anthropic/".length)}`;
    }
    if (!model.includes("/")) {
      return {
        error: `model must be provider/model, like anthropic/${BY_ID.get("anthropic")!.defaultModel}; got '${model}'. See https://models.dev for the catalog.`,
      };
    }
    const p = providerOf(model) as Provider;
    const spec = BY_ID.get(p);
    if (!spec)
      return {
        error: `This action has no route for provider '${p}'. It supports ${PROVIDERS.map(([x]) => x).join(", ")}.`,
      };
    const key = (keys[p] ?? "").trim();
    if (!key)
      return {
        error: `model is '${model}' but ${spec.input} is empty. The key has to match the model's provider.`,
      };
    return { provider: p, model, variant: variant || spec.defaultVariant, key };
  }

  // No model named: the first supplied key in PROVIDERS order decides.
  const [provider, spec] = supplied[0];
  return {
    provider,
    model: `${provider}/${spec.defaultModel}`,
    variant: variant || spec.defaultVariant,
    key: (keys[provider] ?? "").trim(),
  };
}

/** Read the key inputs out of the step environment. */
export function keysFromEnv(
  env: Record<string, string | undefined>,
): Partial<Record<Provider, string>> {
  return {
    "claude-code": env.CLAUDE_CODE_OAUTH_TOKEN ?? "",
    anthropic: env.ANTHROPIC_API_KEY ?? "",
    openai: env.OPENAI_API_KEY ?? "",
    google: env.GOOGLE_API_KEY ?? "",
    xai: env.XAI_API_KEY ?? "",
  };
}
