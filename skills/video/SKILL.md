---
name: video
description: Turns a published presentation into an MP4 you can upload. Use when asked to export, download, or render a presentation as a video, an mp4, a YouTube upload, a Short, a Reel, a TikTok, or a clip — including from a bisque.today watch link, a deck, or a slideshow.
---

# Video

`bisque-video` renders a published presentation to an MP4 on this Mac. Give it
a watch URL and it fetches the presentation, its narration and its images,
draws every frame with the real player, and writes a file.

Anything with a watch URL can become a video — the user's own presentations
and anyone else's public ones.

## 1. Check the machine

```sh
~/.bisque/bin/bisque-video doctor
```

It prints the ffmpeg it will encode with, where the player bundle is, and
whether both are usable. Fix whatever it reports:

**No `bisque-video`.** It lives at `~/.bisque/bin/bisque-video`, which is
usually **not** on `PATH` — never probe with `command -v`. Tell the user you
are about to download it (~15 MB) and what it is, then:

```sh
curl -fsSL https://download.bisque.today/bisque-video/install.sh | sh
```

macOS only, Apple Silicon or Intel. On Linux or Windows, say so plainly and
offer the watch URL instead — the presentation plays in any browser.

**No ffmpeg.** `doctor --fix` downloads one (~12 MB, into `~/.bisque/ffmpeg/`).
Say what it is doing before you run it. A Homebrew ffmpeg already on the Mac is
used as-is and nothing is downloaded.

## 2. Render

```sh
~/.bisque/bin/bisque-video export https://bisque.today/p/siderakis/this-week-in-bun
```

The presentation argument takes any of these:

| Form                  | Example                                 |
| --------------------- | --------------------------------------- |
| Watch URL             | `https://bisque.today/p/nick/q3-review` |
| Channel and slug      | `nick/q3-review`                        |
| A local presentation  | `./presentations/q3-review`             |
| A packed presentation | `q3-review.presentation`                |

Useful flags:

- `--preset short` — 1080×1920 for Shorts, Reels and TikTok. `square` is
  1080×1080; the default `long` is 1920×1080. Run `bisque-video presets` for
  the list.
- `-o path.mp4` — where to write it. Defaults to `<slug>.mp4` in the current
  directory, or `<slug>-short.mp4` for a non-default preset.
- `--json` — newline-delimited JSON progress on stdout. **Use this when you
  run it**, so you can report real progress instead of watching a blank
  terminal. Every line has `event` and `stage`; the last line is `done` or
  `error`.
- `--fps`, `--width`, `--height`, `--crf` — only when the user asks for
  something specific.

## 3. While it runs

**Rendering takes about as long as the presentation is long**, sometimes more —
every frame is drawn and snapshotted individually. A four-minute presentation
is a several-minute render. Start it in the background and tell the user the
estimate up front rather than letting a silent terminal look like a hang.

Read the `--json` stream and report the stage in plain language: `fetch` is
downloading, `render` is drawing frames (the long one), `encoding`, `audio`
and `muxing` are the short tail.

## 4. Hand over the file

Say where the file is and how big it is. If the user asked for it to go
somewhere — YouTube, a Slack message, a folder — do that next.

## Rules

- **Absolute path.** `~/.bisque/bin/bisque-video`. `command -v` reports
  "missing" on machines where it is installed.
- **A private presentation can't be fetched by URL.** If `export` says so, the
  presentation is not public or unlisted. Offer to make it unlisted. Don't try
  to work around it.
- **Never re-narrate to make a video.** The audio is already published; this
  downloads it. If the user wants different narration, that's `/present`
  republishing the presentation, and the video is rendered after.
- **Don't render a presentation the user didn't ask about.** A channel URL
  lists many; ask which one.
