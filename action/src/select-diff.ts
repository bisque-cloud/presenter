// Choose what part of a change set the agent reads. The whole diff can be
// megabytes of lockfile; the agent's context is better spent on the source
// files. Generated files are skipped, each remaining file is capped, and a
// total budget is applied in the order GitHub lists the files. Whatever was
// skipped or cut is reported, so the agent can name a file it did not read
// instead of not knowing it existed.

export type ChangedFile = {
  filename: string;
  additions: number;
  deletions: number;
  /** Absent when GitHub omits it: binaries, and files past its own size limit. */
  patch?: string;
};

export type DiffSelection = {
  /** Unified diff text for the files the agent reads. */
  patch: string;
  /** Files left out entirely, with the reason. */
  skipped: Array<{ filename: string; reason: string }>;
  /** Files included only up to the per-file cap. */
  cut: string[];
};

/** Files nobody reads by hand: lockfiles, bundles, snapshots, vendored code. */
const GENERATED = [
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lock(b)?|Cargo\.lock|Gemfile\.lock|poetry\.lock|uv\.lock|composer\.lock|go\.sum|flake\.lock|Podfile\.lock|Package\.resolved)$/,
  /\.(min\.js|min\.css|map|snap|lock)$/,
  /(^|\/)(vendor|node_modules|dist|build|\.yarn)\//,
  /(^|\/)__snapshots__\//,
  /\.generated\.|\.pb\.go$|_pb2\.py$|\.g\.dart$/,
];

export const PER_FILE_CAP = 20_000;
export const TOTAL_CAP = 400_000;

export function isGenerated(filename: string): boolean {
  return GENERATED.some((re) => re.test(filename));
}

export function selectDiff(files: ChangedFile[], perFileCap = PER_FILE_CAP, totalCap = TOTAL_CAP): DiffSelection {
  const parts: string[] = [];
  const skipped: DiffSelection["skipped"] = [];
  const cut: string[] = [];
  let used = 0;
  for (const f of files) {
    if (isGenerated(f.filename)) {
      skipped.push({ filename: f.filename, reason: "generated file" });
      continue;
    }
    if (!f.patch) {
      skipped.push({ filename: f.filename, reason: "no text diff (binary or too large for GitHub to return)" });
      continue;
    }
    if (used >= totalCap) {
      skipped.push({ filename: f.filename, reason: "diff budget spent" });
      continue;
    }
    let body = f.patch;
    if (body.length > perFileCap) {
      body = body.slice(0, perFileCap) + `\n[... ${f.patch.length - perFileCap} more bytes of this file's diff not shown]`;
      cut.push(f.filename);
    }
    const part = `diff --git a/${f.filename} b/${f.filename}\n${body}`;
    parts.push(part);
    used += part.length;
  }
  return { patch: parts.join("\n\n"), skipped, cut };
}

/** The "what you did not see" section appended to changes.md. */
export function describeOmissions(sel: DiffSelection): string {
  if (sel.skipped.length === 0 && sel.cut.length === 0) return "";
  const lines = ["", "## Not fully in diff.patch", ""];
  for (const s of sel.skipped) lines.push(`- ${s.filename}: ${s.reason}`);
  for (const c of sel.cut) lines.push(`- ${c}: shown up to ${PER_FILE_CAP} bytes`);
  lines.push("");
  return lines.join("\n");
}
