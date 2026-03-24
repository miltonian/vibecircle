# Vibecircle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Vibecircle — an open-source social feed for friend groups who vibe code, consisting of a Next.js web app, a Claude Code plugin, and a shared API.

**Architecture:** Turborepo monorepo with two workspaces: `apps/web` (Next.js App Router on Vercel) and `packages/plugin` (Claude Code plugin). The web app contains both the feed UI and the API (Route Handlers). Neon Postgres for data, Drizzle ORM, Auth.js for auth, Vercel Blob for media, SWR for polling, AI SDK for the Explain feature.

**Tech Stack:** Next.js 16, Tailwind CSS, shadcn/ui, Drizzle, Neon Postgres, Auth.js, Vercel Blob, AI SDK v6, Turborepo, Claude Code Plugin SDK

**Spec:** `docs/specs/design.md`

---

## File Map

### Root (Turborepo)

```
vibecircle/
├── package.json                  # Root workspace config
├── turbo.json                    # Turborepo task pipeline
├── .gitignore
├── LICENSE                       # MIT
└── docs/
    └── specs/
        └── design.md             # Design spec (exists)
```

### apps/web (Next.js)

```
apps/web/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── components.json               # shadcn/ui config
├── drizzle/
│   └── 0000_initial.sql          # Generated migration
├── public/
│   └── noise.svg                 # Noise texture
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (fonts, theme, providers)
│   │   ├── globals.css           # CSS variables, Electric Pop theme
│   │   ├── page.tsx              # Landing / redirect to feed
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx    # Magic link login form
│   │   │   └── invite/[code]/page.tsx  # Accept circle invite
│   │   ├── (feed)/
│   │   │   ├── layout.tsx        # Feed shell (top bar, presence)
│   │   │   ├── [circleId]/
│   │   │   │   └── page.tsx      # Circle feed page
│   │   │   └── new-circle/page.tsx  # Create circle form
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # Auth.js handler
│   │       ├── circles/route.ts             # List/create circles
│   │       ├── circles/[id]/feed/route.ts   # Feed posts
│   │       ├── circles/[id]/posts/route.ts  # Create post
│   │       ├── circles/[id]/invite/route.ts # Generate invite
│   │       ├── circles/[id]/join/route.ts   # Accept invite
│   │       ├── circles/[id]/presence/route.ts # Circle presence
│   │       ├── posts/[id]/reactions/route.ts  # Reactions
│   │       ├── posts/[id]/comments/route.ts   # Comments
│   │       ├── posts/[id]/explain/route.ts    # AI Explain
│   │       ├── presence/route.ts              # Update presence
│   │       └── upload/route.ts                # Media upload
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (auto-generated)
│   │   ├── feed/
│   │   │   ├── post-card.tsx     # Main post card wrapper
│   │   │   ├── post-header.tsx   # Avatar, author, timestamp, badge
│   │   │   ├── post-body.tsx     # Text content
│   │   │   ├── image-carousel.tsx # Swipeable screenshots
│   │   │   ├── video-preview.tsx  # Video with play button
│   │   │   ├── live-embed.tsx     # Interactive iframe
│   │   │   ├── commit-bar.tsx     # Commit summary strip
│   │   │   └── create-post-dialog.tsx  # Web-based post creation
│   │   ├── reactions/
│   │   │   ├── reaction-bar.tsx   # Reaction pills row
│   │   │   └── reaction-picker.tsx # Emoji picker popover
│   │   ├── comments/
│   │   │   ├── comment-list.tsx   # Comment thread
│   │   │   ├── comment-row.tsx    # Single comment
│   │   │   ├── comment-input.tsx  # New comment form
│   │   │   └── ai-explain-button.tsx # "Explain how this was built"
│   │   ├── presence/
│   │   │   ├── top-bar.tsx        # Sticky header with logo + presence
│   │   │   ├── avatar-ring.tsx    # Pulsing presence avatar
│   │   │   └── activity-ticker.tsx # Scrolling event marquee
│   │   └── auth/
│   │       └── login-form.tsx     # Magic link email form
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts           # Drizzle client + Neon connection
│   │   │   ├── schema.ts          # All table definitions
│   │   │   └── queries.ts         # Reusable query functions
│   │   ├── auth.ts                # Auth.js config (providers, callbacks)
│   │   ├── ai.ts                  # AI explain logic
│   │   └── utils.ts               # Shared utilities (cn, etc.)
│   └── hooks/
│       ├── use-feed.ts            # SWR hook for feed polling
│       ├── use-presence.ts        # SWR hook for presence polling
│       └── use-reactions.ts       # Optimistic reaction mutations
└── __tests__/
    ├── api/
    │   ├── circles.test.ts
    │   ├── posts.test.ts
    │   ├── reactions.test.ts
    │   ├── comments.test.ts
    │   └── presence.test.ts
    └── components/
        ├── post-card.test.tsx
        ├── reaction-bar.test.tsx
        └── image-carousel.test.tsx
```

### packages/plugin (Claude Code)

```
packages/plugin/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   └── hooks.json
├── commands/
│   ├── share.md
│   └── circle.md
├── scripts/
│   ├── capture-screenshot.js
│   ├── post-to-circle.js
│   ├── update-presence.js
│   ├── detect-activity.js
│   └── lib/
│       ├── config.js             # Read/write plugin config
│       └── api-client.js         # HTTP client for Vibecircle API
└── README.md
```

---

## Task Dependency Graph

```
Task 1 (Monorepo) ──→ Task 2 (Design System) ──→ Task 3 (Database)
                                                       │
                                                       ├──→ Task 4 (Auth)
                                                       │         │
                                                       │         ├──→ Task 5 (Circles API + UI)
                                                       │         │         │
                                                       │         │         ├──→ Task 6 (Posts API)
                                                       │         │         │         │
                                                       │         │         │         ├──→ Task 7 (Feed UI)
                                                       │         │         │         │
                                                       │         │         │         ├──→ Task 8 (Reactions + Comments)
                                                       │         │         │         │
                                                       │         │         │         └──→ Task 10 (AI Explain)
                                                       │         │         │
                                                       │         │         └──→ Task 9 (Presence)
                                                       │         │
                                                       │         └──→ Task 11 (Plugin)
                                                       │
                                                       └──→ (Tasks 6-8 can parallelize after Task 5)
```

**Parallelizable after Task 5:** Tasks 6+7 (Posts), Task 8 (Reactions/Comments), Task 9 (Presence), Task 11 (Plugin) can be worked on by different people simultaneously once Circles API is done.

---

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `turbo.json`, `LICENSE`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `packages/plugin/.claude-plugin/plugin.json`, `packages/plugin/README.md`

- [ ] **Step 1: Initialize root workspace**

```bash
cd /path/to/vibecircle
npm init -y
```

Update `package.json`:
```json
{
  "name": "vibecircle",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "persistent": true, "cache": false },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": {},
    "test": {}
  }
}
```

- [ ] **Step 3: Scaffold Next.js app**

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 4: Scaffold plugin package**

Create `packages/plugin/.claude-plugin/plugin.json`:
```json
{
  "name": "vibecircle",
  "version": "0.1.0",
  "description": "See what your friends are building. Social feed for vibe coders.",
  "author": {
    "name": "vibecircle",
    "url": "https://github.com/miltonian/vibecircle"
  }
}
```

Create `packages/plugin/README.md` with basic plugin description.

- [ ] **Step 5: Add MIT license**

Create `LICENSE` with MIT license text.

- [ ] **Step 6: Install dev dependencies**

```bash
npm install
cd apps/web
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install swr
cd ../..
```

Create `apps/web/vitest.config.ts` for test runner setup.

- [ ] **Step 7: Verify monorepo works**

```bash
npx turbo dev --filter=web
```

Expected: Next.js dev server starts on localhost:3000.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold turborepo monorepo with Next.js app and plugin package"
```

---

### Task 2: Design System (Electric Pop Theme)

**Files:**
- Create: `apps/web/src/app/globals.css`, `apps/web/public/noise.svg`, `apps/web/tailwind.config.ts` (modify), `apps/web/src/app/layout.tsx` (modify), `apps/web/src/lib/utils.ts`
- Depends on: Task 1

- [ ] **Step 1: Install shadcn/ui**

```bash
cd apps/web
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes.

- [ ] **Step 2: Create CSS variables and Electric Pop theme**

Write `apps/web/src/app/globals.css` with all CSS variables from spec:
- `--bg-base: #050505` through `--accent-amber: #fbbf24`
- Noise texture overlay (`body::before`)
- Ambient glow blob styles
- Scrollbar styling
- Font imports for Bricolage Grotesque, DM Sans, JetBrains Mono

- [ ] **Step 3: Configure Tailwind with design tokens**

Extend `tailwind.config.ts` to map CSS variables to Tailwind classes:
```ts
theme: {
  extend: {
    colors: {
      base: 'var(--bg-base)',
      surface: 'var(--bg-surface)',
      card: 'var(--bg-card)',
      elevated: 'var(--bg-elevated)',
      accent: {
        green: 'var(--accent-green)',
        cyan: 'var(--accent-cyan)',
        purple: 'var(--accent-purple)',
        pink: 'var(--accent-pink)',
        amber: 'var(--accent-amber)',
      },
    },
    fontFamily: {
      display: ['Bricolage Grotesque', 'sans-serif'],
      body: ['DM Sans', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
  },
}
```

- [ ] **Step 4: Update root layout with fonts and theme**

Modify `apps/web/src/app/layout.tsx`:
- Import Google Fonts via `next/font`
- Set `dark` class on `<html>`
- Apply font CSS variables to body
- Add noise texture SVG to `public/`

- [ ] **Step 5: Create utility functions**

Write `apps/web/src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 6: Verify theme renders**

Run `npx turbo dev --filter=web`, open localhost:3000. Page should be #050505 black with correct fonts loading.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Electric Pop design system with fonts, colors, and noise texture"
```

---

### Task 3: Database Schema + Drizzle Setup

**Files:**
- Create: `apps/web/src/lib/db/index.ts`, `apps/web/src/lib/db/schema.ts`, `apps/web/drizzle.config.ts`
- Depends on: Task 1

- [ ] **Step 1: Install Drizzle + Neon**

```bash
cd apps/web
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

- [ ] **Step 2: Write schema**

Create `apps/web/src/lib/db/schema.ts` with all tables from spec:
- `users`, `circles`, `circleMembers`, `posts`, `reactions`, `comments`, `presence`
- Use Drizzle's `pgTable`, `uuid`, `text`, `timestamp`, `jsonb`, `boolean`
- Add all foreign keys, unique constraints, and composite primary keys
- Export type inference helpers (`type User = typeof users.$inferSelect`)

- [ ] **Step 3: Create Drizzle config**

Write `apps/web/drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 4: Create database client**

Write `apps/web/src/lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

- [ ] **Step 5: Generate and verify migration**

```bash
npx drizzle-kit generate
```

Expected: Creates `drizzle/0000_initial.sql` with all CREATE TABLE statements.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add database schema with Drizzle ORM and Neon Postgres"
```

---

### Task 4: Authentication (Auth.js + Magic Link)

**Files:**
- Create: `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/components/auth/login-form.tsx`
- Modify: `apps/web/src/app/layout.tsx` (add SessionProvider)
- Depends on: Task 3

- [ ] **Step 1: Install Auth.js**

```bash
cd apps/web
npm install next-auth@beta @auth/drizzle-adapter
```

- [ ] **Step 2: Configure Auth.js**

Write `apps/web/src/lib/auth.ts`:
- Drizzle adapter for session/user storage
- Email provider (magic link) using Resend
- GitHub OAuth provider
- Callbacks: `session` callback to include user ID
- Export `auth`, `signIn`, `signOut` helpers

- [ ] **Step 3: Create route handler**

Write `apps/web/src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 4: Build login page**

Write `apps/web/src/app/(auth)/login/page.tsx` and `apps/web/src/components/auth/login-form.tsx`:
- Electric Pop styled login card
- Email input + "Send magic link" button
- GitHub OAuth button
- Centered on page with ambient glow background

- [ ] **Step 5: Add auth middleware**

Write `apps/web/src/app/proxy.ts` (Next.js 16 middleware):
- Protect `/(feed)` routes — redirect to `/login` if unauthenticated
- Allow `/api/auth/*`, `/login`, `/invite/*` without auth
- Allow `/api/presence` and `/api/circles/*/posts` with Bearer token auth (for plugin)

- [ ] **Step 6: Test login flow manually**

Run dev server, navigate to `/login`, enter email, verify magic link flow works end-to-end with Resend.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Auth.js with magic link and GitHub OAuth"
```

---

### Task 5: Circles API + UI

**Files:**
- Create: `apps/web/src/app/api/circles/route.ts`, `apps/web/src/app/api/circles/[id]/invite/route.ts`, `apps/web/src/app/api/circles/[id]/join/route.ts`, `apps/web/src/app/(feed)/layout.tsx`, `apps/web/src/app/(feed)/new-circle/page.tsx`, `apps/web/src/app/(auth)/invite/[code]/page.tsx`, `apps/web/src/lib/db/queries.ts`
- Depends on: Task 4

- [ ] **Step 1: Write circle query functions**

In `apps/web/src/lib/db/queries.ts`:
- `getUserCircles(userId)` — list circles the user belongs to
- `createCircle(name, userId)` — create circle + add creator as owner
- `generateInvite(circleId)` — create unique invite code
- `joinCircle(inviteCode, userId)` — join via invite code
- `getCircleMembers(circleId)` — list members with roles

- [ ] **Step 2: Write the failing test for circles API**

Create `apps/web/__tests__/api/circles.test.ts`:
- Test: `POST /api/circles` creates a circle and returns it
- Test: `GET /api/circles` returns user's circles
- Test: `POST /api/circles/[id]/invite` generates an invite code
- Test: `POST /api/circles/[id]/join` adds user to circle
- Mock the database layer, test route handler logic

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run __tests__/api/circles.test.ts
```

Expected: FAIL — route handlers don't exist yet.

- [ ] **Step 4: Implement circles route handlers**

Write `apps/web/src/app/api/circles/route.ts`:
- `GET` — return user's circles (requires auth)
- `POST` — create new circle with name, return circle + invite code

Write `apps/web/src/app/api/circles/[id]/invite/route.ts`:
- `POST` — generate invite link, return `{ inviteCode, inviteUrl }`

Write `apps/web/src/app/api/circles/[id]/join/route.ts`:
- `POST` — accept invite code, add user to circle

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run __tests__/api/circles.test.ts
```

Expected: PASS.

- [ ] **Step 6: Build feed layout shell**

Write `apps/web/src/app/(feed)/layout.tsx`:
- Sticky top bar with vibecircle logo (gradient text)
- Presence cluster placeholder (will be populated in Task 9)
- Circle selector in top bar
- Main content area (`{children}`)

- [ ] **Step 7: Build new circle page**

Write `apps/web/src/app/(feed)/new-circle/page.tsx`:
- Simple form: circle name input + create button
- On success, redirect to the new circle's feed page
- Electric Pop styled card

- [ ] **Step 8: Build invite accept page**

Write `apps/web/src/app/(auth)/invite/[code]/page.tsx`:
- Shows circle name and who invited you
- "Join circle" button
- If not logged in, redirect to login first, then back to invite

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add circles API with invite system and circle management UI"
```

---

### Task 6: Posts API + Media Upload

**Files:**
- Create: `apps/web/src/app/api/circles/[id]/posts/route.ts`, `apps/web/src/app/api/circles/[id]/feed/route.ts`, `apps/web/src/app/api/upload/route.ts`
- Modify: `apps/web/src/lib/db/queries.ts` (add post queries)
- Depends on: Task 5

- [ ] **Step 1: Install Vercel Blob**

```bash
cd apps/web
npm install @vercel/blob
```

- [ ] **Step 2: Write post query functions**

Add to `apps/web/src/lib/db/queries.ts`:
- `createPost(circleId, authorId, data)` — insert post with media + metadata
- `getFeed(circleId, cursor?, limit?)` — paginated feed, newest first, with author info
- `getPost(postId)` — single post with all relations

- [ ] **Step 3: Write failing tests for posts API**

Create `apps/web/__tests__/api/posts.test.ts`:
- Test: `POST /api/circles/[id]/posts` creates a post
- Test: `GET /api/circles/[id]/feed` returns paginated posts
- Test: feed returns posts with author info and reaction counts
- Test: post creation validates required metadata per type

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run __tests__/api/posts.test.ts
```

- [ ] **Step 5: Implement post and feed route handlers**

Write `apps/web/src/app/api/circles/[id]/posts/route.ts`:
- `POST` — create post (accepts type, body, media array, metadata)
- Validates that required metadata keys are present per post type
- Supports both session auth (web) and Bearer token auth (plugin)

Write `apps/web/src/app/api/circles/[id]/feed/route.ts`:
- `GET` — paginated feed (cursor-based), newest first
- Includes author info, reaction counts, comment count per post

- [ ] **Step 6: Implement media upload handler**

Write `apps/web/src/app/api/upload/route.ts`:
- `POST` — accepts multipart file upload
- Uploads to Vercel Blob
- Returns `{ url, type, size }`
- Accepts both image and video files

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run __tests__/api/posts.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add posts API with feed pagination and media upload"
```

---

### Task 7: Feed UI (Post Cards + Media Components)

**Files:**
- Create: `apps/web/src/app/(feed)/[circleId]/page.tsx`, `apps/web/src/components/feed/post-card.tsx`, `apps/web/src/components/feed/post-header.tsx`, `apps/web/src/components/feed/post-body.tsx`, `apps/web/src/components/feed/image-carousel.tsx`, `apps/web/src/components/feed/video-preview.tsx`, `apps/web/src/components/feed/live-embed.tsx`, `apps/web/src/components/feed/commit-bar.tsx`, `apps/web/src/components/feed/create-post-dialog.tsx`, `apps/web/src/hooks/use-feed.ts`
- Depends on: Task 6

**Note to implementer:** Reference the visual mockup in `.superpowers/brainstorm/` for design guidance. The Electric Pop aesthetic is defined in the spec under Visual Design.

- [ ] **Step 1: Create SWR feed hook**

Write `apps/web/src/hooks/use-feed.ts`:
```ts
import useSWR from "swr"

export function useFeed(circleId: string) {
  return useSWR(`/api/circles/${circleId}/feed`, fetcher, {
    refreshInterval: 4000, // 4s polling
  })
}
```

- [ ] **Step 2: Build post-header component**

Write `apps/web/src/components/feed/post-header.tsx`:
- Avatar (gradient background with emoji), author name (Bricolage Grotesque), timestamp
- Tool badge (e.g., "claude code" in JetBrains Mono)
- Post type badge: SHIPPED (purple), WIP (amber), LIVE (green gradient with shimmer)
- @see spec: Visual Design > Key Visual Elements

- [ ] **Step 3: Build post-body component**

Write `apps/web/src/components/feed/post-body.tsx`:
- Renders body text with `<strong>` support
- DM Sans, 14px, light weight, secondary color

- [ ] **Step 4: Build image-carousel component**

Write `apps/web/src/components/feed/image-carousel.tsx`:
- Horizontal scroll with `scroll-snap-type: x mandatory`
- Dot navigation with active dot elongated + glowing green
- Slide counter badge (e.g., "1 / 3")
- Touch/swipe friendly

- [ ] **Step 5: Build video-preview component**

Write `apps/web/src/components/feed/video-preview.tsx`:
- Video thumbnail/gradient background
- Centered play button (frosted glass circle)
- REC badge (top-left, red with blinking dot)
- Duration badge (bottom-right, monospace)
- On click: expand to video player

- [ ] **Step 6: Build live-embed component**

Write `apps/web/src/components/feed/live-embed.tsx`:
- iframe viewport (320px height) with green glow border
- INTERACTIVE badge (top-right)
- Toolbar: URL display, Open button, Copy link button
- Post card gets `glow-live` class for ambient green glow

- [ ] **Step 7: Build commit-bar component**

Write `apps/web/src/components/feed/commit-bar.tsx`:
- Horizontal strip: "+14 files / app/api/route.ts / 23 commits in 2h"
- JetBrains Mono, green for numbers, cyan for file paths
- Horizontally scrollable on overflow

- [ ] **Step 8: Build post-card wrapper**

Write `apps/web/src/components/feed/post-card.tsx`:
- Renders `post-header`, `post-body`, then the appropriate media component based on `post.type`
- Staggered fade-slide-in animation (`animation-delay` based on index)
- Hover: border brightens, subtle shadow lift
- Passes down to reactions/comments (placeholders until Task 8)

- [ ] **Step 9: Build circle feed page**

Write `apps/web/src/app/(feed)/[circleId]/page.tsx`:
- Uses `useFeed` hook to poll for posts
- Renders list of `PostCard` components
- Empty state: "No posts yet. Start building and share with /share"
- Placeholder for activity ticker (Task 9)

- [ ] **Step 10: Build create-post-dialog**

Write `apps/web/src/components/feed/create-post-dialog.tsx`:
- Dialog triggered by FAB (floating + button, bottom-right)
- Tabs: "Screenshot" (file upload), "Video" (file upload), "Live" (URL input)
- Upload progress indicator
- Post button

- [ ] **Step 11: Verify feed renders with test data**

Seed the database with test posts, run dev server, verify the feed looks correct with all post types.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add feed UI with post cards, carousel, video, and live embed"
```

---

### Task 8: Reactions + Comments

**Files:**
- Create: `apps/web/src/components/reactions/reaction-bar.tsx`, `apps/web/src/components/reactions/reaction-picker.tsx`, `apps/web/src/components/comments/comment-list.tsx`, `apps/web/src/components/comments/comment-row.tsx`, `apps/web/src/components/comments/comment-input.tsx`, `apps/web/src/app/api/posts/[id]/reactions/route.ts`, `apps/web/src/app/api/posts/[id]/comments/route.ts`, `apps/web/src/hooks/use-reactions.ts`
- Modify: `apps/web/src/components/feed/post-card.tsx` (wire in reactions/comments)
- Depends on: Task 6

- [ ] **Step 1: Write query functions for reactions and comments**

Add to `apps/web/src/lib/db/queries.ts`:
- `toggleReaction(postId, userId, emoji)` — add or remove reaction
- `getReactions(postId)` — reactions grouped by emoji with counts and user IDs
- `addComment(postId, authorId, body, isAi?)` — insert comment
- `getComments(postId)` — comments with author info, ordered by created_at

- [ ] **Step 2: Write failing tests**

Create `apps/web/__tests__/api/reactions.test.ts` and `apps/web/__tests__/api/comments.test.ts`:
- Test: toggle reaction on/off
- Test: reaction counts are correct
- Test: add comment
- Test: get comments returns with author info

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run __tests__/api/reactions.test.ts __tests__/api/comments.test.ts
```

- [ ] **Step 4: Implement route handlers**

Write `apps/web/src/app/api/posts/[id]/reactions/route.ts`:
- `POST` — toggle reaction (body: `{ emoji }`)
- Returns updated reaction counts

Write `apps/web/src/app/api/posts/[id]/comments/route.ts`:
- `GET` — list comments for post
- `POST` — add comment (body: `{ body }`)

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Build reaction-bar component**

Write `apps/web/src/components/reactions/reaction-bar.tsx`:
- Row of emoji pills with counts
- Your own reactions have green glow border
- Click to toggle (optimistic update)
- "+" button at end to open picker

Write `apps/web/src/hooks/use-reactions.ts`:
- SWR mutation with optimistic UI

- [ ] **Step 7: Build reaction-picker component**

Write `apps/web/src/components/reactions/reaction-picker.tsx`:
- Popover with common emoji grid (fire, heart-eyes, rocket, gem, mind-blown, etc.)
- Click to add reaction and close

- [ ] **Step 8: Build comment components**

Write `apps/web/src/components/comments/comment-row.tsx`:
- Avatar + author name (inline) + comment text
- AI comments get a sparkle badge

Write `apps/web/src/components/comments/comment-list.tsx`:
- Renders comment rows
- "View N more comments..." collapse/expand
- Inline comment input at bottom

Write `apps/web/src/components/comments/comment-input.tsx`:
- Simple text input, submit on Enter
- Subtle styling, placeholder "Write a comment..."

- [ ] **Step 9: Wire into post-card**

Modify `apps/web/src/components/feed/post-card.tsx`:
- Add `ReactionBar` after media
- Add `CommentList` at bottom of card

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add reactions with optimistic UI and comment threads"
```

---

### Task 9: Presence System

**Files:**
- Create: `apps/web/src/components/presence/top-bar.tsx`, `apps/web/src/components/presence/avatar-ring.tsx`, `apps/web/src/components/presence/activity-ticker.tsx`, `apps/web/src/app/api/presence/route.ts`, `apps/web/src/app/api/circles/[id]/presence/route.ts`, `apps/web/src/hooks/use-presence.ts`
- Modify: `apps/web/src/app/(feed)/layout.tsx` (replace placeholder top bar)
- Depends on: Task 5

- [ ] **Step 1: Write presence query functions**

Add to `apps/web/src/lib/db/queries.ts`:
- `updatePresence(userId, circleId, status, activity?)` — upsert presence row
- `getCirclePresence(circleId)` — all members with current status
- `getRecentActivity(circleId, since?)` — recent events for ticker

- [ ] **Step 2: Write failing tests**

Create `apps/web/__tests__/api/presence.test.ts`:
- Test: PUT `/api/presence` updates status
- Test: GET `/api/circles/[id]/presence` returns member statuses
- Test: stale presence (>5 min without update) shows as "away"

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement presence route handlers**

Write `apps/web/src/app/api/presence/route.ts`:
- `PUT` — update presence (body: `{ circleId, status, activity? }`)
- Supports Bearer token auth (plugin) and session auth (web)

Write `apps/web/src/app/api/circles/[id]/presence/route.ts`:
- `GET` — return all members with current status
- Mark members as "away" if `updated_at` > 5 minutes ago

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Build avatar-ring component**

Write `apps/web/src/components/presence/avatar-ring.tsx`:
- Circular avatar with gradient border ring
- `building` state: green-cyan gradient ring, pulsing animation
- `online` state: purple-pink gradient ring, static
- `away` state: dim gray ring
- Hover tooltip: "Name · building"

- [ ] **Step 7: Build activity-ticker component**

Write `apps/web/src/components/presence/activity-ticker.tsx`:
- Scrolling marquee: "Priya deployed · Marcus started new project · Alex hit 47 commits"
- Breathing pulse dot on left
- CSS `animation: scroll-left` with duplicated content for seamless loop
- Faded green background tint + subtle border

- [ ] **Step 8: Build top-bar with presence**

Write `apps/web/src/components/presence/top-bar.tsx`:
- Sticky, frosted glass background (`backdrop-filter: blur(24px)`)
- Left: vibecircle logo (Bricolage Grotesque, green-cyan gradient text)
- Center: presence cluster (avatar rings) + "N building" count
- Right: circle name badge

Write `apps/web/src/hooks/use-presence.ts`:
- SWR hook polling `/api/circles/[id]/presence` every 5 seconds

- [ ] **Step 9: Wire into feed layout**

Modify `apps/web/src/app/(feed)/layout.tsx`:
- Replace placeholder top bar with real `TopBar` component
- Add `ActivityTicker` below top bar, above feed content

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add presence system with pulsing avatar rings and activity ticker"
```

---

### Task 10: AI Explain Feature

**Files:**
- Create: `apps/web/src/components/comments/ai-explain-button.tsx`, `apps/web/src/app/api/posts/[id]/explain/route.ts`, `apps/web/src/lib/ai.ts`
- Modify: `apps/web/src/components/feed/post-card.tsx` (add explain button)
- Depends on: Task 8

**Important:** Read the AI SDK v6 docs before implementing. Use AI Gateway with OIDC auth, `streamText`, and `toUIMessageStreamResponse()`. See spec section "AI Explain Feature".

- [ ] **Step 1: Install AI SDK**

```bash
cd apps/web
npm install ai @ai-sdk/react
```

Note: AI Gateway is accessed via model strings like `'anthropic/claude-sonnet-4.6'` — no provider-specific SDK needed.

- [ ] **Step 2: Write AI explain logic**

Write `apps/web/src/lib/ai.ts`:
- `explainProject(repoUrl: string)` function
- Uses GitHub API to fetch: `package.json`, README, key source files (heuristic: look at `app/`, `src/`, `components/`)
- Builds a prompt: "Explain how this project was built. Summarize the architecture, highlight interesting patterns, note what's novel."
- Returns streamText result

- [ ] **Step 3: Implement explain route handler**

Write `apps/web/src/app/api/posts/[id]/explain/route.ts`:
- `POST` — fetches post, extracts `repo_url` from metadata
- Returns 404 if no `repo_url`
- Calls `explainProject(repoUrl)`
- Streams response back to client
- On completion, saves the full text as a comment with `is_ai: true`

- [ ] **Step 4: Build AI explain button**

Write `apps/web/src/components/comments/ai-explain-button.tsx`:
- Only renders if post metadata has `repo_url`
- Gradient green background tint, sparkle icon
- Text: "Explain how this was built · AI reads the code & commits"
- On click: calls explain API, shows streaming response in a new comment
- Loading state: pulsing animation
- Completed state: comment appears in thread with AI badge

- [ ] **Step 5: Install AI Elements for rendering**

```bash
cd apps/web
npx ai-elements@latest
```

Use `<MessageResponse>` from AI Elements to render the AI explanation with proper markdown, code highlighting, etc.

- [ ] **Step 6: Wire into post-card**

Modify `apps/web/src/components/feed/post-card.tsx`:
- Add `AiExplainButton` in the comments section, above comment input
- Only visible on posts with `metadata.repo_url`

- [ ] **Step 7: Test manually**

Create a test post with a public GitHub repo URL. Click "Explain how this was built". Verify the AI streams an explanation and it appears as a comment.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add AI Explain feature with streaming analysis of project repos"
```

---

### Task 11: Claude Code Plugin

**Files:**
- Create: all files under `packages/plugin/`
- Depends on: Task 6 (needs working posts API)

**Important:** Read Claude Code plugin docs before implementing. Plugin hooks use `${CLAUDE_PLUGIN_ROOT}` for file paths and `${CLAUDE_PLUGIN_DATA}` for persistent config.

- [ ] **Step 1: Create plugin config module**

Write `packages/plugin/scripts/lib/config.js`:
- `getConfig()` — reads `${CLAUDE_PLUGIN_DATA}/config.json`
- `setConfig(key, value)` — writes to config
- `isConfigured()` — checks if apiUrl + authToken are set
- Default config: `{ apiUrl: "", authToken: "", circleId: "", autoShare: true }`

- [ ] **Step 2: Create API client module**

Write `packages/plugin/scripts/lib/api-client.js`:
- `post(path, body)` — HTTP POST to `config.apiUrl + path` with Bearer token
- `put(path, body)` — HTTP PUT
- `get(path)` — HTTP GET
- Error handling: log errors to stderr, return null on failure

- [ ] **Step 3: Create presence update script**

Write `packages/plugin/scripts/update-presence.js`:
- Reads status from argv (`building` or `away`)
- Calls `PUT /api/presence` with `{ circleId, status }`
- Silent on success, logs errors to stderr
- Exits 0 always (don't block Claude Code)

- [ ] **Step 4: Create activity detection script**

Write `packages/plugin/scripts/detect-activity.js`:
- Runs `git log --oneline --since="5 minutes ago"` to check recent commits
- Runs `git diff --stat HEAD~1` to check file changes
- If significant activity detected (>3 commits or deploy detected), outputs a suggestion to stdout:
  "You've made 7 commits in the last session. Want to share this with your circle? Use /share to post."
- Uses `PostToolUse` stdout injection pattern

- [ ] **Step 5: Create screenshot capture script**

Write `packages/plugin/scripts/capture-screenshot.js`:
- Checks if a dev server is running (tries localhost:3000, 3001, 5173)
- If found: uses Playwright to take a screenshot
- If not found: checks for most recent Vercel deployment URL via `vercel ls --json`
- Saves screenshot to temp file, returns path
- Falls back gracefully if neither is available

- [ ] **Step 6: Create post-to-circle script**

Write `packages/plugin/scripts/post-to-circle.js`:
- Accepts args: `--type shipped|wip --body "message" --screenshot /path`
- Uploads screenshot via `POST /api/upload`
- Gathers metadata: `git remote get-url origin` for repo_url, `git log` for commits_count, `git diff --stat` for files_changed
- Calls `POST /api/circles/[id]/posts` with assembled post data
- Outputs success message: "Posted to your circle!"

- [ ] **Step 7: Create hooks.json**

Write `packages/plugin/hooks/hooks.json`:
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

- [ ] **Step 8: Create /share command**

Write `packages/plugin/commands/share.md`:
```yaml
---
name: share
description: Share what you're building with your vibecircle
allowed-tools: Bash, Read
user-invocable: true
---
```

Instructions for Claude:
1. Run `capture-screenshot.js` to get a screenshot
2. Ask the user for an optional note
3. Run `post-to-circle.js` with the screenshot and metadata
4. Confirm: "Shared to [circle-name]!"

- [ ] **Step 9: Create /circle command**

Write `packages/plugin/commands/circle.md`:
```yaml
---
name: circle
description: See who's online in your vibecircle and manage your circle
allowed-tools: Bash
user-invocable: true
---
```

Instructions for Claude:
1. Call `GET /api/circles/[id]/presence` via the API client
2. Display formatted presence: who's building, online, away
3. Show recent activity summary
4. If arg is "invite [email]", call the invite endpoint

- [ ] **Step 10: Test plugin locally**

Install plugin: `claude plugin install --dir packages/plugin`
Verify:
- SessionStart updates presence to "building"
- `/share` takes screenshot and posts to circle
- `/circle` shows presence info

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add Claude Code plugin with sharing, presence, and activity detection"
```

---

### Task 12: Polish, Landing Page, and README

**Files:**
- Create: `apps/web/src/app/page.tsx` (landing), `README.md`
- Modify: various components for visual polish
- Depends on: Tasks 7-11

- [ ] **Step 1: Build landing page**

Write `apps/web/src/app/page.tsx`:
- If authenticated: redirect to first circle's feed
- If not: show a beautiful landing page
- Hero: "See what your friends are building." in Bricolage Grotesque
- Ambient glow blobs, noise texture
- "Get started" button → login
- Brief feature highlights with Electric Pop styling

- [ ] **Step 2: Visual polish pass**

Review all components against the mockups:
- Verify animations: staggered post entry, ticker scroll, avatar pulse
- Check hover states on all interactive elements
- Verify glow effects on live posts
- Test dark theme consistency
- Verify mobile responsiveness (feed should be single-column, full-width)

- [ ] **Step 3: Write README**

Write root `README.md`:
- vibecircle logo / title
- "See what your friends are building."
- What it is (2-3 sentences)
- Screenshot of the feed
- Quick start (clone, install, configure, run)
- Plugin installation instructions
- Tech stack list
- Contributing section
- MIT License badge

- [ ] **Step 4: Add seed script for demo data**

Write `apps/web/scripts/seed.ts`:
- Creates sample users, a circle, and example posts of each type
- Useful for development and demoing

- [ ] **Step 5: Final integration test**

Full flow test:
1. Sign up via magic link
2. Create a circle
3. Share invite link
4. Install plugin, run `/share`
5. Verify post appears in feed
6. Add reaction and comment
7. Click "Explain how this was built"
8. Verify presence shows "building"

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add landing page, polish, README, and seed data"
```

---

## Environment Variables

The web app needs these env vars (set via `vercel env` or `.env.local`):

```
# Database
DATABASE_URL=           # Neon Postgres connection string

# Auth
AUTH_SECRET=            # Random secret for Auth.js
AUTH_RESEND_KEY=        # Resend API key for magic link emails
AUTH_GITHUB_ID=         # GitHub OAuth app client ID
AUTH_GITHUB_SECRET=     # GitHub OAuth app client secret

# Storage
BLOB_READ_WRITE_TOKEN=  # Vercel Blob token

# AI
VERCEL_OIDC_TOKEN=      # Auto-provisioned via vercel env pull
```

The plugin needs these in `${CLAUDE_PLUGIN_DATA}/config.json`:
```json
{
  "apiUrl": "https://vibecircle.vercel.app",
  "authToken": "user's auth token",
  "circleId": "active circle UUID"
}
```
