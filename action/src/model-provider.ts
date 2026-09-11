// Which provider a run uses, which model it defaults to, and where that
// provider's API lives.
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

export type Provider = "anthropic" | "openai" | "google" | "xai";

export type ProviderSpec = {
  /** The action input carrying this provider's key. */
  input: string;
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
  [
    "anthropic",
    {
      input: "anthropic-api-key",
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
): Resolved | { error: string } {
  const supplied = PROVIDERS.filter(([p]) => (keys[p] ?? "").trim().length > 0);
  const inputs = PROVIDERS.map(([, s]) => s.input).join(", ");

  if (supplied.length === 0) {
    return {
      error: `Set one provider key: ${inputs}. The key decides which model authors the explainer.`,
    };
  }

  if (model) {
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

/** Read the four key inputs out of the step environment. */
export function keysFromEnv(
  env: Record<string, string | undefined>,
): Partial<Record<Provider, string>> {
  return {
    anthropic: env.ANTHROPIC_API_KEY ?? "",
    openai: env.OPENAI_API_KEY ?? "",
    google: env.GOOGLE_API_KEY ?? "",
    xai: env.XAI_API_KEY ?? "",
  };
}
