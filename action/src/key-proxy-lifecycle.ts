// Step: start or stop the key proxy.
//
//   node key-proxy-lifecycle.ts start    MODEL and API_KEY in env
//   node key-proxy-lifecycle.ts stop     always runs, after the agent step
//
// The start step is the only one whose environment carries the provider
// key. It hands the key to key-proxy-server.ts over stdin, with the key
// stripped from the child's environment, and detaches. So the agent step
// that follows has no key in its own environment and none in any process
// environment it can read.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail, output, workDir } from "./action-step.ts";
import { providerOf, proxyUpstream } from "./model-provider.ts";

const work = workDir();
mkdirSync(work, { recursive: true });
const pidfile = join(work, "key-proxy.pid");
const logfile = join(work, "key-proxy.log");

async function start(): Promise<void> {
  const model = process.env.MODEL ?? "";
  if (!model.includes("/")) {
    fail(`model must be provider/model, like anthropic/claude-sonnet-4-6; got '${model}'. See https://models.dev for the catalog.`);
  }
  const provider = providerOf(model);
  let upstream;
  try {
    upstream = proxyUpstream(provider);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  const key = process.env.API_KEY ?? "";
  if (!key) fail(`api-key is empty. It is the key for '${provider}', normally read from ${upstream.envVar}.`);

  // The proxy's own environment carries no key: it arrives over stdin.
  const env = { ...process.env };
  delete env.API_KEY;
  for (const p of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "XAI_API_KEY"]) delete env[p];

  const child = spawn("node", [new URL("./key-proxy-server.ts", import.meta.url).pathname, upstream.origin, upstream.header, "-", upstream.prefix], {
    env,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.end(key);
  const port = await new Promise<string>((resolve) => {
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
      const line = out.split("\n")[0].trim();
      if (/^\d+$/.test(line)) resolve(line);
    });
    child.stderr.on("data", (d) => (err += d));
    child.on("exit", () => {
      writeFileSync(logfile, err);
      resolve("");
    });
    setTimeout(() => resolve(""), 5000);
  });
  if (!port) fail(`key proxy failed to start${existsSync(logfile) ? ": " + readFileSync(logfile, "utf8") : ""}`);
  child.stdout.destroy();
  child.stderr.destroy();
  child.unref();
  writeFileSync(pidfile, String(child.pid));
  output("port", port);
  output("provider", provider);
  console.log(`key proxy for ${provider} on 127.0.0.1:${port} (pid ${child.pid})`);
}

function stop(): void {
  if (!existsSync(pidfile)) return;
  const pid = Number(readFileSync(pidfile, "utf8").trim());
  try {
    process.kill(pid);
  } catch {
    // already gone
  }
  rmSync(pidfile, { force: true });
  console.log(`key proxy stopped (pid ${pid})`);
}

const cmd = process.argv[2];
if (cmd === "start") await start();
else if (cmd === "stop") stop();
else fail("key-proxy-lifecycle.ts: use 'start' or 'stop'");
