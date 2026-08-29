# @bisque/sdk

The official TypeScript SDK for the [Bisque API](https://bisque.today/docs/api).
Publish narrated presentations from a program and read any shared one back
as text. Zero dependencies; runs anywhere `fetch` does (Node 18+, Bun, Deno,
browsers).

```sh
npm install @bisque/sdk
```

## Read a presentation, no sign-in

```ts
import { Bisque } from "@bisque/sdk";

const bisque = new Bisque();
const ctx = await bisque.presentations.context({
  url: "https://bisque.today/p/siderakis/claude-system-card",
});
console.log(ctx.title);
for (const slide of ctx.transcript) console.log(slide.startSec, slide.text);
```

Public and unlisted presentations need no credential. `ctx.contextMd` carries
the presentation's `context.md` when it has one.

## Publish

Get a credential first: an API key from
[bisque.cloud/setup/keys](https://bisque.cloud/setup/keys), or an OAuth 2.1
token for a hosted agent — [auth.md](https://bisque.today/auth.md) walks
through both.

```ts
const bisque = new Bisque({ apiKey: process.env.BISQUE_API_KEY });

// 1. Read the authoring format. Never write html-presentation/v1 from memory.
const spec = await bisque.presentations.spec();

// 2. Write index.html to that spec (your agent does this), then publish.
const created = await bisque.presentations.create({
  indexHtml,
  slug: "release-notes-2026-08",
  visibility: "unlisted",
});

// 3. Narration finishes in the background; wait for it.
const status = await bisque.presentations.waitUntilReady(created.presentationId);
console.log(status.webUrl); // https://bisque.today/p/<handle>/release-notes-2026-08
```

`create` sends an `Idempotency-Key` on every call (a UUID unless you pass
`{ idempotencyKey }`), so a retried request replays the first result instead
of publishing twice.

## Everything else

| Call | What it does |
| --- | --- |
| `presentations.spec(part?)` | The format, or one module of it (`charts`, `macos`, …), as markdown. |
| `presentations.context(ref)` | Metadata, per-slide transcript, and `context.md` for any shared presentation. |
| `presentations.list(params?)` / `listAll()` | Your presentations, one page or every page. |
| `presentations.create(req)` | Publish from HTML; narration is synthesized server-side. |
| `presentations.status(id)` / `waitUntilReady(id)` | Narration and publish progress. |
| `presentations.publishNarrated(req)` | Publish with audio you synthesized yourself (the `present` skill's path). |
| `oembed(url)` | The oEmbed payload for a watch URL. |
| `ask(query)` | A natural-language question over the docs and public presentations (NLWeb). |
| `openapi()` | The OpenAPI 3.1 document this SDK wraps. |

Every method takes an optional `{ signal }` for cancellation.

## Errors and rate limits

Failures throw `BisqueError` with `status`, the API's stable `code`
(`NOT_FOUND`, `CONTEXT_RATE_LIMITED`, …), and `requestId` to quote in a bug
report. A 429 or 5xx is retried twice, honouring `Retry-After`
(`maxRetries` changes that). The rate-limit headers from the latest response
are on `bisque.lastRateLimit`.

## Reference

- REST API: https://bisque.today/docs/api · OpenAPI: https://bisque.today/openapi.json
- Credentials: https://bisque.today/auth.md
- The same tools over MCP: https://bisque.today/mcp
- Source: https://github.com/bisque-cloud/presenter/tree/main/sdk

MIT.
