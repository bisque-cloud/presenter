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

export const VERSION = "0.1.38";

/** SHA-256 of each release tarball, from that version's latest.json. */
export const CHECKSUMS: Record<string, string> = {
  "aarch64-apple-darwin":
    "7660f7d79626f1c73e0f4b2dcb29302edab105695306af3da1948f5c02c9ef50",
  "x86_64-apple-darwin":
    "decc4fc6b40d851763591dfa0d9ee043d203dd4275b5f34df51f38be06dfcdad",
  "x86_64-unknown-linux-gnu":
    "ae2b53975fd26e9baee972d310d71954e1c059fceb940f9307b290da3160de8a",
  "aarch64-unknown-linux-gnu":
    "75f367efaa419d1840bcfe6751b6955d4d9262a8d365f7d9b86e6cf70e28840d",
  "x86_64-pc-windows-msvc":
    "bbfec12bb2f0862ffd28677fc36fad93ee19d22b7951fd16db4aeb6f1be18515",
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
