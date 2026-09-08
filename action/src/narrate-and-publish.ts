// Step: narrate on this runner with bisque-voice, then publish through the
// present skill. This step is the only one that holds the Bisque credential,
// and it runs a fresh copy of the skill whose hash it verifies first.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fail, output, run, warn, workDir } from "./action-step.ts";
import { ghJson } from "./github-cli.ts";

const work = workDir();
const out = join(work, "out");
const actionPath = process.env.ACTION_PATH;
const voice = process.env.VOICE || "kokoro:af_heart";
let visibility = process.env.VISIBILITY || "";
const bv = join(homedir(), ".bisque", "bin", "bisque-voice");

// The skill copy the agent could reach is not the one that runs here.
run("node", [new URL("./install-and-verify-skill.ts", import.meta.url).pathname, "verify"]);
const fresh = join(process.env.RUNNER_TEMP || work, "present-fresh");
rmSync(fresh, { recursive: true, force: true });
cpSync(join(actionPath, "skills", "present"), fresh, { recursive: true });
const presentMjs = join(fresh, "scripts", "present.mjs");

if (!voice.includes(":")) fail(`voice must be engine-qualified, like kokoro:af_heart; got '${voice}'. Run 'bisque-voice engines' for the engine ids.`);
const engine = voice.split(":")[0];

if (!existsSync(bv)) run("sh", ["-c", "curl -fsSL https://download.bisque.today/bisque-voice/install.sh | sh"]);
run(bv, ["--version"]);
const engines = JSON.parse(execFileSync(bv, ["engines", "--json"], { encoding: "utf8" }));
const hit = (Array.isArray(engines) ? engines : engines.engines || []).find((e) => e.id === engine);
if (!hit) fail(`'${engine}' is not a bisque-voice engine. Run 'bisque-voice engines' for the ids.`);
if (!hit.installed) {
  console.log(`Installing the ${engine} speech model (cached for the next run)`);
  run(bv, ["install", engine]);
}

// Visibility: an explicit input wins. Otherwise a public repository's
// explainer is public, like the release it explains, and a private
// repository's is unlisted, so copying the example unchanged never puts
// private notes and diffs on a public channel.
if (!visibility) {
  const isPrivate = ghJson(["repo", "view", process.env.REPO, "--json", "isPrivate"]).isPrivate;
  visibility = isPrivate ? "unlisted" : "public";
  console.log(`visibility: ${visibility} (from repository visibility)`);
}

const args = ["publish", "--html", "index.html", "--voice", voice, "--title", process.env.TITLE || "", "--slug", process.env.SLUG || "", "--visibility", visibility];
if (existsSync(join(out, "context.md"))) args.push("--context", "context.md");
const r = spawnSync("node", [presentMjs, ...args], { cwd: out, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) fail(`publish exited with status ${r.status}`);
let res;
try {
  res = JSON.parse(r.stdout);
} catch {
  fail(`publish printed no JSON:\n${(r.stdout || "").slice(0, 2000)}`);
}
if (!res.webUrl) fail(`publish returned no webUrl:\n${JSON.stringify(res).slice(0, 2000)}`);
output("watch-url", res.webUrl);
output("presentation-id", res.presentationId ?? "");
console.log(`Published: ${res.webUrl}`);
if (res.staleSlides?.length) warn(`approximate timings on slides ${res.staleSlides.join(", ")}`);
for (const w of res.warnings ?? []) warn(w);
