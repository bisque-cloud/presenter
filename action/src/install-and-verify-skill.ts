// Step: guard the present skill in this action's own checkout, which is
// where OpenCode reads it from (skills.paths), so the action version pins
// the skill version.
//
//   node install-and-verify-skill.ts hash      write the skill tree's hash to the step output
//   node install-and-verify-skill.ts verify    fail when the tree's hash is not EXPECTED_HASH
//
// The hash is recorded before the agent runs and checked at publish, so an
// agent that edits present.mjs during its turn gets nothing executed with
// the Bisque credential.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fail, output } from "./action-step.ts";

const actionPath = process.env.ACTION_PATH ?? "";
const skill = join(actionPath, "skills", "present");
if (!existsSync(join(skill, "SKILL.md")))
  fail("skills/present is missing from the action checkout");

/** A stable SHA-256 over every file under the skill, by relative path and content. */
export function treeHash(root: string = skill): string {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(root);
  const h = createHash("sha256");
  for (const f of files) {
    h.update(relative(root, f));
    h.update("\0");
    h.update(readFileSync(f));
    h.update("\0");
  }
  return h.digest("hex");
}

const cmd = process.argv[2];
if (cmd === "hash") {
  const h = treeHash();
  output("hash", h);
  console.log(`skill hash ${h}`);
} else if (cmd === "verify") {
  const h = treeHash();
  if (h !== process.env.EXPECTED_HASH) {
    fail(
      `The present skill in the action checkout changed during the agent step (expected ${process.env.EXPECTED_HASH || "?"}, got ${h}). Refusing to publish with it.`,
    );
  }
  console.log("skill unchanged since before the agent ran");
} else if (cmd) {
  fail(`install-and-verify-skill.ts: unknown command '${cmd}'`);
}
