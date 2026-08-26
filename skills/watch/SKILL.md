---
name: watch
description: Reads a published presentation — its full narration transcript and the context its author shipped — so you can summarize it, answer questions about it, or compare several. Use when asked to watch, read, summarize, explain, review, or discuss a presentation, to chat with one or ask what it says, or when given a bisque.today or bisque.cloud link, a deck, or a slideshow.
---

# Watch

A published presentation is a narrated document, so you can read one the way
you read a file. One request returns everything it says: the title, every
slide's narration with its timestamp, and the `context.md` its author shipped
alongside it — the background material the slides summarize.

You answer from that. There is no separate "ask the presentation" service to
call; the transcript is in your context, so the answering is yours to do.

Any public or unlisted presentation works, whoever made it. Your own private
ones work too when your credentials resolve.

## 1. Fetch it

```sh
curl -s -H "Authorization: Bearer $BISQUE_API_KEY" \
  "https://bisque.today/api/presentations/context?url=https://bisque.today/p/siderakis/this-week-in-bun"
```

**Send credentials whenever you have them.** Resolve a key exactly the way
`present` does, taking the first that exists:

1. `$BISQUE_API_KEY` together with `$BISQUE_USER_ID` in the environment.
2. `~/.bisque/config.json`, whose profiles look like
   `profiles.<name>.apiKey` / `.userId`. Pick `$BISQUE_PROFILE`, or the
   `profile` in a `.bisque.json` in the working directory; failing that the
   profile named `present`, then `default`, then the only usable one. When
   several are configured and none is pinned, ask which account rather than
   guessing — the wrong one silently reads as a different person.

**No key anywhere is fine.** Drop the header and fetch it plain — public and
unlisted presentations are served to anonymous callers:

```sh
curl -s "https://bisque.today/api/presentations/context?url=<watch-url>"
```

If a key exists but the response is 401, it is expired or wrong. Say so and
retry without the header rather than stopping — the presentation may well be
public.

The target can be given either way:

| Form            | Example                                     |
| --------------- | ------------------------------------------- |
| `url=`          | `url=https://bisque.today/p/nick/q3-review` |
| `handle=&slug=` | `handle=nick&slug=q3-review`                |

## 2. What comes back

```json
{
  "title": "…",
  "description": "…",
  "handle": "nick",
  "slug": "q3-review",
  "webUrl": "https://bisque.today/p/nick/q3-review",
  "transcript": [{ "slideIndex": 0, "startSec": 0, "title": "…", "text": "…" }],
  "transcriptTruncatedSlides": 0,
  "contextMd": "…",
  "contextTruncated": false
}
```

`transcript` is the narration, in slide order, with `startSec` marking where
each slide begins. `contextMd` is the author's background file, or `null` when
the presentation ships none. Treat both as equally quotable — the author
published them together.

## 3. Answer from it

Ground every claim in the material you just fetched, and cite the slide as
`[slide N]` using the 1-based number (`slideIndex + 1`). Deep-link a citation
when it helps: `<webUrl>?t=<startSec>`.

When the material doesn't answer the question, say that plainly. Don't fill the
gap from general knowledge — the value of reading the real transcript is that
the answer came from it.

Offer the `webUrl` when you are done. Someone who wants to watch it should not
have to ask you for the link.

## 4. More than one

Fetching several presentations to compare them is one request each. It is the
right move when the user asks what changed between two, or what a channel has
been saying — pull each and reason across them.

## Rules

- **Never invent slide content.** If it isn't in `transcript` or `contextMd`,
  it isn't in the presentation.
- **Report a partial transcript.** `transcriptTruncatedSlides` above zero means
  that many content slides were dropped at publish time. Say so before
  summarizing, and never describe such a summary as complete.
- **A 404 means not found or not shared** — the two are deliberately
  indistinguishable. Ask the user to check the link, or to make the
  presentation unlisted if it's theirs. Don't guess at other slugs.
- **Don't re-narrate or republish to read something.** This reads what is
  already published; `/present` is what changes a presentation.
