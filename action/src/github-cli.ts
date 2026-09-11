// Read and write GitHub through the `gh` CLI with the job's token.
//
// A failed `gh` call is reported as a GitHub error annotation naming the
// command and what gh said, because the maintainer reading the job log
// needs to know which call failed, not a Node stack trace.
import { execFileSync } from "node:child_process";
import { fail } from "./action-step.ts";

/** Run `gh` with arguments and return stdout. */
export function gh(args: string[]): string {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const e = err as {
      stderr?: string | Buffer;
      status?: number;
      code?: string;
    };
    if (e.code === "ENOENT")
      fail(
        "The `gh` CLI is missing from this runner. GitHub-hosted runners ship it; a self-hosted runner needs it installed.",
      );
    const said = String(e.stderr ?? "").trim();
    fail(
      `gh ${args.slice(0, 3).join(" ")} failed${e.status ? ` (exit ${e.status})` : ""}${said ? `: ${said}` : ""}`,
    );
  }
}

/** Run `gh` and parse its JSON output. */
export function ghJson<T = unknown>(args: string[]): T {
  const out = gh(args);
  try {
    return JSON.parse(out) as T;
  } catch {
    return fail(
      `gh ${args.slice(0, 3).join(" ")} returned output that is not JSON: ${out.slice(0, 200)}`,
    );
  }
}
