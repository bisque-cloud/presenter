# AGENTS.md

Instructions for AI coding agents working in this repository.

## What this repo is

Three skills a coding agent installs to use Bisque: `present` (author and
publish a narrated presentation), `watch` (read a published one as text),
and `video` (render one to MP4). Each lives in `skills/<name>/` as a
`SKILL.md` plus scripts. Install with
`npx skills add bisque-cloud/presenter`.

## Using the skills from an agent

- Read `skills/<name>/SKILL.md` in full before running a skill; it is the
  runbook, in the order the steps must happen.
- Fetch the authoring format from `https://bisque.today/api/presentations/spec`
  every time. Never write the `html-presentation/v1` format from memory.
- `sdk/` is `@bisque/sdk`, the TypeScript client for the REST API. Its
  tests run with `bun test sdk/`; `bun run build` in `sdk/` emits `dist/`.
- The REST API is described at `https://bisque.today/openapi.json`; the
  same tools are available over MCP at `https://bisque.today/mcp`. How to
  get a credential: `https://bisque.today/auth.md`.
- Reading a public or unlisted presentation needs no credential:
  `GET https://bisque.today/api/presentations/context?url=<watch URL>`.

## Editing this repo

- Keep `SKILL.md` frontmatter valid per agentskills.io: `name` matches the
  directory, `description` says what the skill does and when to use it.
- Scripts are JavaScript (`.mjs`) or TypeScript; no Python.
- Say "presentation", never "deck" or "slideshow", in prose. Trigger lists
  in a `description` may carry the words people type.

## Where things are

| Path              | What it is                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `skills/present/` | Author, narrate locally, publish                                                                               |
| `skills/watch/`   | Read a presentation's transcript and context                                                                   |
| `skills/video/`   | Export a published presentation to MP4                                                                         |
| `.claude-plugin/` | Plugin manifest for plugin-aware agents                                                                        |
| `cowork/`         | The same skill for agents in a hosted sandbox that cannot narrate locally; publishes through the MCP connector |
