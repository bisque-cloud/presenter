// The `when` input: explain every pull request the workflow fires on
// (`always`), or let the model decide first whether this one is worth
// explaining to someone who did not write it (`judged`).
//
// Judgment applies only when the pull request event itself started the run.
// A mention or a manual run is somebody asking for an explainer, and an
// explicit request wins over the model's opinion, so one workflow can carry
// both triggers with `when: judged`.

export type When = "always" | "judged";

/** The events that start a run nobody asked for by name. */
const AUTOMATIC_EVENTS = new Set(["pull_request", "pull_request_target"]);

/**
 * The mode this run uses, or an error message for a setting that cannot
 * mean anything.
 */
export function resolveMode(
  when: string | undefined,
  source: string,
  eventName: string | undefined,
): { mode: When } | { error: string } {
  const w = (when ?? "").trim() || "always";
  if (w !== "always" && w !== "judged")
    return { error: `when must be 'always' or 'judged', got '${w}'.` };
  if (w === "always") return { mode: "always" };
  if (source !== "pull-request")
    return {
      error:
        "when: judged decides which pull requests get an explainer; it has no meaning for releases. Use source: pull-request, or drop when.",
    };
  return { mode: AUTOMATIC_EVENTS.has(eventName ?? "") ? "judged" : "always" };
}

/** Where the agent writes its one sentence when it decides to skip. */
export const SKIP_FILE = "skipped.txt";

const FALLBACK_REASON = "The model judged it not worth explaining.";

/**
 * The agent's reason as one short line. It is model-written text about a
 * pull request anyone may have opened, so it is flattened to a single line,
 * capped, and stripped of HTML comments, which is how this action marks its
 * own comments and must not be forgeable from inside one.
 */
export function cleanReason(raw: string | null | undefined): string {
  const flat = (raw ?? "")
    .replace(/<!--[\s\S]*?(-->|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return FALLBACK_REASON;
  return flat.length > 280 ? `${flat.slice(0, 279).trimEnd()}…` : flat;
}

/**
 * Marks the skip comment older versions left. Skips are no longer posted, but
 * one left by an earlier version is still a note that may be replaced.
 */
export const SKIP_MARKER = "<!-- release-explainer: skipped -->";

/** Marks a comment as the note a run with no provider key leaves. */
export const SETUP_MARKER = "<!-- release-explainer: setup -->";

/**
 * What to do with this action's earlier comment on the pull request. A watch
 * link always replaces whatever was there. A note (a missing key) replaces an
 * earlier note but never a watch link: an explainer someone already made, by
 * mention or by an earlier run, stays up.
 */
export function planComment(
  existingBody: string | null | undefined,
  note: boolean,
): "create" | "update" | "keep" {
  if (existingBody == null) return "create";
  if (!note) return "update";
  return existingBody.includes(SKIP_MARKER) ||
    existingBody.includes(SETUP_MARKER)
    ? "update"
    : "keep";
}
