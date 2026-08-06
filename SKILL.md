---
name: present
description: Authors a narrated presentation and publishes it to a shareable watch URL. Use when asked to make a presentation, slides, a video, a deck, a slideshow, a narrated briefing, or a talk.
---

# Present

You author one `index.html`, `bisque-voice` narrates it **on this machine**, and
Bisque publishes it. Free, unlimited, identical on macOS, Linux and Windows.

`scripts/present.mjs` in this skill directory does the mechanical half — narration
extraction, synthesis, publish, upload, complete. Run it with `node` (18+) or
`bun`; below, `present.mjs` means that file's absolute path.

## 1. Check the machine

```sh
node present.mjs doctor
```

It prints the `bisque-voice` path, which engines/aligners are installed,
whether credentials resolve, the account behind them (username, tier, and any
account settings from bisque.cloud), and — when an engine is installed — runs a
one-word **smoke synthesis** that also checks the audio is audible, so a broken
or silent engine is caught here rather than at publish time. Fix whatever it
reports, in this order:

**No `bisque-voice`.** It lives at `~/.bisque/bin/bisque-voice`
(`%USERPROFILE%\.bisque\bin\bisque-voice.exe`), which is usually **not** on
`PATH` — never probe with `command -v`/`where`. Tell the user you are about to
download it (~30 MB) and what it is, then:

```sh
curl -fsSL https://download.bisque.today/bisque-voice/install.sh | sh   # macOS, Linux
```

```powershell
irm https://download.bisque.today/bisque-voice/install.ps1 | iex        # Windows
```

**No engine installed.** There is deliberately no default speech model and no
default voice — the user picks. Run `~/.bisque/bin/bisque-voice engines --json`
and present each entry's real trade-offs (`summary`, `downloadBytes`,
`languages`, `voiceCount`, `parameters`) in a sentence each, then ask which to
install; more than one is fine. An entry carrying an `unsupported` field
cannot run in this build (kokoro on Intel Macs, for example) — relay its
`message` and offer the rest. `bisque-voice install <id>` installs. Then pick
a voice: if `doctor` printed a `settings` line with a voice, that account
setting is the default and `publish` uses it automatically — only ask the user
when there is none. When asking, use the engine's own quality metadata: each
entry in `engines --json` may carry a `voices` array (id, `grade`,
`recommended` — recommended first). Offer the **recommended** voices with
their grades, suggesting `kokoro:af_heart` (grade A) as the default. Only if
the user wants more options show the rest, grades attached — "not
recommended" means the voice has **audible quality issues** (upstream trained
it on very little data), not a licensing matter. The Studio named voices
(`qwen3-voices-*`: serena, vivian, uncle_fu, ryan, aiden, ono_anna, sohee,
eric, dylan) exist alongside cloning — nine ready-made voices, no recording
needed, ten languages; they carry no upstream grades (`grade` is "—") and
all nine are recommended, with the `accent` field flagging the two Chinese
dialect voices (eric, dylan — best in Chinese) and the Japanese/Korean-leaning
ones. Any voice the user names explicitly with `--voice` works regardless.
`doctor` lists installed voice ids where the pack exposes them, otherwise any
wrong `--voice` prints the engine's speaker list.

**Smoke synthesis fails or is silent.** `doctor` prints the remediation with
the failure: retry with `--device cpu` (on macOS the GPU path is the usual
culprit), and if that fixes it, pass `--device cpu` to `publish` too. A SILENT
result means the engine ran but produced inaudible audio — publishing would
ship silent narration, so fix it first (CPU retry, or reinstall the engine).
`--no-smoke` skips the check.

**Aligners come with the Studio engines, not separately.** A forced aligner
_measures_ where each word lands instead of inferring it. Every `qwen3-*`
engine declares one as its companion, so `bisque-voice install <engine>` fetches
it too — a 1.05 GB download shared by all of them, on top of the engine's own
size. Say both numbers when you offer a Studio engine. Kokoro produces exact
timings natively and has no companion. `--align none` makes synthesis fall back
to the engine's own timings; it does **not** avoid the download, and it is a
real downgrade — these engines emit frames rather than word boundaries, so
without the aligner cues **drift**, and the clip can open with untrimmed
non-speech that measured timings would have cut. Only pass it if the user
accepts that. The publish response says which slides were approximate.

**No credentials.** `node present.mjs login` prints a URL and a pairing code;
have the user open the URL and approve, and it saves the key to
`~/.bisque/config.json` under the profile `present`. (`BISQUE_API_KEY` +
`BISQUE_USER_ID` in the environment win over the file.)

**Ambiguous credentials.** With several accounts configured, resolution refuses
to guess rather than publish to the wrong one — ask the user which, then pass
`--profile <name>` to whichever command reported it. Every command takes it:
`doctor`, `plan`, `publish`, `claim-username`, and `login`, where it names the
profile to write so a second account can be added without displacing the first.

**No username.** A presentation is published under one, and `doctor` reports
when the account has none. Handle it now, not at publish time: ask the user
what handle they want (3–30 chars, lowercase letters/digits/hyphens), then

```sh
node present.mjs claim-username <handle>
```

`publish` makes the same check itself and stops **before** synthesizing
anything when the username is missing, so nothing is wasted either way.

## 2. Fetch the format spec — never write it from memory

```sh
curl -fsSL "https://bisque.cloud/api/presentations/spec?part=format" -o spec.md
```

```powershell
irm "https://bisque.cloud/api/presentations/spec?part=format" -OutFile spec.md
```

Public, no auth. Read `spec.md` and follow it exactly; it is the renderer's own
contract, which is why it is fetched rather than repeated here. Always pass
`part=format` explicitly.

## 3. Author

Write `index.html` per the spec, in its own directory. Each slide's narration is
its `<aside class="notes">`; a slide without one is silent. Optionally write:

- `context.md` — what the presentation can answer viewer questions from. It
  ships **at the presentation's visibility**, so nothing more private than the
  presentation goes in it.
- `design.md` — theme tokens in frontmatter.
- `assets/` — every font, image, and other file the slides reference, exactly
  as the spec requires: self-hosted, referenced relative (`assets/hero.png`).
  `publish` walks this directory and uploads it with the presentation, so a
  page that renders locally renders the same once published. Never link a font
  or image from another origin; it will not be there for the viewer.

`node present.mjs plan --html index.html` shows exactly what will be spoken, per
slide. Read it before synthesizing.

## 4. Publish

```sh
node present.mjs publish --html index.html \
  --voice kokoro:af_heart \
  --title "Q3 Review" \
  --visibility unlisted \
  --context context.md
```

Add `--engine`/`--align` when more than one is installed, `--speed` (default
1.0, valid range 0.7–1.2), `--handle`, `--slug`, `--design`,
`--presentation-id`, `--device`. It
prints the `webUrl` — give that to the user. Report any `staleSlides` or
warnings it prints rather than hiding them.

`publish` preflights the account first: a missing username stops the run before
any synthesis (see "No username" above), and when `--voice`/`--engine` are
omitted the account's settings on bisque.cloud fill them in — it says so when
it does. Explicit flags always win over settings.

When the engine to synthesize with is a Studio engine (`qwen3-clone-*`,
`qwen3-voices-*`) that is
not installed on this machine — typically because it was picked in the welcome
flow on bisque.cloud — `publish` says what it is about to download and how
large (from `bisque-voice engines --json`), then runs `bisque-voice install`
itself before synthesizing. Relay that message to the user in plain language;
there is nothing else to do.

For a clone engine (`qwen3-clone-*`), `publish` also makes sure the voice
itself exists: if this machine has no cloned voice for that engine, it fetches
the account's reference recording (made in the browser during the welcome
flow) and runs `bisque-voice clone` locally, once. If the account has no
recording, it stops and says to record one at bisque.cloud/welcome — relay
that; never ask the user to produce a recording in the terminal.

## 5. Edits are cheap — never re-narrate everything

Editing a slide and re-running the same `publish` command is the whole point:

1. It publishes **without audio** first, purely to ask the server what changed.
   Unchanged slides carry their audio forward; the response's `staleSlides`
   names the ones that actually need synthesizing.
2. It synthesizes **only those**, then publishes for real.

So a one-slide fix costs one slide of synthesis, not the whole presentation, and
an HTML-only edit (layout, colors, a cue marker moved) costs none at all. Pass
the same `--title`/`--slug`/`--presentation-id`/`--speed` as before, or it is a
different presentation. Use `--all` only to deliberately re-synthesize
everything — e.g. after changing voice, which does **not** invalidate the
carried-forward audio on its own.

## Rules

- Absolute path for `bisque-voice`. `command -v` reports "missing" on machines
  where it is installed.
- Never silently move a user from free local narration to billed cloud
  narration.
- Don't inline the format spec, and don't hand-edit `presentation.json` — the
  server assembles it so every producer computes cues the same way.
