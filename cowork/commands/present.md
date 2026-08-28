---
description: Make a presentation people can watch, and get a link to send
argument-hint: [what it should be about]
---

Make a narrated presentation about: $ARGUMENTS

Follow the `present` skill in this plugin from the top: fetch the format spec
with `get_presentation_spec` first, read the source material, write `index.html`
and `context.md` into the working directory, publish with `create_presentation`,
wait for it to finish, and give me the watch URL.

If the request above is empty, ask me what it should be about and who is
watching before you start.
