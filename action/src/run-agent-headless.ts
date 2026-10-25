// Step: run OpenCode headless in $WORK with the task prompt. The agent
// writes out/index.html and out/context.md and stops.
//
// A Claude subscription (`claude-code-oauth-token`) runs Claude Code here
// instead, the only harness that token may be used in; see runClaudeCode.
//
// One harness for every model. `model` is a provider/model id from
// models.dev, so Anthropic, OpenAI, Google and xAI are the same code path
// and a new model is a string change in the maintainer's workflow.
//
// This step's environment carries no provider key. The key proxy already
// holds it (see key-proxy-lifecycle.ts), and OpenCode is pointed at the
// proxy through the provider's baseURL with a placeholder key.
//
// Permissions come from OPENCODE_PERMISSION, the shape real workflows use
// (RSSHub, uptime-kuma). The agent gets a shell and the network by default,
// because it needs them to download the fonts and images the presentation
// format requires. A maintainer who takes pull requests from strangers can
// set network: deny, which costs custom typography and any image the agent
// would have fetched.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { fail, output, warn, workDir } from "./action-step.ts";
import { cleanReason, SKIP_FILE } from "./judgment.ts";
import { providerOf } from "./model-provider.ts";
import { refusalIn, refusalWarning } from "./provider-refusal.ts";

const work = workDir();
// Resolved by the proxy step, which is the only place the keys are read.
const model = process.env.MODEL ?? "";
const variant = process.env.VARIANT ?? "";
const basePath = process.env.BASE_PATH ?? "";
const port = process.env.PROXY_PORT ?? "";
const actionPath = process.env.ACTION_PATH ?? "";

if (!model.includes("/"))
  fail(`the proxy step resolved no model; got '${model}'`);
if (!port)
  fail(
    "the key proxy is not running; the proxy start step must run before this one",
  );
const provider = providerOf(model);
const network = (process.env.NETWORK ?? "allow") === "deny" ? "deny" : "allow";
if (network === "deny") {
  console.log(
    "network: deny — the agent cannot download fonts or images, so the presentation will use system font stacks",
  );
}

/**
 * Claude Code on the maintainer's Claude plan. Same contract as OpenCode
 * below: a minimal environment, no real credential (the key proxy holds the
 * subscription token and Claude Code sends every request to it with a
 * placeholder), the present skill from this action's checkout, and the
 * shell and network only when `network` allows them.
 *
 * `--permission-mode dontAsk` refuses any tool not listed rather than
 * waiting on a prompt nobody will answer. `--setting-sources project` reads
 * settings and skills from $WORK only, never a self-hosted runner's own
 * ~/.claude, and HOME is a fresh directory for the same reason.
 */
// The engine for the skill's checks, installed by the step before this one,
// and the runner's real model directory, so a voice the check downloads is
// the one publish narrates with and the cache saves. Claude Code runs with a
// fresh HOME, which would otherwise hide both.
const voiceEnv = {
  BISQUE_VOICE_BIN:
    process.env.BISQUE_VOICE ??
    join(process.env.HOME ?? "", ".bisque", "bin", "bisque-voice"),
  BISQUE_VOICE_MODEL_DIR: join(process.env.HOME ?? "", ".bisque", "models"),
};

function runClaudeCode(): number | null {
  const skills = join(work, ".claude", "skills");
  rmSync(skills, { recursive: true, force: true });
  mkdirSync(skills, { recursive: true });
  cpSync(join(actionPath, "skills", "present"), join(skills, "present"), {
    recursive: true,
  });
  const home = join(work, ".claude-home");
  mkdirSync(home, { recursive: true });

  const allowed = ["Read", "Write", "Edit", "Glob", "Grep", "Skill"];
  const denied = ["WebSearch"];
  if (network === "allow") allowed.push("Bash", "WebFetch");
  else denied.push("Bash", "WebFetch");

  const name = model.slice(model.indexOf("/") + 1);
  const args = [
    "-p",
    "Read TASK.md and do what it says.",
    "--permission-mode",
    "dontAsk",
    "--setting-sources",
    "project",
    "--strict-mcp-config",
    "--allowedTools",
    ...allowed,
    "--disallowedTools",
    ...denied,
  ];
  if (name !== "default") args.push("--model", name);
  if (variant) args.push("--effort", variant);

  const r = spawnSync("claude", args, {
    cwd: work,
    env: {
      PATH: process.env.PATH,
      HOME: home,
      TMPDIR: process.env.TMPDIR ?? "/tmp",
      LANG: process.env.LANG ?? "C.UTF-8",
      TERM: "dumb",
      CI: "true",
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}${basePath}`,
      // The proxy swaps this for the real token on the way out.
      CLAUDE_CODE_OAUTH_TOKEN: "sk-ant-oat01-placeholder-held-by-key-proxy",
      DISABLE_AUTOUPDATER: "1",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      ...voiceEnv,
    },
    stdio: ["ignore", "inherit", "inherit"],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.error) fail(`claude: ${r.error.message}`);
  return r.status;
}

/**
 * Stop the step over a failed agent. On a pull request, when the provider's
 * last answer was a refused key or a spent quota, that is the maintainer's
 * setup or plan and not the contributor's change: the step passes with one
 * warning and `refused` set, and the later steps publish nothing. Anything
 * else fails as before. Releases always fail, as a missing key does, because
 * the person who sees that check is the maintainer who can fix it.
 */
function agentFailed(message: string): never {
  const refusal =
    process.env.SOURCE === "pull-request" ? refusalIn(work) : null;
  if (!refusal) fail(message);
  console.log(message);
  warn(refusalWarning(refusal, model));
  output("refused", refusal);
  process.exit(0);
}

if (provider === "claude-code") {
  const status = runClaudeCode();
  if (status !== 0) agentFailed(`claude exited with status ${status}`);
  checkOutput();
  process.exit(0);
}

// Everything OpenCode needs, inline: no config file on disk for the agent
// to read or edit. The key here is a placeholder; the proxy holds the real
// one. skills.paths points at this action's own checkout, so the skill the
// agent reads is the one the action version pins.
const config = {
  $schema: "https://opencode.ai/config.json",
  autoupdate: false,
  share: "disabled",
  skills: { paths: [join(actionPath, "skills")] },
  provider: {
    [provider]: {
      options: {
        baseURL: `http://127.0.0.1:${port}${basePath}`,
        apiKey: "placeholder-held-by-key-proxy",
      },
    },
  },
};

// Anything outside the working directory is denied except the temp
// directories, which a model reaches for when it stages a download before
// unpacking it into out/assets. Broad rules first, narrow last: OpenCode
// evaluates the last match.
const tmp = (process.env.TMPDIR ?? "/tmp").replace(/\/$/, "");
const permission = {
  bash: network,
  webfetch: network,
  // Nothing in the task needs a search engine.
  websearch: "deny",
  external_directory: {
    "*": "deny",
    "/tmp/**": "allow",
    [`${tmp}/**`]: "allow",
  },
  edit: "allow",
  read: "allow",
  glob: "allow",
  grep: "allow",
  list: "allow",
  skill: "allow",
};
// Default (formatted) output, not JSON: this goes straight into the job
// log, where a maintainer reads what the agent did. Nothing parses it.
const args = ["run", "--model", model];
if (variant) args.push("--variant", variant);
args.push("Read TASK.md and do what it says.");

const r = spawnSync("opencode", args, {
  cwd: work,
  // A minimal environment: the job's other secrets never reach the agent.
  env: {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    LANG: process.env.LANG ?? "C.UTF-8",
    TERM: "dumb",
    CI: "true",
    OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
    OPENCODE_PERMISSION: JSON.stringify(permission),
    OPENCODE_DISABLE_EXTERNAL_SKILLS: "1",
    ...voiceEnv,
  },
  stdio: ["ignore", "inherit", "inherit"],
  maxBuffer: 256 * 1024 * 1024,
});
if (r.error) fail(`opencode: ${r.error.message}`);
if (r.status !== 0) agentFailed(`opencode exited with status ${r.status}`);

checkOutput();

// Either harness exits 0 when the model finishes its turn, whether or not it
// did the job, so the output is what decides.
//
// Under `when: judged` the model may decline instead: out/skipped.txt and no
// out/index.html. That ends the step green with `skipped=true`, and the
// later steps post the reason rather than publish. A presentation wins over
// a stray skip file, and a run that wrote neither failed.
function checkOutput(): void {
  const html = join(work, "out", "index.html");
  const skip = join(work, "out", SKIP_FILE);
  const wroteHtml = existsSync(html) && statSync(html).size > 0;
  if (process.env.MODE === "judged" && existsSync(skip)) {
    if (wroteHtml) {
      warn(
        `${model} wrote both out/index.html and out/${SKIP_FILE}; publishing the presentation.`,
      );
    } else {
      const reason = cleanReason(readFileSync(skip, "utf8"));
      output("skipped", "true");
      output("skip-reason", reason);
      console.log(`::notice::Skipped: ${reason}`);
      return;
    }
  }
  if (!wroteHtml) {
    agentFailed(
      "The agent finished without writing out/index.html. See the log above for what it did instead.",
    );
  }
  output("skipped", "false");
  console.log(`${model} wrote out/index.html (${statSync(html).size} bytes)`);
}
