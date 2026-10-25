// When the provider, not the change, is why a run made nothing.
//
// A spent plan, a usage limit, an expired token or a revoked key stops the
// agent the same way a real failure does, but none of them is the
// contributor's fault, and a red check on their pull request for a quota is
// how a third-party job gets deleted in its first week. So the key proxy
// writes one line per upstream response (its status and what kind it was,
// never the body, which can quote the key), and when the agent then fails,
// the agent step reads the last line: if the provider's last word was a
// refusal, the run ends green with one warning instead of failing.
//
// Only the last response counts. A rate limit the harness retried through,
// followed by an agent that wrote nothing for its own reasons, is still a
// failure.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** `auth`: the key was refused. `limit`: the plan or account is out. */
export type Refusal = "auth" | "limit";

export type ResponseKind = "ok" | Refusal | "error";

/** Where the key proxy records responses, beside its other state. */
export function eventsFile(work: string): string {
  return join(work, "key-proxy.events");
}

// Matched against the first few KB of an error body. Anthropic says "credit
// balance is too low" on a 400; Google says "API key not valid" on a 400
// and RESOURCE_EXHAUSTED on a 429; OpenAI says insufficient_quota on a 429.
// A 401 or 403 needs no text.
const AUTH_TEXT = /api key not valid|api_key_invalid/i;
const LIMIT_TEXT =
  /credit balance is too low|insufficient_quota|resource_exhausted/i;

/** What one upstream response means for the run. */
export function classifyResponse(status: number, body = ""): ResponseKind {
  if (status < 400) return "ok";
  if (status === 401 || status === 403) return "auth";
  if (status === 402 || status === 429) return "limit";
  if (AUTH_TEXT.test(body)) return "auth";
  if (LIMIT_TEXT.test(body)) return "limit";
  return "error";
}

/** The refusal behind a failed run, from the proxy's last recorded response. */
export function lastRefusal(lines: string): Refusal | null {
  const last = lines.trim().split("\n").pop() ?? "";
  const kind = last.split(" ")[1];
  return kind === "auth" || kind === "limit" ? kind : null;
}

/** lastRefusal, read from this run's working directory. */
export function refusalIn(work: string): Refusal | null {
  const file = eventsFile(work);
  return existsSync(file) ? lastRefusal(readFileSync(file, "utf8")) : null;
}

/** The one line the run's log and summary get. */
export function refusalWarning(refusal: Refusal, model: string): string {
  return refusal === "auth"
    ? `${model}: the provider refused the key (expired, revoked or wrong). No explainer this time; the check passes. Replace the secret, then re-run this job.`
    : `${model}: the plan or account is out of quota or at its usage limit. No explainer this time; the check passes. Re-run this job once the limit resets.`;
}
