# Vibecircle Teams Pivot — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Branch:** feat/signal-game

## Problem

Vibecircle's feed is too technical. Posts show commit counts, tech tags, and sparse user-typed notes. Only engineers care. Product managers, designers, and leadership can't follow what's being built without asking someone or sitting in a standup.

## Goal

Make vibecircle the fastest way for anyone on a team to know what's being built — without meetings, without asking, without reading diffs. A PM opens the feed and follows a feature from start to ship.

## Design Decisions

- **One feed, one truth** — everyone sees the same posts. No audience-specific views. Descriptions are written for humans, not machines. If you want commits, go to GitHub.
- **AI runs in Claude Code** — all intelligence (sentinel, context engine, ghost-writer) runs as plugin hook prompts inside the user's Claude Code session. Zero LLM cost for vibecircle. The server is a dumb REST API.
- **Approval gate** — the plugin proposes what to share, the user approves or edits before posting. No accidental shares.
- **Arcs, not tables** — related posts share an `arcId`. No separate arc entity, no lifecycle management. Arcs emerge from posts.
- **Visual direction: Warm Editorial** — dark brown-black canvas, warm cream text, serif headlines, copper/amber accent. Premium journal aesthetic. The feed chrome is quiet; screenshots and live embeds are the visual interest.

## 1. Smart Plugin

Three layers, all running locally inside Claude Code via hook prompts.

### 1.1 Sentinel (Stop Hook)

Runs after each Claude response. Analyzes recent activity and scores "shareability":

| Signal | Score |
|--------|-------|
| First deploy detected | High |
| New UI component/page created | High |
| Visual component changed with screenshot opportunity | Medium |
| 5+ files changed across multiple areas | Medium |
| Bug fix with tests passing | Low |
| Config/dependency-only changes | Skip |

If score exceeds threshold, triggers the ghost-writer. Otherwise, silently updates session context and exits.

Implementation: prompt-based Stop hook (`hooks/stop-sentinel.md`). The prompt instructs Claude to run `git diff --stat`, read session context, score signals, and either exit or draft a post.

### 1.2 Context Engine (Local JSON)

Maintains `~/.vibecircle/session.json`:

```json
{
  "sessionId": "uuid",
  "projectName": "vibecircle",
  "projectDir": "/Users/alex/vibecircle",
  "currentWork": "Building payment integration with Stripe",
  "activeArc": {
    "id": "arc_abc123",
    "title": "Payment Integration",
    "sequence": 2
  },
  "milestones": [
    "Stripe SDK setup and pricing model"
  ],
  "techStack": ["Next.js", "Stripe", "TypeScript"],
  "startedAt": "2026-03-24T14:00:00Z"
}
```

- Updated on every Stop hook (even when not sharing)
- `currentWork` is a plain-English summary of what's being built, updated by Claude reading the conversation context
- `activeArc` groups posts from the same feature. Arc ID is generated locally by the plugin (UUID). Arc title is inferred by Claude from the work being done.
- `milestones` tracks what's already been shared this session to avoid repetition
- Resets when Claude Code starts a new session or switches project directory

SessionStart hook initializes/resets this file. SessionEnd hook clears it and sets presence to "away".

### 1.3 Ghost-Writer (Claude Writes the Post)

When the sentinel fires, Claude:

1. Reads session context + recent `git diff --stat` + file changes
2. Writes a **headline** — one line, plain English, no jargon (e.g., "Built a settings page with dark mode toggle")
3. Writes a **description** — 2-3 sentences a PM can read and report upward (e.g., "Users can now customize their experience — toggle dark mode, set notification frequency, and manage connected accounts. Includes system preference detection.")
4. Adds **continuation context** if part of an arc (e.g., "Continued from settings work — now with 2FA setup")
5. Determines media capture strategy (see 1.4)
6. Shows preview in terminal with Y/E/S (yes/edit/skip) prompt
7. On approval, calls `post-to-circle.js` with headline, description, media, and arc info

### 1.4 Smart Media Capture

Claude decides what media to capture based on the type of work:

| Work Type | Media Strategy |
|-----------|---------------|
| Frontend / UI changes | Playwright screenshot of dev server, or Vercel preview URL |
| Deploy / shipped | Screenshot of live URL + deploy link for "Try it live" embed |
| Backend / API work | No screenshot — richer description instead |
| Database / schema changes | No screenshot — description focuses on what changed and why |

The sentinel prompt includes logic to detect work type from file paths (e.g., files in `components/`, `pages/`, `app/` → frontend; files in `api/`, `routes/`, `server/` → backend).

### 1.5 Manual /share

`/share` still works as a manual override. It now also runs the ghost-writer to generate a headline and description (user can edit). It reads session context for arc info. Same approval flow.

## 2. Feed — Written for Humans

### 2.1 Post Anatomy (New)

Each post in the feed shows:

- **Author + timestamp** — "{Name} shipped/is building" with relative time
- **Arc badge** — "Part of {Arc Title} · {n}th update" (if part of an arc)
- **Headline** — AI-written, plain English, prominent (serif, larger type)
- **Description** — 2-3 sentences, readable by anyone
- **Media** — screenshot, live embed, or nothing (for backend work)
- **"Try it live" badge** — on shipped posts with deploy URLs, opens iframe
- **Reactions + comments** — existing system, unchanged

### 2.2 What's Removed from Current Feed

- Commit counts ("3 commits · 8 files changed") — no one outside eng cares
- Tech tags as primary info ("React · TypeScript · Tailwind") — means nothing to product
- Raw deploy URLs — replaced with "Try it live" button
- Sparse user-typed descriptions — replaced with AI-written narratives

Commit counts and tech tags are still stored in `metadata` (jsonb) for potential future use but are not displayed in the feed.

### 2.3 Arcs — Features as Stories

Posts with the same `arcId` can be rendered as a timeline:

```
Monday 2:15 PM  ● Started payment integration
                  Setting up Stripe SDK, creating pricing model with 3 tiers...

Monday 5:40 PM  ● Pricing page is up
                  Interactive pricing cards with toggle between monthly/annual.

Tuesday 11:20AM ● Subscriptions are live ✓
                  Full subscription flow — upgrade, downgrade, cancel.
```

Arc timeline is a **client-side grouping** in the feed, not a separate view. The default feed is chronological; arcs provide visual continuity via the arc badge and optional timeline expansion.

### 2.4 Visual Direction: Warm Editorial

Replacing the current "Electric Pop" neon aesthetic.

**Canvas:** Dark brown-black (`#1a1816`)
**Cards:** Slightly lighter (`#221f1b`), subtle warm borders
**Text:** Warm cream (`#e8e0d4`) for primary, muted earth tones for secondary
**Accent:** Copper/amber (`#c4956a`) — used sparingly for arc indicators, links, badges
**Headlines:** Serif typeface (e.g., Playfair Display, Lora, or Newsreader)
**Body:** Clean sans-serif (e.g., DM Sans retained, or switch to something like Satoshi/General Sans)
**Code/mono:** JetBrains Mono retained

**Principles:**
- Feed chrome is quiet — screenshots and live embeds are the visual interest
- No gradients competing with user content
- Serif headlines signal "this is a story worth reading," not "this is a dashboard"
- Warm tones feel approachable to non-engineers (not cold/clinical)
- One accent color, used with restraint

## 3. Data Model Changes

### 3.1 Posts Table — New Columns

| Column | Type | Description |
|--------|------|-------------|
| `headline` | `text` | AI-written one-liner, plain English |
| `arcId` | `text` (nullable) | Groups posts from same feature/work stream |
| `arcTitle` | `text` (nullable) | Human-readable arc name ("Payment Integration") |
| `arcSequence` | `integer` (nullable) | Position in the arc (1, 2, 3...) |

### 3.2 Posts Table — Column Reuse

- `body` — now holds the AI-written description (was sparse user-typed note). 2-3 sentences, plain English.
- `metadata` (jsonb) — still stores repo_url, deploy_url, tech_tags, commits_count, files_changed. These are background data, not displayed prominently.

### 3.3 No New Tables

Arcs are emergent — they exist because posts share an `arcId`. No arc entity, no arc CRUD, no arc lifecycle. If a user never shares a second update in an arc, it's just a normal post.

## 4. API Changes

### 4.1 Modified Endpoints

**`POST /api/circles/{id}/posts`** — now accepts `headline`, `arcId`, `arcTitle`, `arcSequence` in the request body. All optional (backwards-compatible with existing plugin).

**`GET /api/circles/{id}/feed`** — response now includes `headline`, `arcId`, `arcTitle`, `arcSequence` on each post. Client-side groups by arcId for timeline rendering.

### 4.2 New Endpoints

**`GET /api/circles/{id}/arcs`** — returns active arcs for the circle. Response:

```json
[
  {
    "arcId": "arc_abc123",
    "arcTitle": "Payment Integration",
    "authorId": "user_xyz",
    "authorName": "Sarah",
    "postCount": 3,
    "latestAt": "2026-03-24T11:20:00Z"
  }
]
```

Used for sidebar filtering: "Show me just the Payment Integration story."

## 5. Plugin File Changes

```
packages/plugin/
  hooks/hooks.json           — Updated: Stop hook → stop-sentinel.md prompt
  hooks/stop-sentinel.md     — NEW: prompt-based sentinel + ghost-writer
  hooks/session-start.md     — NEW: initialize session.json, set presence
  hooks/session-end.md       — NEW: clear session, set presence to away
  scripts/post-to-circle.js  — MODIFIED: sends headline, arcId, arcTitle, arcSequence
  commands/share.md          — MODIFIED: manual /share uses ghost-writer for description
```

## 6. What's NOT Changing

- Auth system (Auth.js + GitHub OAuth + API tokens)
- Circle membership model
- Reactions and comments
- Presence system (SWR polling)
- AI Explain feature (BYOK, separate from ghost-writer)
- Device code auth flow
- Upload to Vercel Blob

## 7. Migration Path

The changes are additive — new columns are nullable, new endpoint is separate, existing posts continue to work. Old posts without headlines just show the body text as before.

The visual redesign (Warm Editorial) replaces Electric Pop entirely — no toggle between old and new.
