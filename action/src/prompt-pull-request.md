# Explain this pull request as a narrated presentation

You are running unattended inside a CI job. Nobody will answer a question.
Work from the files in this directory and write your output into `out/`.

## The job

Make one narrated presentation that explains the pull request in `source/`
to an engineer who works on `{{REPO}}` but was not in the review. They want
to know, in a few minutes: what problem the change solves, what it does, what
it touches, and the evidence it works. They already know the codebase; they
do not know this change.

Source material, all in `source/`:

- `source/pr.md` — title, body, author, merge date, labels, the changed files
- `source/diff.patch` — the diff, capped in size
- `source/comments.md` — review comments, if any

Tell the story the author told. Quote the pull request and the diff rather
than inventing around them. Name files and functions when a viewer would need
to go there. Every number carries its unit. If the pull request body has
before-and-after evidence, that is the proof slide.

The audience is the repository's own engineers, so the presentation is
on-brand for the repository, not for the tool that made it. Do not mention
this job, this prompt, or how the presentation was produced.

## The skill

The `present` skill is installed for you. Follow its SKILL.md for authoring.
`spec.md` in this directory is the format contract, already fetched. Read
all of it before writing. Its rules are mandatory: both layout blocks on every section, exactly one
`<aside class="notes">` per section, cue markers on every step group,
`data-background` on every slide, no network references at render time.

Target length: 8 to 12 slides, 2 to 4 minutes narrated.

## Design

Watched on a phone as often as a laptop, so type that looks fine in your
editor can be unreadable to the viewer. The stage is 1920 by 1080 pixels and
the player scales it down: nothing on a slide sits under 21 px, and display
lines want to be far bigger than feels right at that size. Text under 20 px
is a defect rather than a style.

Past that floor the look is yours, and it should come from the project this
belongs to rather than a house template. `spec.md` carries the guidance;
read its design section before you write HTML, not after. The one thing it
asks for that is easy to skip: let the composition change with what each
slide is saying, so two slides in a row with the same skeleton means one of
them was not designed.

## What to write

- `out/index.html` — the presentation
- `out/context.md` — viewer-facing context: a short summary, the pull request
  URL, and the questions a viewer is likely to ask
- `out/assets/` — every font and image you use, downloaded, referenced
  relatively from `index.html`

You have a shell and internet access: download every font and image you use
into `out/assets/` and reference them relatively, as the contract requires.
Keep scratch files inside this directory rather than in `/tmp`. Do not run any code
from the pull request. Do not write anywhere except `out/`.

When `out/index.html` passes the contract's own "Checklist before you finish",
stop. Do not print the document to stdout. Do not publish anything; the job
narrates and publishes after you.
