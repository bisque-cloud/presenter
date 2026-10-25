// Step, publish-only: copy the presentation an earlier job wrote into
// $WORK/out, where the agent's output would be, so the publish step runs on it
// unchanged. For a workflow that authors with anthropics/claude-code-action,
// which removes the means to mint the run's GitHub identity from Claude's
// session, so the agent there cannot publish. Claude narrates there with the
// skill's `narrate`, and this step names the voice and speed that audio was
// made in, so the publish uploads it instead of narrating again.
import {
  cpSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fail, output, warn, workDir } from "./action-step.ts";

/**
 * The folder to publish, or the reason it cannot be. A relative path is read
 * from the workspace, the way `actions/upload-artifact` reads `path`.
 */
export function presentationFolder(
  input: string,
  workspace: string,
): { dir: string } | { error: string } {
  const given = input.trim();
  if (!given) return { error: "presentation is empty." };
  const dir = isAbsolute(given) ? given : resolve(workspace, given);
  if (!existsSync(dir) || !lstatSync(dir).isDirectory())
    return {
      error: `presentation: ${dir} is not a folder. Point it at the folder the earlier job wrote, after downloading it in this job.`,
    };
  if (!existsSync(join(dir, "index.html")))
    return {
      error: `presentation: ${dir} has no index.html. The job that authored it may have stopped early or written it somewhere else; its log says which.`,
    };
  return { dir };
}

/**
 * The voice and speed of the narration `narrate` left in `<dir>/audio/`, read
 * from the sidecar beside each MP3. Null when there is none, or when the
 * slides disagree, so the publish falls back to the voice it would choose
 * and narrates what does not match.
 */
export function narratedVoice(
  dir: string,
): { voice: string; speed: number; slides: number } | null {
  const audio = join(dir, "audio");
  if (!existsSync(audio)) return null;
  const seen = new Set<string>();
  let found: { voice: string; speed: number } | null = null;
  let slides = 0;
  for (const name of readdirSync(audio)) {
    if (!name.endsWith(".json")) continue;
    let sidecar: { voice?: unknown; speed?: unknown };
    try {
      sidecar = JSON.parse(readFileSync(join(audio, name), "utf8"));
    } catch {
      continue;
    }
    if (typeof sidecar.voice !== "string" || typeof sidecar.speed !== "number")
      continue;
    found = { voice: sidecar.voice, speed: sidecar.speed };
    seen.add(`${found.voice}@${found.speed}`);
    slides++;
  }
  if (!found || seen.size !== 1) return null;
  return { ...found, slides };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const found = presentationFolder(
    process.env.PRESENTATION ?? "",
    process.env.GITHUB_WORKSPACE || process.cwd(),
  );
  if ("error" in found) fail(found.error);
  const out = join(workDir(), "out");
  rmSync(out, { recursive: true, force: true });
  cpSync(found.dir, out, { recursive: true });
  console.log(`publishing the presentation in ${found.dir}`);
  const narrated = narratedVoice(out);
  if (narrated) {
    console.log(
      `narrated in the earlier job: ${narrated.slides} slide(s) in ${narrated.voice} at speed ${narrated.speed}`,
    );
    output("voice", narrated.voice);
    output("speed", String(narrated.speed));
  } else {
    warn(
      "the earlier job left no narration in one voice (audio/), so this job narrates. Have it run the skill's `narrate` before uploading the folder.",
    );
  }
}
