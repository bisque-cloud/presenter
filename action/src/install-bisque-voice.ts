// Install bisque-voice, the speech engine that narrates on the runner.
//
// This runs inside somebody else's CI, so it downloads one pinned tarball
// and checks its SHA-256 against a value committed here. It does not pipe a
// remote script into a shell: a maintainer reading this action can see
// exactly which bytes it fetches, and a change to what the server serves
// fails the job rather than running.
//
// Bumping the engine is a two-line edit: VERSION, then the checksums, both
// from https://download.bisque.today/bisque-voice/latest.json.
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fail, run } from "./action-step.ts";

export const VERSION = "0.1.21";

/** SHA-256 of each release tarball, from that version's latest.json. */
export const CHECKSUMS: Record<string, string> = {
  "aarch64-apple-darwin": "ad9b10b7c304f4f832c6722ceed541d49745b2faf4c5f6d6c16a790ec59cecf1",
  "x86_64-apple-darwin": "b948a428065b5f04e425f70724b9adce57950e507de4eea616152a141cf451f7",
  "x86_64-unknown-linux-gnu": "3e84fdb01920c24caf4af3659197551131afd895a60db6ac778a99a709e44490",
  "aarch64-unknown-linux-gnu": "db8883bb76a1efc472f416c59bd90b9a76e9eef68a93855d6bffac8be89e5108",
  "x86_64-pc-windows-msvc": "c7b6bea3d3d4438c0187d6dc636a7962af8242c3b305488b9f50990b290b4f17",
};

/** The Rust target triple for a Node platform and architecture. */
export function targetTriple(platform: string = process.platform, arch: string = process.arch): string {
  const key = `${platform}/${arch}`;
  const triples: Record<string, string> = {
    "darwin/arm64": "aarch64-apple-darwin",
    "darwin/x64": "x86_64-apple-darwin",
    "linux/x64": "x86_64-unknown-linux-gnu",
    "linux/arm64": "aarch64-unknown-linux-gnu",
    "win32/x64": "x86_64-pc-windows-msvc",
  };
  const triple = triples[key];
  if (!triple) {
    throw new Error(`bisque-voice has no build for ${key}. It ships ${Object.values(triples).join(", ")}.`);
  }
  return triple;
}

/** Where the installed binary lands, matching what the upstream installer does. */
export function binaryPath(home: string = homedir()): string {
  const name = process.platform === "win32" ? "bisque-voice.exe" : "bisque-voice";
  return join(home, ".bisque", "bin", name);
}

export function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Download, verify and unpack the pinned release. A no-op if it is present. */
export function installBisqueVoice(home: string = homedir()): string {
  const bin = binaryPath(home);
  if (existsSync(bin)) return bin;

  let triple: string;
  try {
    triple = targetTriple();
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
  const expected = CHECKSUMS[triple];
  if (!expected) return fail(`No checksum recorded for ${triple}. Update CHECKSUMS in install-bisque-voice.ts.`);

  const url = `https://download.bisque.today/bisque-voice/v${VERSION}/bisque-voice-${triple}.tar.gz`;
  const staging = join(tmpdir(), `bisque-voice-${VERSION}-${triple}`);
  const tarball = `${staging}.tar.gz`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  console.log(`bisque-voice ${VERSION} for ${triple}`);
  run("curl", ["-fsSL", "-o", tarball, url]);

  const got = sha256(tarball);
  if (got !== expected) {
    fail(`${url} does not match the checksum this action pins (expected ${expected}, got ${got}). Refusing to run it.`);
  }

  run("tar", ["xzf", tarball, "-C", staging]);
  // Copy every member: on Windows the .exe loads its DLLs from its own
  // directory, so the binary alone is not enough.
  const dest = join(home, ".bisque", "bin");
  mkdirSync(dest, { recursive: true });
  run("sh", ["-c", `cp -R "${staging}/." "${dest}/"`]);
  if (process.platform !== "win32") chmodSync(bin, 0o755);
  rmSync(tarball, { force: true });
  rmSync(staging, { recursive: true, force: true });

  if (!existsSync(bin)) fail(`The bisque-voice tarball unpacked without ${bin} in it.`);
  return bin;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const bin = installBisqueVoice();
  writeFileSync(process.env.GITHUB_ENV ?? "/dev/null", `BISQUE_VOICE=${bin}\n`, { flag: "a" });
  console.log(bin);
}
