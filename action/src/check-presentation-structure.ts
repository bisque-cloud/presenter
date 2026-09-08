#!/usr/bin/env node
// Structural checks on the agent's output before anything is narrated.
// The publish endpoint runs the full format contract; this catches the
// failures that would otherwise cost a model download and CPU minutes first.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
const html = join(out, "index.html");
const problems = [];

if (!existsSync(html)) {
  console.error("::error::out/index.html was not written");
  process.exit(1);
}
const s = readFileSync(html, "utf8");

if (!/<meta\s+name=["']presentation-format["']\s+content=["']html-presentation\/v1["']/i.test(s)) {
  problems.push('missing <meta name="presentation-format" content="html-presentation/v1">');
}
if (/<script[\s>]/i.test(s)) problems.push("contains a <script> tag; the player strips it");

const sections = s.match(/<section\b[\s\S]*?<\/section>/gi) ?? [];
if (sections.length === 0) problems.push("no <section> slides");
sections.forEach((sec, i) => {
  const n = i + 1;
  if (!/data-layout=["']landscape["']/.test(sec)) problems.push(`slide ${n}: no landscape block`);
  if (!/data-layout=["']vertical["']/.test(sec)) problems.push(`slide ${n}: no vertical block`);
  const notes = sec.match(/<aside\s+class=["']notes["']/gi) ?? [];
  if (notes.length !== 1) problems.push(`slide ${n}: ${notes.length} <aside class="notes"> (need exactly 1)`);
  if (!/<section\b[^>]*data-background=/.test(sec)) problems.push(`slide ${n}: no data-background`);
});

const net = s.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+["']|@import\s+(?:url\()?["']?https?:\/\/|url\(\s*["']?https?:\/\//gi) ?? [];
for (const ref of net.slice(0, 5)) problems.push(`network reference at render time: ${ref.slice(0, 100)}`);

if (!existsSync(join(out, "context.md"))) problems.push("out/context.md was not written");

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  console.error(`\n${problems.length} problem(s). Nothing was narrated or published.`);
  process.exit(1);
}
console.log(`valid: ${sections.length} slides, both layouts, one narration each, no network references`);
