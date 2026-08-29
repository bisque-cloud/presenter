# presenter

Bisque's open-source **Agent Skills** for building narrated presentations you
publish to a shareable watch URL on [bisque.today](https://bisque.today).
Narration is synthesized on your own machine — **free and unlimited**; nothing
is billed per word.

The collection ships three skills. **`present`** is the main one: you describe a
presentation, your agent authors it, your machine narrates it, and Bisque hosts
it. It works in **Claude Code**, **Gemini CLI**, and **Codex CLI**, on macOS,
Linux, and Windows. **`watch`** reads a published presentation — anyone's — so
your agent can summarize it or answer questions about it. **`video`** turns any
published presentation into an MP4 you can upload; it runs on macOS.

## How it works

1. Ask your agent for a presentation — a briefing on your repo, a walkthrough
   of a pull request, a report from whatever it just did.
2. The agent writes the slides and the narration script, and your machine
   turns the script into speech.
3. You get a watch URL — slides with synchronized narration, playable in any
   browser, on your own channel.

## Example

Ask, in any of the three CLIs:

> Give me a two-minute briefing on what changed in this pull request.

The agent writes an `index.html` — one `<section>` per slide, the narration
for each slide in an `<aside class="notes">` — synthesizes the speech on your
machine, and publishes. It prints a watch URL on your channel; open it and the
slides play with synchronized narration in any browser.

Change a slide and ask it to publish again, and only that slide is
re-synthesized — an HTML-only edit costs no synthesis at all. The presentation
is a living document, not a one-shot render.

## Reading one back

A presentation is a narrated document, so your agent can read one instead of
watching it. Paste a link and ask:

> What does this presentation say about pricing?

The `watch` skill fetches the full narration transcript and the background
`context.md` the author shipped with it, then answers from that material and
cites the slides it used. It works on anyone's public presentation, and it
needs no account — sign in and your own private presentations open too.

## Turning it into a video

Ask for an MP4 and the `video` skill takes over from the watch URL:

> Render that as a vertical video I can post.

It downloads the presentation and the narration you already published, draws
every frame with the same player the watch page uses, and writes an MP4 —
landscape, square, or vertical for Shorts, Reels and TikTok. Nothing is
re-narrated, so the video sounds exactly like the watch URL.

Rendering takes about as long as the presentation runs, and it needs macOS.

## Somewhere without a terminal

The three skills above narrate on the machine they run on, which needs a
terminal and a few gigabytes of disk. Agents that run in a hosted sandbox have
neither, so this repo ships a second plugin — **Bisque**, under
[`cowork/`](./cowork) — that publishes the same presentations through Bisque's
connector, with the recording done on Bisque's side. Same format, same watch
URL, nothing to install.

## From your own code

The skills call a public REST API, and so can you. `@bisquecloud/sdk` is the
TypeScript client for it — publish from a script, a CI job, or a server, and
read any shared presentation back as text:

```sh
npm install @bisquecloud/sdk
```

```ts
import { Bisque } from "@bisquecloud/sdk";

const bisque = new Bisque({ apiKey: process.env.BISQUE_API_KEY });
const created = await bisque.presentations.create({ indexHtml });
const { webUrl } = await bisque.presentations.waitUntilReady(created.presentationId);
```

It lives in [`sdk/`](./sdk); the API it wraps is described at
[bisque.today/openapi.json](https://bisque.today/openapi.json).

## Install

Both plugins live in one marketplace. In Claude Code:

```
/plugin marketplace add bisque-cloud/presenter
/plugin install presenter@bisque-cloud
```

In Claude Cowork, open **Customize → Plugins → Add marketplace**, enter
`bisque-cloud/presenter`, and install **Bisque**. It connects to your account
the first time you use it.

### Just the skills

Add them with the [`skills`](https://www.npmjs.com/package/skills) CLI:

```sh
npx skills add bisque-cloud/presenter
```

It copies them into your agent's skills directory — `~/.claude/skills/` for
Claude Code, `~/.agents/skills/` for Codex and Gemini. Then ask for a
presentation, or invoke it directly with `/present`.

### Manual install

Each skill is a plain directory; installing one is putting it where your agent
looks. Clone the collection and copy the skills you want:

```sh
git clone https://github.com/bisque-cloud/presenter
cp -r presenter/skills/present ~/.claude/skills/present   # Claude Code
cp -r presenter/skills/present ~/.agents/skills/present   # Codex + Gemini
cp -r presenter/skills/watch   ~/.claude/skills/watch     # optional
cp -r presenter/skills/video   ~/.claude/skills/video     # optional, macOS
```

```powershell
git clone https://github.com/bisque-cloud/presenter
Copy-Item -Recurse presenter\skills\present $env:USERPROFILE\.claude\skills\present
```

Invoke with `/present` (Claude Code), `$present` (Codex), or let it activate on
description match. Gemini CLI also reads `~/.agents/skills/`, so the Codex copy
covers it too. Codex CLI doesn't include Node — install Node 18+ (or bun)
alongside it.

## Requirements

- **Node 18+ or bun.**
- **[`bisque-voice`](https://bisque.today)** — the local narration engine
  (~30 MB). The agent offers to install it on first use.
- **A speech model**, downloaded once. There is deliberately no default: the
  agent shows you the catalogue and you pick. These are large — pick with your
  disk and memory in mind.

  | Voice                                               | Download                  | Peak memory, model only |
  | --------------------------------------------------- | ------------------------- | ----------------------- |
  | Small and fast — nine languages, exact word timings | 337 MB                    | not measured            |
  | Nine ready-made voices, ten languages               | 1.26 GB + 1.05 GB aligner | not measured            |
  | Clone your own voice, ten languages                 | 1.28 GB + 1.05 GB aligner | ~4.9 GB                 |
  | Nine ready-made voices, larger model                | 2.33 GB + 1.05 GB aligner | ~5.7 GB                 |
  | Clone your own voice, larger model                  | 2.37 GB + 1.05 GB aligner | ~5.7 GB                 |

  The four larger voices narrate with measured word timings, so each installs a
  forced aligner alongside itself — that is the second number, and it is one
  shared pack that downloads once however many of them you use. It loads on top
  of the model while it measures, so peak memory in practice is above the
  figure shown. The agent names each download and its size before starting it.

  The small fast voice needs an extra pronunciation pack per non-English
  language — under a megabyte for most, 49 MB for Japanese — downloaded the
  first time you narrate in that language.

- **A Bisque account**, for publishing. During its first machine check the
  agent walks you through browser sign-in, then asks you to claim a **public
  handle** — presentations are published under it. Both happen before it writes
  any slides. Your first handle can never be renamed or released, so pick one
  you are happy to keep; additional handles can be added at bisque.cloud.
- **A Mac, for `video`.** It downloads `bisque-video` (~15 MB) on first use, and
  an ffmpeg (~12 MB) if the machine has none — a Homebrew ffmpeg already there
  is used as-is. `present` needs none of this.

## Limitations

- **First use downloads a speech model.** See the size table above. The first
  synthesis is not instant.
- **The larger voices need their aligner to time cues precisely.** They ship
  approximate word timings of their own, so they install a forced aligner with
  the model to measure instead of infer. `--align none` tells the synthesizer
  to fall back to the engine's own timings, but the aligner still downloads
  with the engine — it is part of what that voice is. Expect real drift if you
  skip it: these models emit frames rather than word boundaries, and the clip
  can open with untrimmed silence the aligner would have cut. The small fast
  voice produces exact timings natively and needs no aligner at all. Slides
  themselves never desync — each has its own audio — but narration inside a
  slide can start late without alignment.
- **Narration is local; hosting is not.** Synthesis runs on your machine for
  free, but publishing goes to Bisque's servers — there is no self-hosted
  watch page.
- **Codex CLI's default sandbox restricts network.** Installing, signing in,
  and publishing will surface approval prompts under default sandbox
  settings.
- **Video rendering is macOS-only, and it is not instant.** A render takes about
  as long as the presentation runs — every frame is drawn and snapshotted. On
  Linux or Windows there is no MP4, but the watch URL plays in any browser.
- **A video needs the presentation to be public or unlisted.** `video` fetches
  it by URL like any viewer does, so a private presentation cannot be rendered
  from another machine.
- **Intel Macs cannot run the small fast voice, or any aligner.** Both are
  built on a runtime that dropped Intel macOS. The four larger voices — both
  ready-made-speaker models and both cloning models — all work, so an Intel
  Mac still gets nine voices without recording anything; its cue timings just
  stay approximate.

## Troubleshooting

Run `node present.mjs doctor`. It checks the whole chain — binary, installed
voices, credentials, account, handle — and synthesizes a test word to prove
audio actually works, which catches the common failures before a publish does:
no voice installed, no handle claimed, or a voice that runs but produces
silence (on macOS, retry with `--device cpu`).

For `video`, run `~/.bisque/bin/bisque-video doctor` — it reports the ffmpeg it will encode
with, where the player bundle is, and whether both are usable.

Beyond that, a failed publish is usually no Node on the machine (Codex CLI),
no network approval (Codex sandbox), or not signed in. For anything else,
[open an issue](https://github.com/bisque-cloud/presenter/issues) with what you
ran and what happened — the sentence that misbehaved, if narration sounded
wrong.

## License

[MIT](./LICENSE)
