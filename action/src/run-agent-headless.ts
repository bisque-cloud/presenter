// Step: run OpenCode headless in $WORK with the task prompt. The agent
// writes out/index.html and out/context.md and stops.
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
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fail, workDir } from "./action-step.ts";
import { providerOf } from "./model-provider.ts";

const work = workDir();
// Resolved by the proxy step, which is the only place the keys are read.
const model = process.env.MODEL ?? "";
const variant = process.env.VARIANT ?? "";
const basePath = process.env.BASE_PATH ?? "";
const port = process.env.PROXY_PORT ?? "";
const actionPath = process.env.ACTION_PATH ?? "";

if (!model.includes("/")) fail(`the proxy step resolved no model; got '${model}'`);
if (!port) fail("the key proxy is not running; the proxy start step must run before this one");
const provider = providerOf(model);

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

const network = (process.env.NETWORK ?? "allow") === "deny" ? "deny" : "allow";
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
  external_directory: { "*": "deny", "/tmp/**": "allow", [`${tmp}/**`]: "allow" },
  edit: "allow",
  read: "allow",
  glob: "allow",
  grep: "allow",
  list: "allow",
  skill: "allow",
};
if (network === "deny") {
  console.log("network: deny — the agent cannot download fonts or images, so the presentation will use system font stacks");
}

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
  },
  stdio: ["ignore", "inherit", "inherit"],
  maxBuffer: 256 * 1024 * 1024,
});
if (r.error) fail(`opencode: ${r.error.message}`);
if (r.status !== 0) fail(`opencode exited with status ${r.status}`);

// OpenCode exits 0 when the model finishes its turn, whether or not it did
// the job, so the output is what decides.
const html = join(work, "out", "index.html");
if (!existsSync(html) || statSync(html).size === 0) {
  fail("The agent finished without writing out/index.html. See the log above for what it did instead.");
}
console.log(`${model} wrote out/index.html (${statSync(html).size} bytes)`);
