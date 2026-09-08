// Step: put the watch link where the thing is read: appended to the release
// notes, or a comment on the pull request. Rerunning replaces the previous
// line or comment, so a second run for the same tag or pull request does
// not add a second link.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { gh, ghJson } from "./github-cli.ts";

const MARKER = "<!-- release-explainer -->";
const repo = process.env.REPO ?? "";
const line = `Watch the explainer: ${process.env.WATCH_URL ?? ""}`;

/** The notes with any previous marked line removed and this one appended. */
export function appendLine(body: string | null | undefined, marker: string = MARKER, text: string = line): string {
  const kept = (body ?? "")
    .split("\n")
    .filter((l) => !l.includes(marker) && !l.startsWith("Watch the explainer: "))
    .join("\n")
    .replace(/\s+$/, "");
  return `${kept}\n\n${marker} ${text}\n`;
}

if (process.env.SOURCE === "release") {
  const tag = process.env.TAG ?? "";
  const current = ghJson<{ body: string | null }>(["release", "view", tag, "-R", repo, "--json", "body"]).body;
  const file = join(process.env.RUNNER_TEMP || "/tmp", "notes.md");
  writeFileSync(file, appendLine(current));
  gh(["release", "edit", tag, "-R", repo, "--notes-file", file]);
  console.log(`Appended to release ${tag}: ${line}`);
} else if (process.env.SOURCE === "pull-request") {
  const number = process.env.PR_NUMBER ?? "";
  const body = `${MARKER}\n${line}`;
  const comments = ghJson<Array<{ id: number; body?: string }>>(["api", `repos/${repo}/issues/${number}/comments`, "--paginate"]);
  const existing = comments.find((c) => (c.body ?? "").startsWith(MARKER));
  if (existing) {
    gh(["api", "-X", "PATCH", `repos/${repo}/issues/comments/${existing.id}`, "-f", `body=${body}`]);
    console.log(`Updated comment ${existing.id} on #${number}: ${line}`);
  } else {
    gh(["pr", "comment", number, "-R", repo, "--body", body]);
    console.log(`Commented on #${number}: ${line}`);
  }
}
