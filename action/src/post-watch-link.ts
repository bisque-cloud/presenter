// Step: put the watch link where the thing is read: appended to the release
// notes, or a comment on the pull request. Rerunning replaces the previous
// line or comment, so a second run for the same tag or pull request does
// not add a second link.
//
// A pull request the model judged not worth explaining (`when: judged`) gets
// no comment: the reason stays in the run's log and its `skip-reason` output.
// A pull request whose run had no provider key, or a key the provider
// refused, gets one comment naming the secret to add, under the same marker,
// so a later run edits it rather than adding another. One whose plan was out
// of quota gets none: that clears on its own, and the run's log says so.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { gh, ghJson, ghMaybe } from "./github-cli.ts";
import { planComment } from "./judgment.ts";
import { secretFor, setupComment, workflowPath } from "./missing-key.ts";

const MARKER = "<!-- release-explainer -->";
const repo = process.env.REPO ?? "";
const watchUrl = process.env.WATCH_URL ?? "";
const title = process.env.TITLE ?? "this release";

/**
 * What gets appended: a rule to separate it from the maintainer's own words,
 * the first slide as a clickable poster, and the link in text underneath.
 * The poster is the presentation's Open Graph image, already rendered by the
 * publish step. Without the ids to build that URL, the link alone is used.
 *
 * Beside the link sits the view count, an image bisque.today renders on each
 * fetch ("· 31 views"), so the comment keeps counting after this run has
 * ended. It is blank until the first view.
 */
export function watchBlock(
  user: string,
  id: string,
  url = watchUrl,
  subject = title,
): string {
  const link = `[Watch the explainer](${url})`;
  if (!id || !user) return `---\n\n${link}`;
  const poster = `https://bisque.today/poster/${user}/${id}/og-slide.png`;
  const views = `https://bisque.today/api/presentations/views-badge/${encodeURIComponent(id)}`;
  return `---\n\n[![A narrated explainer of ${subject}](${poster})](${url})\n\n${link} [![Views](${views})](${url})`;
}

const line = watchBlock(
  process.env.BISQUE_USER_ID ?? "",
  process.env.PRESENTATION_ID ?? "",
);

/** The notes with any previous marked line removed and this one appended. */
export function appendLine(
  body: string | null | undefined,
  marker: string = MARKER,
  text: string = line,
): string {
  // Everything a previous run added is dropped: the marker, whatever follows
  // it, and the bare line older versions wrote.
  const lines = (body ?? "").split("\n");
  const at = lines.findIndex((l) => l.includes(marker));
  const kept = (at >= 0 ? lines.slice(0, at) : lines)
    .filter((l) => !l.startsWith("Watch the explainer: "))
    .join("\n")
    .replace(/\s+$/, "");
  return `${kept}\n\n${marker}\n\n${text}\n`;
}

/** The missing- or refused-key note, naming the secret the workflow passes. */
function setupNote(refused: boolean): string {
  const path = workflowPath(process.env.GITHUB_WORKFLOW_REF ?? "", repo);
  const sha = process.env.GITHUB_WORKFLOW_SHA ?? "";
  const workflow = path
    ? ghMaybe([
        "api",
        `repos/${repo}/contents/${path}${sha ? `?ref=${sha}` : ""}`,
        "-H",
        "Accept: application/vnd.github.raw",
      ])
    : null;
  return setupComment({
    ...secretFor(workflow),
    repo,
    server: process.env.GITHUB_SERVER_URL,
    runId: process.env.GITHUB_RUN_ID,
    refused,
  });
}

if (process.env.SOURCE === "release") {
  const tag = process.env.TAG ?? "";
  const current = ghJson<{ body: string | null }>([
    "release",
    "view",
    tag,
    "-R",
    repo,
    "--json",
    "body",
  ]).body;
  const file = join(process.env.RUNNER_TEMP || "/tmp", "notes.md");
  writeFileSync(file, appendLine(current));
  gh(["release", "edit", tag, "-R", repo, "--notes-file", file]);
  console.log(`Appended to release ${tag}: ${watchUrl}`);
} else if (process.env.SOURCE === "pull-request") {
  const number = process.env.PR_NUMBER ?? "";
  const refused = process.env.REFUSED ?? "";
  const missingKey = process.env.MISSING_KEY === "true" || refused === "auth";
  if (process.env.SKIPPED === "true" && !missingKey) {
    console.log(`Skipped #${number}; left no comment.`);
  } else if (refused === "limit") {
    console.log(`#${number}: the plan was out of quota; left no comment.`);
  } else {
    const body = missingKey
      ? `${MARKER}\n${setupNote(refused === "auth")}`
      : `${MARKER}\n${line}`;
    const what = missingKey ? "setup note" : watchUrl;
    const comments = ghJson<Array<{ id: number; body?: string }>>([
      "api",
      `repos/${repo}/issues/${number}/comments`,
      "--paginate",
    ]);
    const existing = comments.find((c) => (c.body ?? "").startsWith(MARKER));
    const plan = planComment(
      existing ? (existing.body ?? "") : null,
      missingKey,
    );
    if (plan === "keep") {
      console.log(
        `No key for #${number}; left its existing explainer comment ${existing?.id} in place.`,
      );
    } else if (plan === "update" && existing) {
      gh([
        "api",
        "-X",
        "PATCH",
        `repos/${repo}/issues/comments/${existing.id}`,
        "-f",
        `body=${body}`,
      ]);
      console.log(`Updated comment ${existing.id} on #${number}: ${what}`);
    } else {
      gh(["pr", "comment", number, "-R", repo, "--body", body]);
      console.log(`Commented on #${number}: ${what}`);
    }
  }
}
