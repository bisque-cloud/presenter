// Step: narrate on this runner with bisque-voice, then publish through the
// present skill. This step is the only one that can mint the run's GitHub
// identity, and it runs a fresh copy of the skill whose hash it verifies first.
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

// This repository publishes itself, through the run's GitHub OIDC identity,
// unless Bisque credentials are in the environment, which the skill prefers.
// Checked before anything is installed or narrated, so a missing permission
// costs seconds, not minutes.
const withKey = Boolean(
  process.env.BISQUE_API_KEY && process.env.BISQUE_USER_ID,
);
if (!withKey && !process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
  fail(
    "Publishing as this repository needs the workflow to grant `permissions: id-token: write`.",
  );
}
console.log(
  withKey
    ? `publishing ${process.env.REPO} with the Bisque key in the environment`
    : `publishing as ${process.env.REPO} to its own channel (GitHub OIDC, no Bisque account)`,
);

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
// repository's is private: only people who can open the repository on
// GitHub can watch it, after signing in with GitHub. Copying the example
// unchanged never puts private notes and diffs on a public channel.
if (!visibility) {
  const isPrivate = ghJson([
    "repo",
    "view",
    process.env.REPO,
    "--json",
    "isPrivate",
  ]).isPrivate;
  visibility = isPrivate ? "private" : "public";
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
  // This step is the last one; nobody is left to fix what the agent missed,
  // so a content problem publishes as a warning rather than losing the run.
  "--best-effort",
];
// The speed a `presentation`'s narration was made at; publish otherwise
// narrates at its default and would not reuse audio made at another.
if (process.env.SPEED) args.push("--speed", process.env.SPEED);
if (existsSync(join(out, "context.md"))) args.push("--context", "context.md");
// One retry: what is left to fail is the network or the server, and a
// republish of the same slug carries forward what already landed.
const publish = () =>
  spawnSync("node", [presentMjs, ...args], {
    cwd: out,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 64 * 1024 * 1024,
  });
let r = publish();
if (r.status !== 0) {
  warn(`publish exited with status ${r.status}; retrying once in 30 seconds`);
  spawnSync("sleep", ["30"]);
  r = publish();
}
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
