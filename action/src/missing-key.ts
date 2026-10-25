// The note a pull request gets when the workflow ran with no provider key.
//
// That is a setup step the maintainer has not done yet, usually because the
// secret was never added, and it is not the contributor's fault. So instead
// of a red check on their pull request, the run passes and leaves one line
// naming the secret and how to make it. The secret's name comes from the
// workflow file itself, which says which `secrets.` value it passes to which
// key input; a workflow that cannot be read gets the name every example
// uses.
import { SETUP_MARKER } from "./judgment.ts";
import { PROVIDERS, type Provider } from "./model-provider.ts";

/** How each kind of key is made, worded to run on into "as `NAME`". */
const MAKE: Record<Provider, string> = {
  "claude-code": "run `claude setup-token`, save what it prints",
  anthropic: "save an Anthropic API key",
  openai: "save an OpenAI API key",
  google: "save a Google API key",
  xai: "save an xAI API key",
};

const DEFAULT = {
  provider: "claude-code" as Provider,
  secret: "CLAUDE_CODE_OAUTH_TOKEN",
};

/**
 * The secret the workflow passes to a key input, in the order a run picks
 * keys, or the default when the workflow names none.
 */
export function secretFor(workflow: string | null | undefined): {
  provider: Provider;
  secret: string;
} {
  for (const [provider, spec] of PROVIDERS) {
    const m = new RegExp(
      `^\\s*${spec.input}:\\s*\\$\\{\\{\\s*secrets\\.([A-Za-z_][A-Za-z0-9_]*)`,
      "m",
    ).exec(workflow ?? "");
    if (m) return { provider, secret: m[1] };
  }
  return DEFAULT;
}

/**
 * The workflow file's path in the repository, from GITHUB_WORKFLOW_REF
 * (`owner/repo/.github/workflows/x.yml@refs/heads/main`).
 */
export function workflowPath(ref: string, repo: string): string {
  const rest = ref.startsWith(`${repo}/`) ? ref.slice(repo.length + 1) : "";
  return rest.split("@")[0];
}

/**
 * The comment body, after the action's own marker. `refused` is a secret
 * that is set but that the provider turned down (expired or revoked), which
 * is the same fix with a different first sentence.
 */
export function setupComment(opts: {
  provider: Provider;
  secret: string;
  repo: string;
  server?: string;
  runId?: string;
  refused?: boolean;
}): string {
  const server = opts.server || "https://github.com";
  const settings = `${server}/${opts.repo}/settings/secrets/actions/new`;
  const rerun = opts.runId
    ? `[re-run this job](${server}/${opts.repo}/actions/runs/${opts.runId})`
    : "re-run this job";
  const what = opts.refused
    ? `the \`${opts.secret}\` secret was refused (expired or revoked)`
    : `the \`${opts.secret}\` secret is not set`;
  return `${SETUP_MARKER}\n**No explainer yet: ${what}.** A maintainer can ${MAKE[opts.provider]} as \`${opts.secret}\` under [Settings → Secrets and variables → Actions](${settings}), then ${rerun}.`;
}
