# Vibecircle — Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Tagline:** See what your friends are building.

## Overview

Vibecircle is an open-source social platform for friend groups who vibe code. A Claude Code plugin auto-captures moments from coding sessions — screenshots, deploy links, commit summaries — and posts them to a private group feed. The feed is a beautiful web app where you discover what friends are building, play with their live apps, react, and feel ambient presence.

### Core Thesis

Vibe coding is the most interesting creative activity happening right now, but it's solo. Make it social among friends and it becomes better entertainment than anything passive.

### What It Is NOT

- Not a leaderboard or stats tracker (that's Straude)
- Not a public gallery/showcase (that's Lovable Launched, Bolt Gallery)
- Not a coding tool — it lives alongside your tool
- Not performative — sharing is automatic and low-friction

### Target

- Claude Code users (v1 — expand to other tools later)
- Small friend groups (5-15 people)
- Open source from day one

---

## Three Pieces

### 1. Web App (the centerpiece)

A Next.js app deployed on Vercel. This is where the fun happens — the "room" your friend group keeps open while everyone codes.

**Feed:** A single-column feed of posts, newest first. Each post represents a moment from someone's coding session. Posts contain rich media and metadata.

**Presence:** The top bar shows who's online, who's actively building, and who's away. Avatar rings pulse when someone is coding. A scrolling activity ticker shows real-time events ("Priya deployed · Marcus started new project · Alex hit 47 commits").

**Post Types:**

| Type | Content | When |
|------|---------|------|
| **Shipped** | App preview + deploy link + commit summary | User deploys to Vercel |
| **WIP** | Screenshot(s) + optional note | User shares mid-session |
| **Video** | Screen recording / demo | User uploads a recording via web app |
| **Live** | Interactive iframe embed | User pastes a Vercel deploy URL via web app |
| **Ambient** | Activity summary + tech tags | Auto-generated from coding activity |

**Post creation paths:** Shipped, WIP, and Ambient posts are created via the Claude Code plugin (auto-detect or `/share`). Video and Live posts are created via the web app — users upload a screen recording or paste a deploy URL directly. This keeps the plugin thin.

**Media Formats:**

- **Image carousel** — swipeable screenshots with dot navigation
- **Video** — screen recordings with play button, REC badge, duration
- **Live embed** — interactive iframe of deployed app with toolbar (Open, Copy link)

**Interactions:**

- **Reactions** — emoji pills (fire, heart-eyes, rocket, gem, etc.) with counts. Your own reactions glow green.
- **Comments** — inline, casual, threaded. Friend-group energy.
- **"Explain how this was built"** — AI button that reads the project's code and commits, then posts a structured explanation as a comment. This is the one AI-agent feature for v1.
- **Try it** — opens the live app in an iframe or new tab

### 2. Claude Code Plugin (the capture layer)

A thin plugin that lives in Claude Code and handles sharing moments to your circle.

**Hook-based capture:**

| Hook Event | What Happens |
|------------|-------------|
| `Stop` | After Claude finishes a response, the plugin checks if something shareable happened (new deploy, significant commits, milestone). If so, it suggests sharing. |
| `PostToolUse` (Write/Edit) | Tracks file changes to build commit summaries and detect activity patterns. |
| `SessionStart` | Updates presence status to "building" on the web app. |
| `SessionEnd` | Updates presence status to "away." |

**Slash commands:**

| Command | Action |
|---------|--------|
| `/share` | Manually share the current state — takes a screenshot (via Playwright), bundles recent commits, and posts to your circle |
| `/share [note]` | Share with an optional message |
| `/circle` | Show who's online in your circle and recent activity |
| `/circle invite [email]` | Invite someone to your circle |

**Screenshot capture:** Uses Playwright (via the Playwright MCP or a bundled script) to capture the current dev server state. Falls back to the most recent Vercel preview URL if no dev server is running.

**Data flow:**
```
Claude Code Plugin → HTTP POST → Vibecircle API → Database → Web App (SWR polling)
```

**Configuration:** Stored in `${CLAUDE_PLUGIN_DATA}/config.json`:
- `apiUrl` — Vibecircle API endpoint
- `authToken` — user authentication token
- `circleId` — active circle ID
- `autoShare` — whether to auto-suggest sharing (default: true)

### 3. API (the backend)

A set of Next.js Route Handlers that connect the plugin to the web app.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/magic-link` | Send magic link login email |
| GET | `/api/auth/verify` | Verify magic link token, create session |
| GET | `/api/auth/[provider]` | OAuth login (GitHub) |
| GET | `/api/circles` | List user's circles |
| POST | `/api/circles` | Create a new circle |
| POST | `/api/circles/[id]/invite` | Invite someone (generates invite link) |
| POST | `/api/circles/[id]/join` | Accept invite |
| GET | `/api/circles/[id]/feed` | Get feed posts (paginated, newest first) |
| POST | `/api/circles/[id]/posts` | Create a post (from plugin or web) |
| POST | `/api/posts/[id]/reactions` | Add/remove reaction |
| GET | `/api/posts/[id]/comments` | Get comments |
| POST | `/api/posts/[id]/comments` | Add comment |
| POST | `/api/posts/[id]/explain` | Trigger AI explain (queues a job) |
| PUT | `/api/presence` | Update presence status |
| GET | `/api/circles/[id]/presence` | Get circle presence |

---

## Visual Design

### Direction: Electric Pop

Black canvas with neon gradients, glow effects, high energy. The app feels alive and buzzing — unapologetically not a developer dashboard.

### Typography

| Role | Font | Weight |
|------|------|--------|
| Headings / Logo | Bricolage Grotesque | 700-800 |
| Body / UI | DM Sans | 300-600 |
| Code / Technical | JetBrains Mono | 400-600 |

### Color System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#050505` | Page background |
| `--bg-surface` | `#0b0b0b` | Elevated surfaces |
| `--bg-card` | `#0e0e0e` | Card backgrounds |
| `--bg-elevated` | `#141414` | Highest elevation |
| `--accent-green` | `#00ff88` | Primary accent, active states |
| `--accent-cyan` | `#00ccff` | Secondary accent, links |
| `--accent-purple` | `#a855f7` | Shipped badge, highlights |
| `--accent-pink` | `#ff0066` | Alerts, recording indicators |
| `--accent-amber` | `#fbbf24` | WIP badge |

### Key Visual Elements

- **Noise texture overlay** — subtle grain over the entire page for depth
- **Ambient glow blobs** — large, blurred, slowly drifting color blobs behind the feed
- **Pulsing avatar rings** — gradient-bordered circles that breathe when someone is building
- **Frosted glass** — `backdrop-filter: blur()` on top bar and overlays
- **Staggered entry animations** — posts fade-slide in sequentially on load
- **Glow borders on live posts** — the post card itself glows green when content is live

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Web App** | Next.js (App Router) | Best DX, Vercel-native, SSR/streaming |
| **Styling** | Tailwind CSS + CSS variables | Rapid iteration, design token system |
| **Components** | shadcn/ui (customized to Electric Pop) | Accessible primitives, fully customizable |
| **Database** | Neon Postgres | Serverless, branching, Vercel Marketplace |
| **ORM** | Drizzle | Type-safe, lightweight, great DX |
| **File Storage** | Vercel Blob | Screenshots, videos, media uploads |
| **Auth** | Auth.js (NextAuth) | Simple, extensible, magic link + OAuth |
| **Real-time** | SWR polling (3-5s) | Simple, no infra, sufficient for 5-15 people |
| **AI (explain)** | AI SDK + AI Gateway | Model-agnostic, cost tracking, OIDC auth |
| **Plugin** | Claude Code Plugin SDK | Hooks, commands, HTTP, Playwright |
| **Hosting** | Vercel | Zero-config, preview URLs for embeds |
| **Monorepo** | Turborepo | Plugin + web app in one repo |

### Why not WebSockets for real-time?

For 5-15 people, SWR polling every 3-5 seconds feels live enough and requires zero additional infrastructure. WebSockets on Vercel's serverless architecture would require a third-party service (Pusher, Ably, etc.), adding complexity and cost. If the product grows beyond friend groups, we can add WebSocket support later.

### Why Neon over Supabase?

Supabase bundles auth + database + real-time, but we want the pieces to be independent and swappable (open-source ethos). Neon gives us just the database. Auth.js gives us just auth. SWR gives us just polling. Each piece is replaceable.

---

## Data Model

### Tables

```
users
  id          uuid PK
  email       text UNIQUE
  name        text
  avatar_url  text
  created_at  timestamp

circles
  id          uuid PK
  name        text
  created_by  uuid FK → users
  invite_code text UNIQUE
  created_at  timestamp

circle_members
  circle_id   uuid FK → circles
  user_id     uuid FK → users
  role        text (owner | member)
  joined_at   timestamp
  PK (circle_id, user_id)

posts
  id          uuid PK
  circle_id   uuid FK → circles
  author_id   uuid FK → users
  type        text (shipped | wip | video | live | ambient)
  body        text (optional note/message)
  media       jsonb (array of {type, url, caption})
  metadata    jsonb (see Metadata Schema below)
  created_at  timestamp

reactions
  id          uuid PK
  post_id     uuid FK → posts
  user_id     uuid FK → users
  emoji       text
  created_at  timestamp
  UNIQUE (post_id, user_id, emoji)

comments
  id          uuid PK
  post_id     uuid FK → posts
  author_id   uuid FK → users
  body        text
  is_ai       boolean (true if generated by explain feature)
  created_at  timestamp

presence
  user_id     uuid FK → users
  circle_id   uuid FK → circles
  status      text (building | online | away)
  activity    text (what they're working on)
  updated_at  timestamp
  PK (user_id, circle_id)
```

### Post Metadata Schema

The `metadata` jsonb column on `posts` has different required keys per post type:

| Post Type | Required Keys | Optional Keys |
|-----------|--------------|---------------|
| **shipped** | `repo_url`, `deploy_url`, `commits_count`, `files_changed` | `tech_tags[]`, `duration_minutes` |
| **wip** | `repo_url` | `tech_tags[]`, `files_changed`, `commits_count` |
| **video** | — | `repo_url`, `tech_tags[]` |
| **live** | `deploy_url` | `repo_url`, `tech_tags[]` |
| **ambient** | `commits_count`, `files_changed` | `tech_tags[]`, `active_files[]` |

The AI Explain feature requires `repo_url` to be present. The "Explain" button only renders on posts that have it.

---

## Plugin Architecture

### Directory Structure

```
packages/plugin/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   └── hooks.json
├── skills/
│   └── share/
│       └── SKILL.md
├── commands/
│   └── share.md
│   └── circle.md
├── scripts/
│   ├── capture-screenshot.js    (Playwright screenshot)
│   ├── post-to-circle.js        (HTTP POST to API)
│   ├── update-presence.js       (presence heartbeat)
│   └── detect-activity.js       (commit/file analysis)
└── README.md
```

### plugin.json

```json
{
  "name": "vibecircle",
  "version": "0.1.0",
  "description": "See what your friends are building. Social feed for vibe coders.",
  "author": {
    "name": "vibecircle",
    "url": "https://github.com/vibecircle/vibecircle"
  }
}
```

### hooks.json

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js building"
      }]
    }],
    "SessionEnd": [{
      "hooks": [{
        "type": "command",
        "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js away"
      }]
    }],
    "Stop": [{
      "hooks": [{
        "type": "command",
        "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/detect-activity.js"
      }]
    }]
  }
}
```

### Sharing Flow

1. User codes with Claude Code
2. On `Stop` hook, `detect-activity.js` checks recent git activity
3. If a deploy happened or significant changes occurred, Claude suggests sharing
4. User says "yes" or runs `/share`
5. `capture-screenshot.js` takes a Playwright screenshot of the dev server (or uses the latest Vercel preview URL)
6. `post-to-circle.js` uploads media to Vercel Blob and creates a post via the API
7. Friends see it in their feed within 3-5 seconds (SWR polling)

---

## AI Explain Feature

When a user clicks "Explain how this was built" on a post:

1. Frontend calls `POST /api/posts/[id]/explain`
2. Backend fetches the post's associated repo URL and recent commits
3. Uses AI SDK `streamText` with AI Gateway to analyze the codebase:
   - Reads key files (package.json, main components, API routes)
   - Summarizes the architecture and interesting patterns
   - Highlights what's novel or clever
4. Streams the response back and creates a comment with `is_ai: true`
5. The comment renders with an AI badge and uses AI Elements `<MessageResponse>` for rich markdown

**Scope for v1:** Works with public GitHub repos. Private repo support (via GitHub App) is a v2 feature.

---

## Repo Structure

```
vibecircle/
├── apps/
│   └── web/                    # Next.js web app
│       ├── app/
│       │   ├── (auth)/         # Login, signup, invite accept
│       │   ├── (feed)/         # Main feed, circle views
│       │   ├── api/            # Route handlers
│       │   └── layout.tsx
│       ├── components/
│       │   ├── feed/           # Post cards, carousel, video, embed
│       │   ├── presence/       # Avatar rings, ticker, status
│       │   ├── reactions/      # Emoji reactions, add button
│       │   └── ui/             # shadcn/ui customized components
│       ├── lib/
│       │   ├── db/             # Drizzle schema, queries
│       │   ├── auth/           # Auth.js config
│       │   └── ai/             # Explain feature
│       └── public/
├── packages/
│   └── plugin/                 # Claude Code plugin
│       ├── .claude-plugin/
│       ├── hooks/
│       ├── commands/
│       ├── skills/
│       └── scripts/
├── turbo.json
├── package.json
└── README.md
```

Turborepo monorepo with two workspaces: `apps/web` and `packages/plugin`. Shared tooling at the root. Open source under MIT license.

---

## Scope for v1

### In Scope

- User signup/login (magic link)
- Create and join circles via invite link
- Post to circle from Claude Code plugin (`/share`)
- Screenshot capture via Playwright
- Feed with all post types (shipped, WIP, video, live, ambient)
- Image carousel and video preview
- Live embed with iframe
- Reactions and comments
- Presence (building / online / away)
- Activity ticker
- AI Explain feature (public repos)
- Open-source repo with contributing guide

### Out of Scope (v2+)

- Support for Cursor, Windsurf, Codex, Lovable, etc.
- Private repo AI Explain (GitHub App)
- Push notifications
- Mobile app / PWA
- Before/After visual diffs
- Video recording from plugin
- Real-time WebSocket upgrades
- Circle discovery / public circles
- Remix (fork) from within Vibecircle
- Chat / DMs between circle members

---

## Success Criteria

1. Your friend group uses it for a week and prefers it to checking in via group chat
2. At least one person says "I saw what you built on Vibecircle" in conversation
3. The "Explain how this was built" button gets used on every shipped post
4. Someone outside the friend group installs the plugin from the open-source repo
