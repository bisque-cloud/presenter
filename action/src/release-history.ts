// Which release came before this one, and how a tag or title becomes a slug.

/**
 * The previous release of the same thing. In a repository that releases
 * several things with prefixed tags (app-v1.2, cli-v0.9), that is the
 * next-older tag sharing the prefix. Plain version tags have an empty prefix
 * and get the previous release. `tags` is newest first. Empty when `tag` is
 * the first of its kind or unknown.
 */
export function previousRelease(tags: string[], tag: string): string {
  const prefix = (t: string) => t.replace(/v?\d+(?:[.\-+][0-9A-Za-z]+)*$/, "");
  const i = tags.indexOf(tag);
  if (i < 0) return "";
  const p = prefix(tag);
  return tags.slice(i + 1).find((t) => prefix(t) === p) ?? "";
}

/** Lowercase, anything odd to hyphens, trimmed, at most 60 characters. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}
