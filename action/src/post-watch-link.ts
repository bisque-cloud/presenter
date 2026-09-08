// Step: put the watch link where the thing is read: appended to the release
// notes, or a comment on the pull request. Rerunning replaces the previous
// line or comment, so a second run for the same tag or pull request does
// not add a second link.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { gh, ghJson } from "./github-cli.ts";

const MARKER = "<!-- release-explainer -->";
const repo = process.env.REPO ?? "";
const watchUrl = process.env.WATCH_URL ?? "";
const title = process.env.TITLE ?? "this release";

/**
 * What gets appended: a rule to separate it from the maintainer's own words,
 * the first slide as a clickable poster, and the link in text underneath.
 * The poster is the presentation's Open Graph image, already rendered by the
 * publish step. Without the ids to build that URL, the link alone is used.
 */
export function watchBlock(user: string, id: string, url = watchUrl, subject = title): string {
  const link = `[Watch the explainer](${url})`;
  if (!id || !user) return `---\n\n${link}`;
  const poster = `https://bisque.today/poster/${user}/${id}/og-slide.png`;
  return `---\n\n[![A narrated explainer of ${subject}](${poster})](${url})\n\n${link}`;
}

const line = watchBlock(process.env.BISQUE_USER_ID ?? "", process.env.PRESENTATION_ID ?? "");

/** The notes with any previous marked line removed and this one appended. */
export function appendLine(body: string | null | undefined, marker: string = MARKER, text: string = line): string {
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

if (process.env.SOURCE === "release") {
  const tag = process.env.TAG ?? "";
  const current = ghJson<{ body: string | null }>(["release", "view", tag, "-R", repo, "--json", "body"]).body;
  const file = join(process.env.RUNNER_TEMP || "/tmp", "notes.md");
  writeFileSync(file, appendLine(current));
  gh(["release", "edit", tag, "-R", repo, "--notes-file", file]);
  console.log(`Appended to release ${tag}: ${watchUrl}`);
} else if (process.env.SOURCE === "pull-request") {
  const number = process.env.PR_NUMBER ?? "";
  const body = `${MARKER}\n${line}`;
  const comments = ghJson<Array<{ id: number; body?: string }>>(["api", `repos/${repo}/issues/${number}/comments`, "--paginate"]);
  const existing = comments.find((c) => (c.body ?? "").startsWith(MARKER));
  if (existing) {
    gh(["api", "-X", "PATCH", `repos/${repo}/issues/comments/${existing.id}`, "-f", `body=${body}`]);
    console.log(`Updated comment ${existing.id} on #${number}: ${watchUrl}`);
  } else {
    gh(["pr", "comment", number, "-R", repo, "--body", body]);
    console.log(`Commented on #${number}: ${watchUrl}`);
  }
}
