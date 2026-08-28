# Bisque

Turn a document, a thread, or a set of numbers into a presentation people can
watch — slides with a spoken script, at a link you can send.

Ask for one:

> Make a presentation out of this quarter's numbers for the leadership team.

Claude reads the material, writes the slides and the script, and publishes.
You get a watch URL that plays in any browser, on your own channel at
[bisque.today](https://bisque.today). Nothing to install: the recording and the
hosting happen on Bisque's side, through the connector this plugin adds.

Change a slide and ask again — it republishes at the same URL, and the slides
you did not touch keep the recording they already have.

## What's in it

- **`present`** — the skill. Fetches the authoring format, writes `index.html`
  and `context.md` into your working directory, publishes, and hands back the
  link.
- **`/bisque:present`** — the same thing, asked for directly.
- **The Bisque connector** — `create_presentation` and the tools around it:
  what you have published, how many people watched it, and reading back any
  presentation someone sends you.

## First run

Installing the plugin prompts you to sign in to Bisque. Then pick a handle at
[bisque.cloud/account](https://bisque.cloud/account) — it is the name in every
watch URL you publish (`bisque.today/p/<handle>/<slug>`), and your first one
cannot be renamed, so pick one you are happy to keep.

## Building presentations from a terminal instead

The [`presenter`](https://github.com/bisque-cloud/presenter) plugin in this same
marketplace covers the other case: an agent on your own machine, where the
narration is synthesized locally — free and unlimited — and a published
presentation can be rendered to an MP4.

## License

[MIT](https://github.com/bisque-cloud/presenter/blob/main/LICENSE)
