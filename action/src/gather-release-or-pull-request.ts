// Step: gather what the agent explains into $WORK/source/, plus TASK.md
// and the pre-fetched format spec. Reads through the API with the job's
// token. Never checks out the code.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeOmissions, selectDiff, type ChangedFile } from "./select-diff.ts";
import { fail, output, run, workDir } from "./action-step.ts";
import { gh, ghJson } from "./github-cli.ts";
import { previousRelease, slugify } from "./release-history.ts";

const work = workDir();
const src = join(work, "source");
mkdirSync(src, { recursive: true });
mkdirSync(join(work, "out"), { recursive: true });

const repo = process.env.REPO;
const source = process.env.SOURCE || "release";
const here = new URL(".", import.meta.url).pathname;
const event = process.env.EVENT_PATH ? JSON.parse(readFileSync(process.env.EVENT_PATH, "utf8")) : {};

// The format contract, pre-fetched so the agent needs no shell to read it.
run("curl", ["-fsSL", "https://bisque.cloud/api/presentations/spec", "-o", join(work, "spec.md")]);

if (source === "release") {
  const tag = process.env.TAG_INPUT || event.release?.tag_name || "";
  if (!tag) fail("source is 'release' but this event carries no release. Use 'on: release: types: [published]', pass tag:, or pass source: pull-request.");

  const rel = ghJson(["release", "view", tag, "-R", repo, "--json", "name,tagName,body,publishedAt,author,url"]);
  const name = rel.name || rel.tagName;
  const tags = ghJson(["release", "list", "-R", repo, "--limit", "100", "--exclude-drafts", "--json", "tagName", "--jq", "[.[].tagName]"]);
  const prev = previousRelease(tags, tag);

  writeFileSync(
    join(src, "release.md"),
    [
      `# ${name}`,
      "",
      `Repository: ${repo}`,
      `Tag: ${tag}`,
      prev ? `Previous release: ${prev}` : "",
      `URL: ${rel.url || ""}`,
      "",
      "## Release notes, as the maintainers wrote them",
      "",
      rel.body || "(no release notes)",
      "",
    ]
      .filter((l) => l !== null)
      .join("\n"),
  );

  if (prev) {
    // Compare endpoint: commits and per-file patches. select-diff decides
    // which files the agent reads and reports the rest in changes.md.
    type Compare = { base_commit?: { sha: string }; commits?: Array<{ sha: string; commit: { message: string } }>; files?: ChangedFile[] };
    const cmp = ghJson<Compare>(["api", `repos/${repo}/compare/${prev}...${tag}`]);
    const commits = (cmp.commits ?? []).map((c) => `- ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0]}`);
    const files = (cmp.files ?? []).map((f) => `- ${f.filename} (+${f.additions} -${f.deletions})`);
    const sel = selectDiff(cmp.files ?? []);
    writeFileSync(
      join(src, "changes.md"),
      `## Commits since ${(cmp.base_commit?.sha ?? "").slice(0, 7)}\n\n${commits.join("\n")}\n\n## Changed files (${files.length})\n\n${files.join("\n")}\n` + describeOmissions(sel),
    );
    writeFileSync(join(src, "diff.patch"), sel.patch);
    if (sel.skipped.length || sel.cut.length) console.log(`diff: ${sel.skipped.length} file(s) skipped, ${sel.cut.length} cut; listed in changes.md`);
  } else {
    writeFileSync(join(src, "changes.md"), "First release; there is no previous tag to compare against.\n");
    writeFileSync(join(src, "diff.patch"), "");
  }

  writeFileSync(join(work, "TASK.md"), readFileSync(join(here, "prompt-release.md"), "utf8").replaceAll("{{REPO}}", repo));
  output("title", name);
  output("slug", slugify(tag));
  output("tag", tag);
  output("pr-number", "");
  console.log(`Release: ${name} (${tag}), previous: ${prev || "none"}`);
} else if (source === "pull-request") {
  const number = process.env.PR_INPUT || String(event.pull_request?.number ?? event.issue?.number ?? "");
  if (!number) fail("source is 'pull-request' but this event carries no pull request. Pass pull-request: <number> for a manual run.");

  const pr = ghJson(["pr", "view", number, "-R", repo, "--json", "title,body,author,mergedAt,labels,files,url,number"]);
  writeFileSync(
    join(src, "pr.md"),
    [
      `# #${number}: ${pr.title}`,
      "",
      `Repository: ${repo}`,
      `Author: ${pr.author?.login ?? ""}`,
      `Merged: ${pr.mergedAt ?? "not merged"}`,
      `URL: ${pr.url}`,
      `Labels: ${(pr.labels || []).map((l) => l.name).join(", ")}`,
      "",
      `## Changed files (${(pr.files || []).length})`,
      "",
      ...(pr.files || []).map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`),
      "",
      "## Body, as the author wrote it",
      "",
      pr.body || "(no description)",
      "",
    ].join("\n"),
  );
  // Per-file patches, same shape as the compare endpoint, so the same
  // selection applies. --paginate covers pull requests past 30 files.
  const prFiles = ghJson<ChangedFile[]>(["api", `repos/${repo}/pulls/${number}/files`, "--paginate", "--slurp"]).flat();
  const sel = selectDiff(prFiles);
  writeFileSync(join(src, "diff.patch"), sel.patch);
  if (sel.skipped.length || sel.cut.length) console.log(`diff: ${sel.skipped.length} file(s) skipped, ${sel.cut.length} cut; listed in pr.md`);
  let comments = "";
  try {
    comments = ghJson(["api", `repos/${repo}/pulls/${number}/comments`])
      .map((c) => `- ${c.user?.login ?? ""} on ${c.path}: ${c.body}`)
      .join("\n");
  } catch {
    comments = "";
  }
  writeFileSync(join(src, "comments.md"), comments);

  writeFileSync(join(work, "TASK.md"), readFileSync(join(here, "prompt-pull-request.md"), "utf8").replaceAll("{{REPO}}", repo));
  output("title", pr.title);
  output("slug", `pr-${number}-${slugify(pr.title)}`);
  output("tag", "");
  output("pr-number", number);
  console.log(`Pull request: #${number} ${pr.title}`);
} else {
  fail(`source must be 'release' or 'pull-request', got '${source}'.`);
}
