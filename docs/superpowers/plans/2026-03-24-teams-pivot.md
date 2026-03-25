# Teams Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make vibecircle compelling for work teams by adding a smart plugin (sentinel + ghost-writer + context engine running inside Claude Code), a human-readable feed with headlines and narrative arcs, and a Warm Editorial visual redesign.

**Architecture:** The plugin intelligence runs entirely inside Claude Code via prompt-based hooks — zero LLM cost for vibecircle. The server receives finished posts (headline + description + media + arc info) via REST API and stores them. The feed renders posts with AI-written headlines and descriptions readable by non-engineers. Related posts are grouped into arcs via a shared `arcId`.

**Tech Stack:** Next.js (App Router), Drizzle ORM + Neon Postgres, Tailwind v4, Claude Code Plugin SDK (prompt-based hooks), SWR, Bun

**Spec:** `docs/superpowers/specs/2026-03-24-teams-pivot-design.md`

---

## File Structure

### New Files
- `packages/plugin/hooks/stop-sentinel.md` — Prompt-based Stop hook: sentinel + ghost-writer + context engine
- `packages/plugin/hooks/session-start.md` — Prompt-based SessionStart hook: init session context, set presence
- `packages/plugin/hooks/session-end.md` — Prompt-based SessionEnd hook: clear session, set presence away
- `apps/web/src/app/api/circles/[id]/arcs/route.ts` — GET endpoint for arc listing
- `apps/web/src/components/feed/arc-indicator.tsx` — Arc badge + progress dots component

### Modified Files
- `apps/web/src/lib/db/schema.ts` — Add `headline`, `arcId`, `arcTitle`, `arcSequence` columns to posts
- `apps/web/src/lib/db/queries.ts` — Update `createPost` + `getFeed` to include new columns, add `getArcs` query
- `apps/web/src/app/api/circles/[id]/posts/route.ts` — Accept new fields, relax metadata validation
- `apps/web/src/app/api/circles/[id]/feed/route.ts` — Return new fields (automatic from query change)
- `apps/web/src/hooks/use-feed.ts` — Add `headline`, `arcId`, `arcTitle`, `arcSequence` to `FeedPost` interface
- `apps/web/src/components/feed/post-card.tsx` — Use headline, show arc indicator, remove CommitBar
- `apps/web/src/components/feed/post-header.tsx` — Warm Editorial redesign, remove tech tags, update badges
- `apps/web/src/components/feed/post-body.tsx` — Render headline + description (was just body)
- `apps/web/src/components/feed/feed-view.tsx` — Update skeleton + empty state for new design
- `apps/web/src/components/feed/commit-bar.tsx` — Remove (no longer displayed)
- `apps/web/src/app/globals.css` — Replace Electric Pop with Warm Editorial design tokens
- `apps/web/src/app/layout.tsx` — Update font imports (add serif, update body/display fonts)
- `packages/plugin/hooks/hooks.json` — Switch all hooks to prompt-based
- `packages/plugin/scripts/post-to-circle.js` — Send `headline`, `arcId`, `arcTitle`, `arcSequence`
- `packages/plugin/commands/share.md` — Use ghost-writer for description generation

---

## Task 1: Database Schema — Add Arc + Headline Columns

**Files:**
- Modify: `apps/web/src/lib/db/schema.ts:106-122`

- [ ] **Step 1: Add new columns to posts table**

In `schema.ts`, add 4 columns to the `posts` table after `metadata`:

```typescript
// In the posts pgTable definition, after the metadata line:
  headline: text("headline"),
  arcId: text("arc_id"),
  arcTitle: text("arc_title"),
  arcSequence: integer("arc_sequence"),
```

The full posts table should look like:
```typescript
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id")
    .references(() => circles.id)
    .notNull(),
  authorId: uuid("author_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(),
  body: text("body"),
  media: jsonb("media"),
  metadata: jsonb("metadata"),
  headline: text("headline"),
  arcId: text("arc_id"),
  arcTitle: text("arc_title"),
  arcSequence: integer("arc_sequence"),
  createdAt: timestamp("created_at").defaultNow(),
})
```

- [ ] **Step 2: Push schema to database**

Run: `cd apps/web && bun run db:push`
Expected: Schema changes applied (4 new nullable columns added to posts table)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/db/schema.ts
git commit -m "feat: add headline and arc columns to posts table"
```

---

## Task 2: Update Queries — createPost + getFeed + getArcs

**Files:**
- Modify: `apps/web/src/lib/db/queries.ts:144-277`

- [ ] **Step 1: Update createPost to accept new fields**

Replace the `createPost` function (lines 144-168):

```typescript
/** Create a post in a circle */
export async function createPost(
  circleId: string,
  authorId: string,
  data: {
    type: string
    body?: string | null
    media?: unknown[] | null
    metadata?: Record<string, unknown> | null
    headline?: string | null
    arcId?: string | null
    arcTitle?: string | null
    arcSequence?: number | null
  }
) {
  const [post] = await db
    .insert(posts)
    .values({
      circleId,
      authorId,
      type: data.type,
      body: data.body ?? null,
      media: data.media ?? null,
      metadata: data.metadata ?? null,
      headline: data.headline ?? null,
      arcId: data.arcId ?? null,
      arcTitle: data.arcTitle ?? null,
      arcSequence: data.arcSequence ?? null,
    })
    .returning()

  return post
}
```

- [ ] **Step 2: Update getFeed to return new fields**

In the `getFeed` function, update the select (around line 195) to include the new columns:

```typescript
  const rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      body: posts.body,
      media: posts.media,
      metadata: posts.metadata,
      headline: posts.headline,
      arcId: posts.arcId,
      arcTitle: posts.arcTitle,
      arcSequence: posts.arcSequence,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorImage: users.image,
    })
```

And update the enrichedPosts mapping (around line 260) to include them:

```typescript
  const enrichedPosts = feedRows.map((row) => ({
    id: row.id,
    type: row.type,
    body: row.body,
    media: row.media,
    metadata: row.metadata,
    headline: row.headline,
    arcId: row.arcId,
    arcTitle: row.arcTitle,
    arcSequence: row.arcSequence,
    createdAt: row.createdAt,
    author: {
      id: row.authorId,
      name: row.authorName,
      avatarUrl: row.authorAvatarUrl ?? row.authorImage,
    },
    reactionCounts: reactionMap.get(row.id) ?? {},
    commentCount: commentMap.get(row.id) ?? 0,
  }))
```

- [ ] **Step 3: Add getArcs query**

Add at the end of the Post Queries section (after `getPost`):

```typescript
/** Get active arcs for a circle — distinct arcIds with metadata */
export async function getArcs(circleId: string) {
  const rows = await db
    .select({
      arcId: posts.arcId,
      arcTitle: posts.arcTitle,
      authorId: posts.authorId,
      authorName: users.name,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.circleId, circleId), sql`${posts.arcId} IS NOT NULL`))
    .orderBy(desc(posts.createdAt))

  // Group by arcId, taking the latest post's info
  const arcMap = new Map<
    string,
    {
      arcId: string
      arcTitle: string | null
      authorId: string
      authorName: string | null
      postCount: number
      latestAt: Date | null
    }
  >()

  for (const row of rows) {
    if (!row.arcId) continue
    const existing = arcMap.get(row.arcId)
    if (existing) {
      existing.postCount++
    } else {
      arcMap.set(row.arcId, {
        arcId: row.arcId,
        arcTitle: row.arcTitle,
        authorId: row.authorId,
        authorName: row.authorName,
        postCount: 1,
        latestAt: row.createdAt,
      })
    }
  }

  return Array.from(arcMap.values())
}
```

- [ ] **Step 4: Verify build**

Run: `cd apps/web && bun run build`
Expected: Build succeeds (no type errors)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/db/queries.ts
git commit -m "feat: update queries for headlines, arcs, and arc listing"
```

---

## Task 3: Update Post Creation API

**Files:**
- Modify: `apps/web/src/app/api/circles/[id]/posts/route.ts`

- [ ] **Step 1: Accept new fields and relax metadata validation**

Replace the full route handler. Key changes:
- Accept `headline`, `arcId`, `arcTitle`, `arcSequence` in request body
- Make metadata validation warnings instead of errors (ghost-writer may not always have deploy_url)
- Pass new fields to `createPost`

```typescript
import { NextResponse } from "next/server"
import { createPost } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getAuthUserId } from "@/lib/api-auth"

const VALID_TYPES = ["shipped", "wip", "video", "live", "ambient"] as const

/** POST /api/circles/[id]/posts — create a post in a circle */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

  // Verify user is a member of this circle
  const [membership] = await db
    .select()
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, userId)
      )
    )
    .limit(1)

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this circle" },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Validate type
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid post type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  const post = await createPost(circleId, userId, {
    type: body.type,
    body: body.body ?? null,
    media: body.media ?? null,
    metadata: body.metadata ?? null,
    headline: body.headline ?? null,
    arcId: body.arcId ?? null,
    arcTitle: body.arcTitle ?? null,
    arcSequence: body.arcSequence != null ? Number(body.arcSequence) : null,
  })

  return NextResponse.json(post, { status: 201 })
}
```

Note: Metadata validation is removed. The ghost-writer sends what it has. Missing metadata fields are fine — the feed no longer displays commit counts or tech tags prominently.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/circles/[id]/posts/route.ts
git commit -m "feat: accept headline and arc fields in post creation, relax metadata validation"
```

---

## Task 4: Add Arcs API Endpoint

**Files:**
- Create: `apps/web/src/app/api/circles/[id]/arcs/route.ts`

- [ ] **Step 1: Create the arcs endpoint**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getArcs } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/** GET /api/circles/[id]/arcs — list active arcs */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

  const [membership] = await db
    .select()
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, session.user.id)
      )
    )
    .limit(1)

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this circle" },
      { status: 403 }
    )
  }

  const arcs = await getArcs(circleId)
  return NextResponse.json(arcs)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/circles/[id]/arcs/route.ts
git commit -m "feat: add arcs listing endpoint"
```

---

## Task 5: Update Feed Hook + Types

**Files:**
- Modify: `apps/web/src/hooks/use-feed.ts`

- [ ] **Step 1: Add new fields to FeedPost interface**

```typescript
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface PostMedia {
  type: "image" | "video"
  url: string
  caption?: string
}

export interface PostMetadata {
  repo_url?: string
  deploy_url?: string
  commits_count?: number
  files_changed?: number
  tech_tags?: string[]
}

export interface PostAuthor {
  id: string
  name: string | null
  avatarUrl: string | null
}

export interface FeedPost {
  id: string
  type: "shipped" | "wip" | "video" | "live" | "ambient"
  body: string | null
  headline: string | null
  arcId: string | null
  arcTitle: string | null
  arcSequence: number | null
  media: PostMedia[] | null
  metadata: PostMetadata | null
  createdAt: string
  author: PostAuthor
  reactionCounts: Record<string, number>
  commentCount: number
}

interface FeedResponse {
  posts: FeedPost[]
  nextCursor: string | null
}

export function useFeed(circleId: string) {
  return useSWR<FeedResponse>(
    circleId ? `/api/circles/${circleId}/feed` : null,
    fetcher,
    {
      refreshInterval: 4000,
    }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-feed.ts
git commit -m "feat: add headline and arc fields to FeedPost interface"
```

---

## Task 6: Warm Editorial Design System

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Replace Electric Pop tokens with Warm Editorial**

In `globals.css`, replace the `:root` block (lines 100-137) with:

```css
:root {
  /* --- Backgrounds --- */
  --ep-bg-base: #1a1816;
  --ep-bg-surface: #1f1c19;
  --ep-bg-card: #221f1b;
  --ep-bg-elevated: #2a2622;

  /* --- Accent Colors --- */
  --ep-accent-green: #c4956a;
  --ep-accent-cyan: #c4956a;
  --ep-accent-purple: #c4956a;
  --ep-accent-pink: #a0443a;
  --ep-accent-amber: #c4956a;

  /* --- Text --- */
  --ep-text-primary: #e8e0d4;
  --ep-text-secondary: #9a8e7d;
  --ep-text-muted: #7a6f60;
  --ep-text-dim: #4a4238;

  /* --- Borders --- */
  --ep-border-dim: rgba(255, 240, 220, 0.04);
  --ep-border-subtle: rgba(255, 240, 220, 0.08);
  --ep-border-medium: rgba(255, 240, 220, 0.12);

  /* --- Glow (subtle warm) --- */
  --ep-glow-green: rgba(196, 149, 106, 0.15);
  --ep-glow-cyan: rgba(196, 149, 106, 0.15);
  --ep-glow-purple: rgba(196, 149, 106, 0.15);

  /* --- Font families --- */
  --font-display-family: var(--font-newsreader), Georgia, serif;
  --font-body-family: var(--font-dm-sans), system-ui, sans-serif;
  --font-mono-family: var(--font-jetbrains), ui-monospace, monospace;

  /* shadcn radius base */
  --radius: 0.625rem;
}
```

Also update the `.dark` block (lines 143-175) to match:

```css
.dark {
  --background: #1a1816;
  --foreground: #e8e0d4;
  --card: #221f1b;
  --card-foreground: #e8e0d4;
  --popover: #221f1b;
  --popover-foreground: #e8e0d4;
  --primary: #c4956a;
  --primary-foreground: #1a1816;
  --secondary: #2a2622;
  --secondary-foreground: #e8e0d4;
  --muted: #1f1c19;
  --muted-foreground: #9a8e7d;
  --accent: #2a2622;
  --accent-foreground: #e8e0d4;
  --destructive: #a0443a;
  --border: rgba(255, 240, 220, 0.08);
  --input: rgba(255, 240, 220, 0.12);
  --ring: #c4956a;
  --chart-1: #c4956a;
  --chart-2: #8b6f4e;
  --chart-3: #a0443a;
  --chart-4: #7a6f60;
  --chart-5: #e8e0d4;
  --sidebar: #1f1c19;
  --sidebar-foreground: #e8e0d4;
  --sidebar-primary: #c4956a;
  --sidebar-primary-foreground: #1a1816;
  --sidebar-accent: #2a2622;
  --sidebar-accent-foreground: #e8e0d4;
  --sidebar-border: rgba(255, 240, 220, 0.08);
  --sidebar-ring: #c4956a;
}
```

- [ ] **Step 2: Update font imports in layout.tsx**

Read `apps/web/src/app/layout.tsx` and:
- Add `import { Newsreader } from "next/font/google"` (or the serif font chosen during implementation via @frontend-design)
- Configure the font with `variable: "--font-newsreader"` and `subsets: ["latin"]`
- Add the CSS variable class to the `<body>` or `<html>` tag

- [ ] **Step 3: Install the serif font**

Run: `cd apps/web && bun add @fontsource/newsreader` (if not using next/font/google)

Or if using next/font/google (preferred):
```typescript
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
})
```

- [ ] **Step 4: Verify dev server renders with new colors**

Run: `cd apps/web && bun run dev`
Expected: App loads with dark brown-black background, warm cream text

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat: replace Electric Pop with Warm Editorial design system"
```

---

## Task 7: Redesign Feed Components

**Files:**
- Modify: `apps/web/src/components/feed/post-header.tsx`
- Modify: `apps/web/src/components/feed/post-body.tsx`
- Create: `apps/web/src/components/feed/arc-indicator.tsx`
- Modify: `apps/web/src/components/feed/post-card.tsx`
- Modify: `apps/web/src/components/feed/feed-view.tsx`

This is the visual redesign task. **Use @frontend-design skill** for the actual implementation to ensure the components look polished and distinctive, not generic.

- [ ] **Step 1: Create ArcIndicator component**

`apps/web/src/components/feed/arc-indicator.tsx`:

```tsx
"use client"

interface ArcIndicatorProps {
  arcTitle: string
  arcSequence: number
}

export function ArcIndicator({ arcTitle, arcSequence }: ArcIndicatorProps) {
  // Progress dots — filled up to current sequence
  const dots = Array.from({ length: Math.min(arcSequence, 6) }, (_, i) => i)

  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border-dim bg-bg-base/60 px-3 py-2">
      <div className="flex gap-1">
        {dots.map((i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i === arcSequence - 1
                ? "bg-accent-green shadow-[0_0_4px_var(--color-glow-green)]"
                : "bg-accent-green/50"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] text-text-muted">
        Part of{" "}
        <span className="font-medium text-accent-green">{arcTitle}</span>
        {" · "}
        {ordinal(arcSequence)} update
      </span>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
```

- [ ] **Step 2: Update PostHeader — Warm Editorial style**

Replace `post-header.tsx`. Key changes:
- Remove tech tags display
- Update avatar gradients to warm tones (copper, terracotta, amber)
- Update type badges to warm palette
- Add "{Name} shipped" / "{Name} is building" narrative header
- Show arc context in subheader

```tsx
"use client"

import type { FeedPost } from "@/hooks/use-feed"

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function avatarGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, #c4956a, #8b6f4e)",
    "linear-gradient(135deg, #a0443a, #c4956a)",
    "linear-gradient(135deg, #8b6f4e, #4a4238)",
    "linear-gradient(135deg, #c4956a, #a0443a)",
    "linear-gradient(135deg, #7a6f60, #c4956a)",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

const typeVerb: Record<string, string> = {
  shipped: "shipped",
  wip: "is building",
  video: "shared",
  live: "launched",
  ambient: "updated",
}

const typeBadgeConfig: Record<string, { label: string; className: string }> = {
  shipped: {
    label: "SHIPPED",
    className: "bg-accent-green/15 text-accent-green border-accent-green/25",
  },
  wip: {
    label: "WIP",
    className: "bg-text-muted/10 text-text-secondary border-text-muted/20",
  },
  live: {
    label: "LIVE",
    className: "bg-accent-green text-bg-base border-transparent font-bold",
  },
  video: {
    label: "VIDEO",
    className: "bg-accent-pink/12 text-accent-pink border-accent-pink/20",
  },
  ambient: {
    label: "UPDATE",
    className: "bg-text-dim/10 text-text-muted border-border-subtle",
  },
}

interface PostHeaderProps {
  post: FeedPost
}

export function PostHeader({ post }: PostHeaderProps) {
  const { author, createdAt, type, arcTitle } = post
  const badge = typeBadgeConfig[type] ?? typeBadgeConfig.ambient
  const gradient = avatarGradient(author.name ?? "?")
  const verb = typeVerb[type] ?? "posted"

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full p-[2px]"
            style={{ background: gradient }}
          >
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.name ?? ""}
                className="h-full w-full rounded-full object-cover ring-2 ring-bg-card"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card font-display text-sm font-bold text-text-primary">
                {(author.name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[15px] font-semibold leading-tight text-text-primary">
              {author.name ?? "Anonymous"} {verb}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-muted">
            <span>{timeAgo(createdAt)}</span>
            {arcTitle && (
              <>
                <span>·</span>
                <span className="text-accent-green">{arcTitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
      >
        {badge.label}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Update PostBody — headline + description**

Replace `post-body.tsx`:

```tsx
"use client"

interface PostBodyProps {
  headline: string | null
  body: string | null
}

export function PostBody({ headline, body }: PostBodyProps) {
  if (!headline && !body) return null

  return (
    <div className="mt-3">
      {headline && (
        <h3 className="font-display text-[17px] font-semibold leading-snug text-text-primary">
          {headline}
        </h3>
      )}
      {body && (
        <p className={`${headline ? "mt-1.5" : ""} text-[14px] leading-relaxed text-text-secondary`}>
          {body}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update PostCard — use headline, add arc, remove CommitBar**

Replace `post-card.tsx`:

```tsx
"use client"

import type { FeedPost } from "@/hooks/use-feed"
import type { ReactionGroup } from "@/hooks/use-reactions"
import { PostHeader } from "./post-header"
import { PostBody } from "./post-body"
import { ArcIndicator } from "./arc-indicator"
import { ImageCarousel } from "./image-carousel"
import { VideoPreview } from "./video-preview"
import { LiveEmbed } from "./live-embed"
import { ReactionBar } from "@/components/reactions/reaction-bar"
import { CommentList } from "@/components/comments/comment-list"

interface PostCardProps {
  post: FeedPost
  index: number
  userId?: string
}

export function PostCard({ post, index, userId }: PostCardProps) {
  const images = (post.media ?? []).filter((m) => m.type === "image")
  const video = (post.media ?? []).find((m) => m.type === "video")
  const isLive = post.type === "live"
  const delay = Math.min(index * 60, 300)

  const initialReactions: ReactionGroup[] = Object.entries(
    post.reactionCounts
  ).map(([emoji, count]) => ({
    emoji,
    count,
    userIds: [],
  }))

  return (
    <article
      className={`rounded-[16px] border bg-bg-card p-5 transition-all duration-300 ${
        isLive
          ? "border-accent-green/20 shadow-[0_0_30px_rgba(196,149,106,0.04)]"
          : "border-border-dim hover:border-border-subtle"
      }`}
      style={{
        animation: `post-fade-in 0.5s ease-out ${delay}ms both`,
      }}
    >
      <PostHeader post={post} />
      <PostBody headline={post.headline} body={post.body} />

      {/* Media */}
      {post.type === "live" && post.metadata?.deploy_url ? (
        <LiveEmbed url={post.metadata.deploy_url} />
      ) : video ? (
        <VideoPreview video={video} />
      ) : images.length > 0 ? (
        <ImageCarousel images={images} />
      ) : null}

      {/* Arc indicator */}
      {post.arcId && post.arcTitle && post.arcSequence != null && (
        <ArcIndicator
          arcTitle={post.arcTitle}
          arcSequence={post.arcSequence}
        />
      )}

      {/* Reactions */}
      <div className="mt-3 border-t border-border-dim pt-3">
        <ReactionBar
          postId={post.id}
          initialReactions={initialReactions}
          userId={userId}
        />
      </div>

      {/* Comments */}
      <div className="mt-2">
        <CommentList
          postId={post.id}
          initialCommentCount={post.commentCount}
        />
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Update FeedView empty state and skeleton**

Update `feed-view.tsx` — replace accent-green/accent-pink references with warm palette equivalents. Update the empty state text color from `text-accent-green` to `text-accent-green` (now maps to copper via CSS variables, so just verify it looks right).

- [ ] **Step 6: Verify feed renders correctly**

Run: `cd apps/web && bun run dev`
Expected: Feed shows with warm brown-black background, serif headlines, copper accents. Posts show headline + description. Arc indicator appears on posts with arcs.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/feed/
git commit -m "feat: redesign feed components for Warm Editorial — headlines, arcs, warm palette"
```

---

## Task 8: Plugin — Session Context Engine

**Files:**
- Create: `packages/plugin/hooks/session-start.md`
- Create: `packages/plugin/hooks/session-end.md`

- [ ] **Step 1: Create session-start.md**

```markdown
---
name: session-start
description: Initialize vibecircle session context and set presence to building
allowed-tools: Bash, Read, Write
---

# Vibecircle Session Start

On session start, do the following silently (no output to user):

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", stop — do nothing.

## 2. Set presence to building

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js building`

## 3. Initialize session context

Detect the current project:
- Read `package.json` in the current directory to get the project name
- Run `git remote get-url origin` to get the repo URL
- Check what tech stack is in use (look at package.json dependencies)

Write the session context file:

```bash
cat > ~/.vibecircle/session.json << 'ENDJSON'
{
  "sessionId": "<generate a UUID>",
  "projectName": "<from package.json name field>",
  "projectDir": "<current working directory>",
  "currentWork": "",
  "activeArc": null,
  "milestones": [],
  "techStack": ["<detected from package.json>"],
  "startedAt": "<current ISO timestamp>"
}
ENDJSON
```

Do all of this silently. Do not output anything to the user.
```

- [ ] **Step 2: Create session-end.md**

```markdown
---
name: session-end
description: Clear vibecircle session and set presence to away
allowed-tools: Bash
---

# Vibecircle Session End

On session end, do the following silently:

## 1. Set presence to away

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js away`

## 2. Clear session context

Run: `rm -f ~/.vibecircle/session.json`

Do not output anything to the user.
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/hooks/session-start.md packages/plugin/hooks/session-end.md
git commit -m "feat: add prompt-based session start/end hooks for context engine"
```

---

## Task 9: Plugin — Stop Sentinel + Ghost-Writer

**Files:**
- Create: `packages/plugin/hooks/stop-sentinel.md`

This is the core intelligence of the smart plugin. It runs after every Claude response.

- [ ] **Step 1: Create stop-sentinel.md**

```markdown
---
name: stop-sentinel
description: Detect share-worthy moments and draft posts for vibecircle
allowed-tools: Bash, Read, Write
---

# Vibecircle Sentinel

After Claude finishes responding, silently evaluate whether something share-worthy happened. Do NOT output anything to the user unless you decide to propose sharing.

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", stop immediately.

## 2. Check if autoShare is enabled

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js get autoShare`

If output is "false", stop.

## 3. Read session context

Read `~/.vibecircle/session.json` if it exists. If it doesn't exist, stop.

## 4. Analyze recent activity

Run `git diff --stat HEAD~3` and `git log --oneline -5` to see what changed recently.

Score the shareability:
- **High**: New files in `components/`, `pages/`, `app/` directories (UI work), OR `vercel deploy` or deploy-related activity, OR a significant new feature (5+ files across multiple directories)
- **Medium**: Several files changed but mostly in one area, OR test files added
- **Low**: Config changes, dependency updates, small fixes
- **Skip**: No git changes, or only `.lock` files / `.env` changes

If score is Low or Skip, silently update the session context (step 5) and stop.

## 5. Update session context

Read the current `~/.vibecircle/session.json`. Update:
- `currentWork`: Brief description of what's being built based on recent git activity and conversation context
- `activeArc`: If the work is a continuation of the same feature, keep the existing arc. If it's clearly new work, create a new arc with a new UUID and descriptive title.
- Increment `activeArc.sequence` if continuing an arc.

Write the updated file back.

If score was Low or Skip, stop here.

## 6. Ghost-Writer — draft the post

Based on the git diff, session context, and conversation context, write:

1. **headline**: One line, plain English, no jargon. A PM should understand it.
   - Good: "Built a settings page with dark mode toggle"
   - Bad: "Refactored SettingsProvider component tree"

2. **body**: 2-3 sentences describing what was built and why it matters. Write for a non-technical audience.
   - Good: "Users can now customize their experience — toggle dark mode, set notification frequency, and manage connected accounts. Includes automatic system preference detection."
   - Bad: "Added DarkModeContext with useMediaQuery hook for prefers-color-scheme detection."

3. **type**: "shipped" if a deploy happened, "wip" otherwise

4. **media**: If UI work was detected, try to capture a screenshot:
   Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-screenshot.js`
   Save the output path if non-empty.

## 7. Show preview and ask for approval

Show the user a preview:

```
vibecircle — Ready to share:

  **[headline]**
  [body]

  [📸 Screenshot attached · Part of "[arcTitle]"]

Share this? [Y]es · [E]dit · [S]kip
```

Wait for the user's response:
- **Y/yes**: Post it (step 8)
- **E/edit**: Ask what they'd like to change, update the headline/body, then post
- **S/skip/no**: Add to milestones as "skipped", stop

## 8. Post to circle

Build the command:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
  --type <type> \
  --body "<body>" \
  --headline "<headline>" \
  --arc-id "<arcId>" \
  --arc-title "<arcTitle>" \
  --arc-sequence <arcSequence>
```

If a screenshot was captured, add: `--screenshot <path>`

Run the command. If successful, add the headline to `milestones` in session.json.

Tell the user: "Shared to your circle!"
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/hooks/stop-sentinel.md
git commit -m "feat: add stop sentinel + ghost-writer prompt hook"
```

---

## Task 10: Plugin — Update hooks.json to Prompt-Based

**Files:**
- Modify: `packages/plugin/hooks/hooks.json`

- [ ] **Step 1: Switch all hooks to prompt-based**

Replace the entire `hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.md"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "${CLAUDE_PLUGIN_ROOT}/hooks/session-end.md"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "${CLAUDE_PLUGIN_ROOT}/hooks/stop-sentinel.md"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/hooks/hooks.json
git commit -m "feat: switch all plugin hooks to prompt-based for smart sentinel"
```

---

## Task 11: Plugin — Update post-to-circle.js for New Fields

**Files:**
- Modify: `packages/plugin/scripts/post-to-circle.js`

- [ ] **Step 1: Add headline and arc arguments**

Update `parseArgs` to accept `--headline`, `--arc-id`, `--arc-title`, `--arc-sequence`:

```javascript
function parseArgs(argv) {
  const args = {
    type: "wip",
    body: "",
    screenshot: "",
    headline: "",
    arcId: "",
    arcTitle: "",
    arcSequence: "",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--type" && argv[i + 1]) {
      args.type = argv[++i];
    } else if (argv[i] === "--body" && argv[i + 1]) {
      args.body = argv[++i];
    } else if (argv[i] === "--screenshot" && argv[i + 1]) {
      args.screenshot = argv[++i];
    } else if (argv[i] === "--headline" && argv[i + 1]) {
      args.headline = argv[++i];
    } else if (argv[i] === "--arc-id" && argv[i + 1]) {
      args.arcId = argv[++i];
    } else if (argv[i] === "--arc-title" && argv[i + 1]) {
      args.arcTitle = argv[++i];
    } else if (argv[i] === "--arc-sequence" && argv[i + 1]) {
      args.arcSequence = argv[++i];
    }
  }
  return args;
}
```

- [ ] **Step 2: Include new fields in the POST payload**

Update the payload construction in `main()`:

```javascript
  const payload = {
    type: args.type,
    body: args.body || null,
    media: media.length > 0 ? media : null,
    metadata: metadata,
    headline: args.headline || null,
    arcId: args.arcId || null,
    arcTitle: args.arcTitle || null,
    arcSequence: args.arcSequence ? parseInt(args.arcSequence, 10) : null,
  };
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/scripts/post-to-circle.js
git commit -m "feat: send headline and arc fields from plugin to API"
```

---

## Task 12: Plugin — Update /share Command

**Files:**
- Modify: `packages/plugin/commands/share.md`

- [ ] **Step 1: Rewrite share command to use ghost-writer**

Replace the entire `share.md`:

```markdown
---
name: share
description: Share what you're building with your vibecircle
allowed-tools: Bash, Read, Write
user-invocable: true
---

# /share — Share what you're building

When the user invokes `/share`, follow these steps:

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", tell the user how to set up and stop.

## 2. Read session context

Read `~/.vibecircle/session.json` if it exists. This gives you context about the current project, active arc, and what's been shared already.

## 3. Capture a screenshot

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-screenshot.js`

Save the output path for later. Don't worry if it's empty.

## 4. Generate the post draft

Based on the conversation context, recent git activity (`git diff --stat HEAD~3`, `git log --oneline -5`), and session context, write:

- **headline**: One line, plain English, no jargon. Anyone should understand it.
- **body**: 2-3 sentences describing what was built and why it matters. Write for a non-technical audience.
- **type**: Ask the user — "shipped" or "wip" (default wip)

If there's an active arc in session.json that matches the current work, use it. Otherwise, create a new arc with a descriptive title.

## 5. Show preview

Show the user:

```
Ready to share:

  **[headline]**
  [body]

  Type: [shipped/wip] · [📸 Screenshot if captured] · [Arc: "title" if applicable]

Look good? You can edit the headline or description, change the type, or just say "send it".
```

## 6. Post to the circle

After the user approves (or edits), run:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js --type <type> --body "<body>" --headline "<headline>" --arc-id "<arcId>" --arc-title "<arcTitle>" --arc-sequence <arcSequence>
```

Add `--screenshot <path>` if a screenshot was captured.

## 7. Confirm

If successful, tell the user: "Shared to your circle!"

Update `~/.vibecircle/session.json` milestones with the headline.
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/commands/share.md
git commit -m "feat: update /share command to use ghost-writer for descriptions"
```

---

## Task 13: Landing Page + Remaining UI — Warm Editorial Polish

**Files:**
- Various landing page and layout components

This task applies the Warm Editorial palette to everything outside the feed — landing page, login, setup, circle creation, etc. **Use @frontend-design skill** for this to ensure the visual quality matches the feed.

- [ ] **Step 1: Audit all component files using Electric Pop colors**

Run: `grep -r "00ff88\|00ccff\|a855f7\|ff0066\|fbbf24\|050505\|0b0b0b\|0e0e0e" apps/web/src/components/ apps/web/src/app/ --include="*.tsx" -l`

This gives you the list of files that still reference old Electric Pop colors directly (not through CSS variables).

- [ ] **Step 2: Update each file to use CSS variable classes**

Replace hardcoded hex values with Tailwind classes that reference the CSS variables (which now point to warm editorial tokens). Files referencing CSS variables like `text-accent-green` or `bg-bg-card` are already correct — they'll automatically pick up the new values.

Files with hardcoded hex values need manual updates.

- [ ] **Step 3: Run the landing page through @frontend-design**

The landing page (`apps/web/src/components/landing/hero.tsx`) needs the most attention — it was designed for Electric Pop neon aesthetic and needs a complete visual refresh for Warm Editorial.

- [ ] **Step 4: Verify all pages**

Run: `cd apps/web && bun run dev`
Visit: `/`, `/login`, `/new-circle`, `/setup`, and a circle feed page.
Expected: Consistent Warm Editorial aesthetic across all pages.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat: apply Warm Editorial design to all pages and components"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Push schema changes**

Run: `cd apps/web && bun run db:push`
Expected: Schema updates applied

- [ ] **Step 2: Start dev server and verify feed**

Run: `cd apps/web && bun run dev`
Expected: Feed loads with warm editorial design, existing posts render (with null headlines)

- [ ] **Step 3: Test post creation with new fields**

```bash
curl -X POST http://localhost:3000/api/circles/<CIRCLE_ID>/posts \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "shipped",
    "headline": "New settings page with dark mode",
    "body": "Users can now toggle dark mode, set notification frequency, and manage accounts. Includes system preference detection.",
    "metadata": {"repo_url": "https://github.com/test/repo"},
    "arcId": "arc_test123",
    "arcTitle": "Settings Redesign",
    "arcSequence": 1
  }'
```
Expected: 201 response with all new fields populated

- [ ] **Step 4: Verify post appears in feed with headline and arc**

Refresh the feed page. The new post should show:
- Serif headline: "New settings page with dark mode"
- Description body
- Arc indicator with progress dot and "Part of Settings Redesign · 1st update"
- No commit bar

- [ ] **Step 5: Test plugin locally**

Install the plugin: `/plugin install <path-to-packages/plugin>`
Run: `/share`
Expected: Ghost-writer generates a headline and description, shows preview, posts on approval

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: teams pivot — smart plugin, human-readable feed, warm editorial design"
```
