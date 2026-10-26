// The title an explainer is listed under: the headline the agent gave its
// title slide, from the first line of `title.txt` in the folder it wrote.
// A release's name is often its bare tag ("v1.9.0") and a pull request's is
// written for its reviewers ("[CI] Add …"); neither tells a stranger on the
// channel page what changed. The GitHub name stays the fallback, so a folder
// without the file, such as one written for an earlier version of this
// Action, still publishes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** What publish accepts for a title; a longer one would fail the run. */
export const MAX_TITLE_LENGTH = 200;

export function listingTitle(dir: string, fallback: string): string {
  const file = join(dir, "title.txt");
  if (!existsSync(file)) return fallback;
  const line =
    readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? "";
  if (!line || line.length > MAX_TITLE_LENGTH) return fallback;
  return line;
}
