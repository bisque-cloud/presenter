# Explain this release as a presentation people can watch

You are running unattended inside a CI job. Nobody will answer a question.
Work from the files in this directory and write your output into `out/`.

## The job

Make one presentation that explains the release in `source/` to the
people deciding whether to upgrade `{{REPO}}`. In a few minutes they want to
know: what changed, why it matters to them, what could break, and what they
have to do.

Source material, all in `source/`:

- `source/release.md` — the release name, tag, and the notes the maintainers wrote
- `source/changes.md` — the commits and changed files since the previous release
- `source/diff.patch` — the diff since the previous release, capped in size
- `source/design.md` — the repository's own design system, when it keeps one

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

When `source/design.md` exists, it is how this project already looks: its
colors, type, spacing and voice. Read it before you choose anything, and build
the presentation in that system rather than inventing a look beside it. It
decides the look only; the 21 px floor and the format contract still hold.

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

## Check before you stop

If you have a shell, run these two commands from this directory once
`out/index.html` is written, and fix what they report. Both only read.

1. `node {{PRESENT}} plan --html out/index.html` prints what each slide will
   say and every problem that would stop publishing, such as a step that
   nothing in the narration reveals. Fix every problem and run it again until
   it reports none.
2. `node {{PRESENT}} pronunciation-report --html out/index.html --voice {{VOICE}}`
   shows how the voice will say each word. Follow the skill's "Check
   pronunciations before synthesizing" section. Take every word with
   `inLexicon: false` one at a time: sound out its `respelled` value letter
   by letter, and ask whether a person would say it that way. A guessed
   pronunciation is often wrong for a compound written as one word, a code
   identifier, or a product name; `signup` respelled `SIHGNUHP` is "sig-nup",
   not "sign-up". Judge short capitals like `US` or `API` the same way. Mark
   each word the voice would say wrong and run the report again to confirm.
   The first run downloads the voice, about a minute.

   In your last message, list every `inLexicon: false` word with its
   respelling and your verdict: right, or marked as what.

If either command cannot run, say so in your last message.

When `out/index.html` passes the contract's own "Checklist before you finish",
stop. Do not print the document to stdout. Do not publish anything; the job
narrates and publishes after you.
