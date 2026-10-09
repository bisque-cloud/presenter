// Step: narrate on this runner with bisque-voice, then publish through the
// present skill. This step is the only one that holds the Bisque credential,
// and it runs a fresh copy of the skill whose hash it verifies first.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fail, output, run, warn, workDir } from "./action-step.ts";
import { installBisqueVoice } from "./install-bisque-voice.ts";
import { ghJson } from "./github-cli.ts";
import { voiceArgs } from "./voice-args.ts";

const work = workDir();
const out = join(work, "out");
const actionPath = process.env.ACTION_PATH;
let visibility = process.env.VISIBILITY || "";

// The skill copy the agent could reach is not the one that runs here.
run("node", [
  new URL("./install-and-verify-skill.ts", import.meta.url).pathname,
  "verify",
]);
const fresh = join(process.env.RUNNER_TEMP || work, "present-fresh");
rmSync(fresh, { recursive: true, force: true });
cpSync(join(actionPath, "skills", "present"), fresh, { recursive: true });
const presentMjs = join(fresh, "scripts", "present.mjs");

let voiceFlags: string[];
try {
  voiceFlags = voiceArgs(process.env.VOICE);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

// A pinned, checksummed tarball rather than a piped install script; see
// install-bisque-voice.ts. The speech model is not installed here: publish
// resolves the voice (the input, else the channel's or account's saved one,
// else the fallback) and installs whichever engine that names, once, into the
// cached ~/.bisque/models.
const bv = installBisqueVoice();
run(bv, ["--version"]);

// Visibility: an explicit input wins. Otherwise a public repository's
// explainer is public, like the release it explains, and a private
// repository's is unlisted, so copying the example unchanged never puts
// private notes and diffs on a public channel.
if (!visibility) {
  const isPrivate = ghJson([
    "repo",
    "view",
    process.env.REPO,
    "--json",
    "isPrivate",
  ]).isPrivate;
  visibility = isPrivate ? "unlisted" : "public";
  console.log(`visibility: ${visibility} (from repository visibility)`);
}

const args = [
  "publish",
  "--html",
  "index.html",
  ...voiceFlags,
  "--title",
  process.env.TITLE || "",
  "--slug",
  process.env.SLUG || "",
  "--visibility",
  visibility,
];
if (existsSync(join(out, "context.md"))) args.push("--context", "context.md");
const r = spawnSync("node", [presentMjs, ...args], {
  cwd: out,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) fail(`publish exited with status ${r.status}`);
let res;
try {
  res = JSON.parse(r.stdout);
} catch {
  fail(`publish printed no JSON:\n${(r.stdout || "").slice(0, 2000)}`);
}
if (!res.webUrl)
  fail(`publish returned no webUrl:\n${JSON.stringify(res).slice(0, 2000)}`);
output("watch-url", res.webUrl);
output("presentation-id", res.presentationId ?? "");
console.log(`Published: ${res.webUrl}`);
if (res.staleSlides?.length)
  warn(`approximate timings on slides ${res.staleSlides.join(", ")}`);
for (const w of res.warnings ?? []) warn(w);
