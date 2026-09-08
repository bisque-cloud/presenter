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

```sh
npx skills add bisque-cloud/presenter
```

[![A presentation on the Codex CLI repository, playing on its watch page](https://storage.googleapis.com/download.bisque.today/presenter/readme/hero.gif)](https://bisque.today/p/siderakis/codex-cli-architecture)

A briefing on the openai/codex repository, made from the repo with `present`.
[Watch it with narration →](https://bisque.today/p/siderakis/codex-cli-architecture)

That installs all three into your agent's skills directory. The Claude Code
plugin, VS Code and Cursor are further down under [Install](#install).

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

Everything you publish lands on your channel, with a thumbnail and a running
time, and each one has a watch URL you can send to anyone:

[![A channel page listing nine published presentations](https://storage.googleapis.com/download.bisque.today/presenter/readme/channel.png)](https://bisque.today/p/siderakis)

## Agents can read them too

Every presentation is built so an agent can read it efficiently: the full
narration and the author's notes come back as text, in one call. Paste a link
and ask:

> What does this presentation say about pricing?

The `watch` skill fetches the full narration transcript and the background
`context.md` the author shipped with it, then answers from that material and
cites the slides it used. It works on anyone's public presentation, and it
needs no account — sign in and your own private presentations open too.

![The watch skill answering a question about sandboxing from the presentation transcript, citing three slides](https://storage.googleapis.com/download.bisque.today/presenter/readme/watch-skill.png)

## Turning it into a video

Ask for an MP4 and the `video` skill takes over from the watch URL:

> Render that as a vertical video I can post.

It downloads the presentation and the narration you already published, draws
every frame with the same player the watch page uses, and writes an MP4 —
landscape, square, or vertical for Shorts, Reels and TikTok.

![The same slide rendered as a landscape, square, and vertical video](https://storage.googleapis.com/download.bisque.today/presenter/readme/video-aspects.png)

Rendering takes about as long as the presentation runs, and it needs macOS.

## In Claude Cowork

This repo also ships **Bisque**, a plugin for Claude Cowork, under
[`cowork/`](./cowork). Ask for a presentation the same way and you get the
same watch URL. There is nothing to install, because Bisque narrates on its
own servers instead of your machine.

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
const { webUrl } = await bisque.presentations.waitUntilReady(
  created.presentationId,
);
```

It lives in [`sdk/`](./sdk); the API it wraps is described at
[bisque.today/openapi.json](https://bisque.today/openapi.json).

## On every release, from GitHub Actions

This repo is also a GitHub Action. Add one step to a workflow and every
release you publish gets a narrated explainer, made by the model you already
pay for, with the watch link appended to the release notes for the people
deciding whether to upgrade:

```yaml
on:
  release:
    types: [published]
permissions:
  contents: write # append the watch link to the release notes
jobs:
  explain:
    runs-on: ubuntu-latest
    steps:
      - uses: bisque-cloud/presenter@v1
        with:
          model: anthropic/claude-sonnet-4-6
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          bisque-api-key: ${{ secrets.BISQUE_API_KEY }}
          bisque-user-id: ${{ secrets.BISQUE_USER_ID }}
```

`model` is any `provider/model` id from [models.dev](https://models.dev), so
`openai/gpt-5.6-terra`, `google/gemini-3.6-flash` and `xai/grok-4.3` are the
same one-line change. [OpenCode](https://opencode.ai) runs the model, so a new
model needs no new release of this action.

The agent reads the release notes and the diff since the previous tag through
the API, authors the presentation with the `present` skill from this same
checkout, and stops. The action then narrates on the runner and publishes.
Authoring is one model run on your key; narration, publishing and hosting are
free. A private repository's explainer is unlisted unless you say otherwise.

The agent never holds a credential. Its model calls go through a local proxy
that holds your key and rewrites the auth header, so the key is in no
environment the agent or its tools can read, and the publishing step refuses
to run a skill whose hash changed while the agent ran.

The same step explains a pull request when a collaborator comments `/explain`
on it, after a step checks they have write access. A pull request is text you
did not write, so on a repository that takes them from strangers, set
`network: deny`: the agent then has no shell and no internet, which costs the
fonts and images it would have downloaded.

Both workflows are in [`examples/`](./examples), and every input is described
in [`action.yml`](./action.yml).

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

### In VS Code and Cursor

VS Code and Cursor connect to Bisque over MCP rather than installing the
skills. Ask either editor for a presentation and you get back the same watch
URL. One click adds the server:

[![Add to VS Code](https://img.shields.io/badge/Add_to_VS_Code-007ACC?style=flat)](https://vscode.dev/redirect/mcp/install?name=bisque&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fbisque.cloud%2Fpresentations%2Fmcp%22%7D) [![Add to Cursor](https://img.shields.io/badge/Add_to_Cursor-000000?style=flat)](https://cursor.com/install-mcp?name=bisque&config=eyJ1cmwiOiJodHRwczovL2Jpc3F1ZS5jbG91ZC9wcmVzZW50YXRpb25zL21jcCJ9)

Each badge adds a server called `bisque` pointing at
`https://bisque.cloud/presentations/mcp`, and the editor walks you through
sign-in the first time you use it. Bisque narrates on its side here, so there
is no speech model to download. Any other MCP client takes the same URL over
streamable HTTP.

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

## Docs

- [present](https://bisque.today/docs/present) — what to ask for, how to change a presentation, what happens the first time
- [video](https://bisque.today/docs/video) — rendering an MP4 from a watch URL
- [API](https://bisque.today/docs/api) and [MCP](https://bisque.today/docs/mcp) — publishing from your own code or editor

Something not working? [Open an issue](https://github.com/bisque-cloud/presenter/issues)
with what you asked for and what happened.

## License

[MIT](./LICENSE)
