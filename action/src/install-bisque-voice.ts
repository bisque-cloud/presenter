// Install bisque-voice, the speech engine that narrates on the runner.
//
// This runs inside somebody else's CI, so it downloads one pinned tarball
// and checks its SHA-256 against a value committed here. It does not pipe a
// remote script into a shell: a maintainer reading this action can see
// exactly which bytes it fetches, and a change to what the server serves
// fails the job rather than running.
//
// Bumping the engine is a two-line edit: VERSION, then the checksums, both
// from that release's latest.json on
// https://github.com/bisque-cloud/bisque-voice/releases.
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fail, run } from "./action-step.ts";

export const VERSION = "0.1.39";

/** SHA-256 of each release tarball, from that version's latest.json. */
export const CHECKSUMS: Record<string, string> = {
  "aarch64-apple-darwin":
    "3934e7334156c349fa060dae36cce3c2c8018d2ff466fcbfd7f7185926d3a636",
  "x86_64-apple-darwin":
    "8069277d241756c1bf5a56f620ffa3290cd2e3e5fe2f881c259aec529e6ca975",
  "x86_64-unknown-linux-gnu":
    "64bdbc74d52ad9b26dc19396c9f36c4a682d183c75013b4b67a0515056ee5732",
  "aarch64-unknown-linux-gnu":
    "b8c84ebd61d25d935077a5e59cf0442d83920be6d3bcc9de852304bd8b7e1b44",
  "x86_64-pc-windows-msvc":
    "55b375bed27e90f76f547983e26175d27f73a0926ecd6e774c1962dea61947f0",
};

/** The Rust target triple for a Node platform and architecture. */
export function targetTriple(
  platform: string = process.platform,
  arch: string = process.arch,
): string {
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
    throw new Error(
      `bisque-voice has no build for ${key}. It ships ${Object.values(triples).join(", ")}.`,
    );
  }
  return triple;
}

/** Where the installed binary lands, matching what the upstream installer does. */
export function binaryPath(home: string = homedir()): string {
  const name =
    process.platform === "win32" ? "bisque-voice.exe" : "bisque-voice";
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
  if (!expected)
    return fail(
      `No checksum recorded for ${triple}. Update CHECKSUMS in install-bisque-voice.ts.`,
    );

  const url = `https://github.com/bisque-cloud/bisque-voice/releases/download/v${VERSION}/bisque-voice-${triple}.tar.gz`;
  const staging = join(tmpdir(), `bisque-voice-${VERSION}-${triple}`);
  const tarball = `${staging}.tar.gz`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  console.log(`bisque-voice ${VERSION} for ${triple}`);
  run("curl", ["-fsSL", "-o", tarball, url]);

  const got = sha256(tarball);
  if (got !== expected) {
    fail(
      `${url} does not match the checksum this action pins (expected ${expected}, got ${got}). Refusing to run it.`,
    );
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

  if (!existsSync(bin))
    fail(`The bisque-voice tarball unpacked without ${bin} in it.`);
  return bin;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const bin = installBisqueVoice();
  writeFileSync(
    process.env.GITHUB_ENV ?? "/dev/null",
    `BISQUE_VOICE=${bin}\n`,
    { flag: "a" },
  );
  console.log(bin);
}
