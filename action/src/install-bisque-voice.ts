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

export const VERSION = "0.1.35";

/** SHA-256 of each release tarball, from that version's latest.json. */
export const CHECKSUMS: Record<string, string> = {
  "aarch64-apple-darwin":
    "76779a55761b54f7c91b168d3b1eb6555d2be4269909961088a8de0b76def886",
  "x86_64-apple-darwin":
    "1887ac9a09e75d8f83b807abb171375cd30fb042cfaa1f242845a16e654606f3",
  "x86_64-unknown-linux-gnu":
    "87a57b8ba3f26d396846cb26065b10cd8d38c75a069a46b68388781e38ddceed",
  "aarch64-unknown-linux-gnu":
    "3fbddddd21ff6ff84132925a51d80cbb47fc737bae90df98a6969f1f89afe132",
  "x86_64-pc-windows-msvc":
    "8567fb33f44e719277889283fd32a66769486b0f2d561967aa6db8bdbb02b290",
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

  const url = `https://download.bisque.today/bisque-voice/v${VERSION}/bisque-voice-${triple}.tar.gz`;
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
