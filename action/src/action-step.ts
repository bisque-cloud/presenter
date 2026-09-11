// How a step talks to the runner: annotations, outputs, commands, the
// working directory. TypeScript run directly by the runner's Node (22.18+
// strips types), so there is no build step; erasable syntax only, imports
// carry the .ts extension.
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { appendFileSync } from "node:fs";

/** Print a GitHub error annotation and stop the step. */
export function fail(message: string, code = 1): never {
  console.error(`::error::${message}`);
  process.exit(code);
}

/** Print a GitHub warning annotation. */
export function warn(message: string): void {
  console.log(`::warning::${message}`);
}

/** Append a step output. A no-op outside Actions. */
export function output(name: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `${name}=${value}\n`);
}

/** Run a command with inherited stdio; fail the step on a non-zero exit. */
export function run(
  cmd: string,
  args: string[],
  opts: SpawnSyncOptions = {},
): void {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error) fail(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) fail(`${cmd} exited with status ${r.status}`);
}

/** This action's working directory for the job, under the runner's temp. */
export function workDir(): string {
  return (
    process.env.WORK || `${process.env.RUNNER_TEMP || "/tmp"}/release-explainer`
  );
}
