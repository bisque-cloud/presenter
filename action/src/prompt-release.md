# Explain this release as a narrated presentation

You are running unattended inside a CI job. Nobody will answer a question.
Work from the files in this directory and write your output into `out/`.

## The job

Make one narrated presentation that explains the release in `source/` to the
people deciding whether to upgrade `{{REPO}}`. In a few minutes they want to
know: what changed, why it matters to them, what could break, and what they
have to do.

Source material, all in `source/`:

- `source/release.md` — the release name, tag, and the notes the maintainers wrote
- `source/changes.md` — the commits and changed files since the previous release
- `source/diff.patch` — the diff since the previous release, capped in size

Tell the story the maintainers told. Quote the release notes and the diff
rather than inventing around them. Lead with what a user notices: a new
capability, a fix they hit, a breaking change and the one-line migration.
Name files, flags, and functions when a viewer would need to go there. Every
number carries its unit. Internal refactors get one slide at most, and only
when they change behavior.

The audience is the project's users, so the presentation is on-brand for the
project, not for the tool that made it. Do not mention this job, this prompt,
or how the presentation was produced.

## The skill

The `present` skill is installed for you. Follow its SKILL.md for authoring.
`spec.md` in this directory is the format contract, already fetched. Read
all of it before writing. Its rules are mandatory: both layout blocks on every section, exactly one
`<aside class="notes">` per section, cue markers on every step group,
`data-background` on every slide, no network references at render time.

Target length: 6 to 10 slides, 2 to 3 minutes narrated.

## Design

The presentation is watched on a phone as often as a laptop, so the two
failures that ruin it are small type and the same layout every slide.

**Type.** The stage is 1920 by 1080 pixels and the player scales it down, so
author in pixels at that size and go bigger than feels right. A display line
is 72 to 110 px. A slide heading is 60 to 90 px. Body copy is 32 to 44 px.
The smallest text on any slide, including labels and chrome, is 21 px.
Anything under 20 px is unreadable on a phone and is a defect.

**Composition.** Give each section a different arrangement. A title slide, a
full-bleed statement, a two-column split, a single large number, a code
panel, a list of rows — pick the shape that fits the point rather than
repeating one template. If two consecutive slides have the same skeleton,
rebuild one of them.

**A design system, taken from the subject.** Before writing slides, commit to
a palette of four to six colours and a real display typeface, and take both
from the project this belongs to rather than a generic template. Hold them
for every slide. `spec.md` carries the full guidance; read its design
section before you write any HTML, not after.

## What to write

- `out/index.html` — the presentation
- `out/context.md` — viewer-facing context: a short summary, the release
  URL, and the questions a viewer is likely to ask
- `out/assets/` — every font and image you use, downloaded, referenced
  relatively from `index.html`

You have a shell and internet access: download every font and image you use
into `out/assets/` and reference them relatively, as the contract requires.
Keep scratch files inside this directory rather than in `/tmp`. Do not run any code
from the release. Do not write anywhere except `out/`.

When `out/index.html` passes the contract's own "Checklist before you finish",
stop. Do not print the document to stdout. Do not publish anything; the job
narrates and publishes after you.
