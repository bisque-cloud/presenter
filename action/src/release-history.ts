// Which release came before this one, and how a tag or title becomes a slug.

/**
 * The previous release of the same thing. In a repository that releases
 * several things with prefixed tags (app-v1.2, cli-v0.9), that is a tag
 * sharing the prefix. Plain version tags have an empty prefix.
 *
 * When the tags are versions, it is the highest version below this one, and
 * a stable release skips prereleases: a 26.0.8 published after
 * 27.0.0-alpha.2 compares with 26.0.7, not with the alpha, as semver-ordered
 * changelog tools do. A stable release with only prereleases below it, such
 * as the first 1.0.0 after its release candidates, compares with the
 * highest of those. Tags that are not versions (`nightly`) fall back to the
 * next-older one. `tags` is newest first. Empty when `tag` is the first of
 * its kind or unknown.
 */
export function previousRelease(tags: string[], tag: string): string {
  const prefix = (t: string) => t.replace(/v?\d+(?:[.\-+][0-9A-Za-z]+)*$/, "");
  const i = tags.indexOf(tag);
  if (i < 0) return "";
  const p = prefix(tag);
  const same = tags.filter((t) => t !== tag && prefix(t) === p);
  const current = parseVersion(tag.slice(p.length));
  if (!current) {
    return tags.slice(i + 1).find((t) => prefix(t) === p) ?? "";
  }
  const below = same
    .map((t) => ({ tag: t, version: parseVersion(t.slice(p.length)) }))
    .filter(
      (c): c is { tag: string; version: Version } =>
        c.version !== null && compareVersions(c.version, current) < 0,
    )
    .sort((a, b) => compareVersions(b.version, a.version));
  const stable = below.filter((c) => c.version.pre.length === 0);
  const pool = current.pre.length === 0 && stable.length > 0 ? stable : below;
  return pool[0]?.tag ?? "";
}

interface Version {
  nums: number[];
  pre: string[];
}

/** `v1.2.3`, `1.2`, `2.0.0-rc.1+build`; null for anything else. */
function parseVersion(s: string): Version | null {
  const m =
    /^v?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(s);
  if (!m) return null;
  return { nums: m[1].split(".").map(Number), pre: m[2]?.split(".") ?? [] };
}

/** Semver precedence: numbers first, then a prerelease sorts below its release. */
function compareVersions(a: Version, b: Version): number {
  for (let k = 0; k < Math.max(a.nums.length, b.nums.length); k++) {
    const d = (a.nums[k] ?? 0) - (b.nums[k] ?? 0);
    if (d !== 0) return d;
  }
  if (a.pre.length === 0 || b.pre.length === 0) {
    return b.pre.length - a.pre.length;
  }
  for (let k = 0; k < Math.max(a.pre.length, b.pre.length); k++) {
    const x = a.pre[k];
    const y = b.pre[k];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny && Number(x) !== Number(y)) return Number(x) - Number(y);
    if (nx !== ny) return nx ? -1 : 1;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
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
