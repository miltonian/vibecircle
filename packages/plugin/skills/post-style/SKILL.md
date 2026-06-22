---
name: vibecircle-post-style
description: Use when drafting a vibecircle post to share with a circle — composes a visually rich, on-brand post from the curated block kit (instead of plain markdown) and posts it via post-to-circle.js --blocks. Trigger when the vibecircle sentinel suggests sharing, or when the user runs /share.
---

# Writing a rich vibecircle post

A post can be plain markdown (`--body`) OR a **rich block kit** (`--blocks`). Prefer
blocks when the update has structure worth showing — a shipped feature, metrics, a
"how it works", an incident write-up. Blocks render through vibecircle's own styled
components, so they look consistent and on-brand. **There is no raw HTML** — you emit
a small, fixed set of typed blocks; anything off-spec is rejected by the server.

## The block kit

Emit a JSON array of blocks. Each: `{ "type": ..., ...fields }`.

| type | fields | use it for |
|---|---|---|
| `heading` | `text` | a short section title |
| `text` | `text` (inline **bold**/*italic*/`code`/links ok) | a sentence or two of prose |
| `callout` | `tone` (`info`\|`success`\|`warn`), `text` | the headline moment ("Shipped to prod 🎉") |
| `metrics` | `items: [{label,value}]` (≤8) | commits, files changed, coverage, latency… |
| `code` | `code`, `lang?` | a tiny, illustrative snippet (keep it short) |
| `steps` | `items: [string]` (≤12) | "how it works" / what changed, in order |
| `image` | `url`, `caption?` | a screenshot you uploaded (Vercel Blob URL only) |
| `deploy` | `url`, `label?` | the live link — "Try it live ↗" |
| `divider` | — | separate sections |

Constraints the server enforces (stay within them or the post is rejected): ≤30
blocks; `text`/`callout` ≤2000 chars; `code` ≤5000; only the fields listed above;
`image.url` must be an `https` Vercel Blob URL; `deploy.url` must be `https`.

## House style
- Lead with a `callout` (success for ships, info for WIP/updates) — one punchy line.
- Follow with 1–2 `text` blocks in plain English (what & why, not jargon).
- Add `metrics` only when you have real numbers; don't invent them.
- Use `steps` for changelogs / "how it works"; keep each step one short line.
- End with a `deploy` block if there's a live URL.
- Keep it tight: a great post is ~4–6 blocks. Match the circle's tone (casual vs. professional).

## Example

```json
[
  { "type": "callout", "tone": "success", "text": "Shipped dark mode 🌙" },
  { "type": "text", "text": "Reworked the theming layer to use CSS variables, so every surface now has a proper dark palette." },
  { "type": "metrics", "items": [{ "label": "files", "value": "12" }, { "label": "commits", "value": "5" }] },
  { "type": "deploy", "url": "https://myapp.vercel.app", "label": "See it" }
]
```

## Posting

1. Draft the blocks, then **show the user a short text preview** (one line per block)
   and get approval — never post without it.
2. Write the approved JSON array to a temp file, e.g. `/tmp/vc-post.json`.
3. Post:

   ```
   node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
     --circle-id <id> --type <shipped|wip> \
     --headline "<one-line headline>" \
     --blocks /tmp/vc-post.json \
     [--arc-id <arcId> --arc-title "<title>" --arc-sequence <n>] \
     [--screenshot <path>]
   ```

`--headline` still sets the post's title; `--blocks` replaces `--body` for the
content. If the update is trivial, a plain `--body "<markdown>"` is fine instead.
