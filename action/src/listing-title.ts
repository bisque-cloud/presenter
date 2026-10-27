// The title an explainer is listed under: the headline the agent gave its
// title slide, from the first line of `title.txt` in the folder it wrote.
// A release's name is often its bare tag ("v1.9.0") and a pull request's is
// written for its reviewers ("[CI] Add …"); neither tells a stranger on the
// channel page what changed. A folder without the file, such as one written
// for an earlier version of this Action, falls back to the first `<h1>` in
// its `index.html`, which is the title slide's headline, and only then to
// the GitHub name, so it still publishes.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** What publish accepts for a title; a longer one would fail the run. */
export const MAX_TITLE_LENGTH = 200;

export function listingTitle(dir: string, fallback: string): string {
  return fromTitleFile(dir) ?? fromHeadline(dir) ?? fallback;
}

function usable(line: string): string | undefined {
  return line && line.length <= MAX_TITLE_LENGTH ? line : undefined;
}

function fromTitleFile(dir: string): string | undefined {
  const file = join(dir, "title.txt");
  if (!existsSync(file)) return undefined;
  const line =
    readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .find(Boolean) ?? "";
  return usable(line);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function fromHeadline(dir: string): string | undefined {
  const file = join(dir, "index.html");
  if (!existsSync(file)) return undefined;
  const match = readFileSync(file, "utf8").match(
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (!match) return undefined;
  const text = match[1]!
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (name[0] === "#") {
        const code =
          name[1] === "x" || name[1] === "X"
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      return ENTITIES[name.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim();
  return usable(text);
}
