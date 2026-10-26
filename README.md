# presenter

Bisque's open-source **Agent Skills**. Quickly turn a design doc, a pull
request, a website, or anything your agent has in its context into a watchable
presentation you can share on [bisque.today](https://bisque.today). **Free and
unlimited** — nothing is billed per word.

The collection ships three skills. **`present`** is the main one: you describe a
presentation, your agent authors it, your machine narrates it, and Bisque hosts
it. It works in **Claude Code**, **Gemini CLI**, and **Codex CLI**, on macOS,
Linux, and Windows. **`watch`** reads a published presentation — anyone's — so
your agent can summarize it or answer questions about it. **`video`** turns any
published presentation into an MP4 you can upload; it runs on macOS.

It is also a GitHub Action: mention `@bisque-cloud` on a pull request and a
watchable explainer of the change comes back as a reply. See
[On every pull request](#on-every-pull-request-from-github-actions).

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

The people you send it to can watch in any browser, or in the
[Bisque app for iPhone and iPad](https://apps.apple.com/app/id6787150959),
free on the App Store, where they can subscribe to your channel and keep
listening with the app in the background.

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

## On every pull request, from GitHub Actions

This repo is also a GitHub Action that explains your pull requests. Mention
`@bisque-cloud` in a comment on a pull request, an 👀 appears, and a few
minutes later a reply links a watchable explainer of the change, made by the
model you already pay for. Or let it run on every pull request: Claude Code
explains the ones worth explaining to someone who did not write them, and
leaves the rest, such as a dependency bump, without a comment. A used-up
plan or an expired token never fails a pull request's checks.

<!-- pr-explainer-walkthrough: to remove, delete from here to the end marker -->

[![The first slide of a walkthrough of the pull request explainer](https://bisque.today/poster/AlY6OT2Cd1YpfqlZ5jsfdWcae933/claude-code-pr-explainer-video-every-pull-request-94480e/og-slide.png)](https://bisque.today/p/siderakis/claude-code-pr-explainer-video-every-pull-request)

A three-minute walkthrough: an explainer of a real pull request in
anthropics/claude-code-action, an `@bisque-cloud` mention on a test
repository, how the link comes back, your repository's own channel, and setup
on the Claude plan you already have.
[Watch it →](https://bisque.today/p/siderakis/claude-code-pr-explainer-video-every-pull-request)

<sub>Made on 2026-10-14, after the `@bisque-cloud` mention shipped; its private
access and every-pull-request lines revised on 2026-10-23. Refreshed by hand;
owner @siderakis.</sub>

<!-- end pr-explainer-walkthrough -->

The step that explains every pull request worth it:

```yaml
on:
  pull_request:
    types: [opened, ready_for_review, reopened]
permissions:
  contents: read
  pull-requests: write # post the watch link
  id-token: write # publish as this repository, no Bisque account
jobs:
  explain:
    runs-on: ubuntu-latest
    steps:
      - uses: bisque-cloud/presenter@v1
        with:
          source: pull-request
          when: judged
          claude-code-oauth-token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

That is the only secret. `claude setup-token` makes it, and it runs on your
Claude plan. The explainer publishes to your repository's own channel,
`bisque.today/p/{owner}/{repo}`, using the GitHub-signed identity of the
workflow run, so there is no Bisque account to create. Whoever owns the
repository manages that channel by signing in with GitHub. Setup steps an
agent can follow: [bisque.today/docs/present/works-with/github-action](https://bisque.today/docs/present/works-with/github-action).

The same action explains a release too: run it on `release: published`, with
`contents: write`, and the watch link is appended to the release notes for the
people deciding whether to upgrade.

Set one key or token. It names the provider, and the provider picks the
model, so the shortest useful workflow chooses nothing:

| Key you set               | What authors the explainer                       |
| ------------------------- | ------------------------------------------------ |
| `claude-code-oauth-token` | Claude Code on your Claude plan, its own default |
| `anthropic-api-key`       | `claude-opus-5`, medium effort                   |
| `openai-api-key`          | `gpt-5.6-sol`, medium effort                     |
| `google-api-key`          | `gemini-3.1-pro-preview`                         |
| `xai-api-key`             | `grok-4.6`                                       |

Each is the strongest general model that provider offers rather than the
cheapest, because the explainer is read by everyone who did not write the change. Add `model: anthropic/claude-sonnet-4-6` to spend less, or any other
id from [models.dev](https://models.dev) to use something else;
[OpenCode](https://opencode.ai) runs it, so a new model needs no new release
of this action. A Claude plan token runs in Claude Code instead, the only
harness that token may be used in.

The agent reads the pull request, or a release's notes and the diff since the
previous tag, through the API, authors the presentation with the `present` skill from this same
checkout, and stops. The action then narrates on the runner and publishes.
Authoring is one model run on your key; narration, publishing and hosting are
free. A private repository's explainer is private: people who can open the
repository on GitHub watch it after signing in with GitHub.

The agent never holds a credential. Its model calls go through a local proxy
that holds your key or token and rewrites the auth header, so it is in no
environment the agent or its tools can read; the means to mint the run's
GitHub identity is removed from the agent's step too; and the publishing step
refuses to run a skill whose hash changed while the agent ran.

A mention starts a run only for a collaborator with write access, and it
always explains, even a pull request the automatic run skipped. A pull
request is text you did not write, so on a repository that takes them from
strangers, set `network: deny`: the agent then has no shell and no internet,
which costs the fonts and images it would have downloaded.

### Already running claude-code-action?

Add the presenter plugin to the
[`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
step you have, and Claude writes, checks and narrates the explainer, so it can
still fix whatever the checks find. It can't publish from there: that action
removes the means to mint the run's GitHub identity from Claude's session, on
purpose. So a second job publishes the folder Claude wrote, audio included,
with `presentation:`. No model runs in that job, nothing is narrated again,
and it is the only one that holds `id-token: write`:

```yaml
jobs:
  write:
    runs-on: ubuntu-latest
    permissions: { contents: read, pull-requests: read }
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          github_token: ${{ github.token }}
          plugin_marketplaces: https://github.com/bisque-cloud/presenter.git
          plugins: presenter@bisque-cloud
          claude_args: --allowedTools Bash,Read,Write,Edit,Glob,Grep,WebFetch,Skill
          prompt: |
            Use the present skill to explain this pull request. Write it to
            ${{ runner.temp }}/explainer and run every step up to, not
            including, publish, ending with `narrate --voice kokoro:af_heart`.
      - uses: actions/upload-artifact@v4
        with: { name: explainer, path: "${{ runner.temp }}/explainer" }
  publish:
    needs: write
    runs-on: ubuntu-latest
    permissions: { contents: read, pull-requests: write, id-token: write }
    steps:
      - uses: actions/download-artifact@v4
        with: { name: explainer, path: explainer }
      - uses: bisque-cloud/presenter@v1
        with:
          source: pull-request
          presentation: explainer
```

The full workflow, with the prompt it was tested with, is
[`examples/claude-code-action-pull-request-explainer.yml`](./examples/claude-code-action-pull-request-explainer.yml).

All four workflows are in [`examples/`](./examples), and every input is described
in [`action.yml`](./action.yml).

## Install

Both plugins live in one marketplace. In Claude Code, from a terminal:

```sh
claude plugin marketplace add bisque-cloud/presenter
claude plugin install presenter@bisque-cloud
```

Adding the marketplace installs nothing on its own; the second command installs
`present`, `watch`, and `video` as the `presenter` plugin, so the main skill is
`/presenter:present`. Inside a Claude Code session, the same two steps are
`/plugin marketplace add bisque-cloud/presenter` and
`/plugin install presenter@bisque-cloud`.

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
- [video](https://bisque.today/docs/present/video) — rendering an MP4 from a watch URL
- [API](https://bisque.today/docs/api) and [MCP](https://bisque.today/docs/mcp) — publishing from your own code or editor

Something not working? [Open an issue](https://github.com/bisque-cloud/presenter/issues)
with what you asked for and what happened.

## License

[MIT](./LICENSE)
