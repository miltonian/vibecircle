# Feed + Live Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the feed with a main column + live sidebar layout featuring three card variants (hero/standard/compact), real-time presence, arc navigation, and members.

**Architecture:** The feed layout widens from 620px to 960px with a sticky sidebar. Post cards render differently based on type and media. A new `useArcs` hook fetches arc data for sidebar filtering. The sidebar combines presence (existing), arcs (new), and members (moved from above feed). Use @frontend-design skill for the visual implementation to ensure the components match the mockup quality.

**Tech Stack:** Next.js (App Router), React, SWR, Tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-25-feed-sidebar-redesign.md`
**Mockup:** `.superpowers/brainstorm/80293-1774541581/content/feed-f-refined.html`

---

## File Structure

### New Files
- `apps/web/src/components/feed/feed-sidebar.tsx` — Sidebar with presence, arcs, members
- `apps/web/src/hooks/use-arcs.ts` — SWR hook for `/api/circles/{id}/arcs`

### Modified Files
- `apps/web/src/app/(feed)/layout.tsx` — Widen max-width from 620px to 960px
- `apps/web/src/app/(feed)/[circleId]/page.tsx` — Add sidebar, remove MembersPanel
- `apps/web/src/components/feed/post-card.tsx` — Three card variants based on type/media
- `apps/web/src/components/feed/feed-view.tsx` — Remove InstallBanner (moves to sidebar or stays), adjust for new layout
- `apps/web/src/components/presence/top-bar.tsx` — Update max-width to 960px

### Removed
- `apps/web/src/components/feed/members-panel.tsx` — Functionality moves into sidebar

---

## Task 1: Widen Layout + Top Bar

**Files:**
- Modify: `apps/web/src/app/(feed)/layout.tsx`
- Modify: `apps/web/src/components/presence/top-bar.tsx`

- [ ] **Step 1: Update feed layout max-width**

In `apps/web/src/app/(feed)/layout.tsx`, change the main content max-width from 620 to 960:

```tsx
      {/* Main content — 960px for feed + sidebar */}
      <main className="relative z-10 mx-auto px-4 py-8" style={{ maxWidth: 960 }}>
        {children}
      </main>
```

- [ ] **Step 2: Update top bar max-width**

In `apps/web/src/components/presence/top-bar.tsx`, change the header inner div max-width from 620 to 960:

```tsx
        <div className="mx-auto flex h-14 items-center justify-between px-4" style={{ maxWidth: 960 }}>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(feed)/layout.tsx apps/web/src/components/presence/top-bar.tsx
git commit -m "feat: widen feed layout from 620px to 960px for sidebar"
```

---

## Task 2: useArcs Hook

**Files:**
- Create: `apps/web/src/hooks/use-arcs.ts`

- [ ] **Step 1: Create the hook**

```typescript
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface Arc {
  arcId: string
  arcTitle: string | null
  authorId: string
  authorName: string | null
  postCount: number
  latestAt: string | null
}

export function useArcs(circleId: string | null) {
  return useSWR<Arc[]>(
    circleId ? `/api/circles/${circleId}/arcs` : null,
    fetcher,
    { refreshInterval: 30000 }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-arcs.ts
git commit -m "feat: add useArcs hook for sidebar arc navigation"
```

---

## Task 3: Feed Sidebar Component

**Files:**
- Create: `apps/web/src/components/feed/feed-sidebar.tsx`

- [ ] **Step 1: Create the sidebar**

This is the main new component. It has three sections: presence, arcs, and members. It accepts `circleId` and an `onArcFilter` callback. Use @frontend-design skill to implement this matching the mockup at `.superpowers/brainstorm/80293-1774541581/content/feed-f-refined.html`.

The sidebar should:
- Use `usePresence(circleId)` for the "Building now" section (already exists)
- Use `useArcs(circleId)` for the "Arcs" section
- Fetch members from `/api/circles/${circleId}/members` via SWR
- Be sticky (`position: sticky; top: 76px; align-self: flex-start`)
- Be 220px wide
- Hidden on mobile (< 768px)
- Follow the Warm Editorial design system

```tsx
"use client"

import useSWR from "swr"
import { usePresence } from "@/hooks/use-presence"
import { useArcs } from "@/hooks/use-arcs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Member {
  userId: string
  name: string | null
  avatarUrl: string | null
  image: string | null
  role: string
  hasPlugin: boolean
}

interface FeedSidebarProps {
  circleId: string
  selectedArc: string | null
  onArcSelect: (arcId: string | null) => void
}

export function FeedSidebar({ circleId, selectedArc, onArcSelect }: FeedSidebarProps) {
  const { data: presenceData } = usePresence(circleId)
  const { data: arcs } = useArcs(circleId)
  const { data: members } = useSWR<Member[]>(`/api/circles/${circleId}/members`, fetcher)

  const presenceMembers = presenceData?.members ?? []
  const statusOrder: Record<string, number> = { building: 0, online: 1, away: 2 }
  const sortedPresence = [...presenceMembers].sort(
    (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  )

  return (
    <aside className="hidden w-[220px] shrink-0 md:block" style={{ position: "sticky", top: 76, alignSelf: "flex-start" }}>
      {/* Building now */}
      <div className="mb-6">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Building now
        </div>
        {sortedPresence.map((m) => (
          <div key={m.userId} className="flex items-center gap-2 py-1.5">
            <div
              className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                m.status === "building"
                  ? "bg-accent-green shadow-[0_0_6px_var(--color-glow-green)]"
                  : "bg-text-dim"
              }`}
            />
            <span className={`text-xs font-medium ${m.status === "building" ? "text-text-primary" : "text-text-muted"}`}>
              {m.name ?? "Anonymous"}
            </span>
            <span className="ml-auto text-[10px] text-text-muted">
              {timeAgoShort(m.updatedAt)}
            </span>
          </div>
        ))}
        {sortedPresence.length === 0 && (
          <div className="text-[11px] text-text-dim">No one online</div>
        )}
      </div>

      <hr className="mb-4 border-border-dim" />

      {/* Arcs */}
      <div className="mb-6">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Arcs
        </div>
        <button
          onClick={() => onArcSelect(null)}
          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
            selectedArc === null ? "bg-accent-green/[0.06] text-text-primary" : "text-accent-green hover:bg-bg-elevated"
          }`}
        >
          All posts
        </button>
        {(arcs ?? []).map((arc) => (
          <button
            key={arc.arcId}
            onClick={() => onArcSelect(arc.arcId)}
            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              selectedArc === arc.arcId ? "bg-accent-green/[0.06] text-text-primary" : "text-accent-green hover:bg-bg-elevated"
            }`}
          >
            <span className="font-medium">{arc.arcTitle ?? "Untitled"}</span>
            <span className="text-text-dim">{arc.postCount}</span>
          </button>
        ))}
      </div>

      <hr className="mb-4 border-border-dim" />

      {/* Members */}
      <div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Members · {members?.length ?? 0}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(members ?? []).map((m) => (
            <div key={m.userId} className="flex items-center gap-1.5 rounded-md bg-bg-elevated px-2 py-1">
              {m.avatarUrl || m.image ? (
                <img src={m.avatarUrl || m.image || ""} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-green/10 text-[8px] font-bold text-accent-green">
                  {(m.name?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <span className="text-[10px] text-text-secondary">{m.name ?? "?"}</span>
              {m.hasPlugin ? (
                <div className="h-1 w-1 rounded-full bg-accent-green" />
              ) : (
                <span className="text-[8px] text-text-dim">no plugin</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function timeAgoShort(dateStr: string | null): string {
  if (!dateStr) return ""
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/feed/feed-sidebar.tsx
git commit -m "feat: add feed sidebar with presence, arcs, and members"
```

---

## Task 4: Post Card Variants (Hero / Standard / Compact)

**Files:**
- Modify: `apps/web/src/components/feed/post-card.tsx`

- [ ] **Step 1: Rewrite post-card with three variants**

Read the current file first. Replace with a version that renders different layouts based on post type and media. Use @frontend-design skill for the visual quality.

The logic:
- `type === "shipped"` AND `media` has images → **Hero card** (full-width image, large headline)
- `type === "shipped"` without media, or any post with media → **Standard card** (side thumbnail if media exists)
- `type === "wip"` or `type === "ambient"` → **Compact card** (smaller avatar, inline text, no headline)

Key visual changes from current:
- Hero card: screenshot takes full card width (240px height), badge overlaid, "Try it live" button
- Compact card: 26px avatar, no headline element, just body text, no reaction bar
- Entrance animation: `fadeInUp` with stagger

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

function getCardVariant(post: FeedPost): "hero" | "standard" | "compact" {
  const hasImages = (post.media ?? []).some((m) => m.type === "image")
  if (post.type === "shipped" && hasImages) return "hero"
  if (post.type === "wip" || post.type === "ambient") return "compact"
  return "standard"
}

export function PostCard({ post, index, userId }: PostCardProps) {
  const variant = getCardVariant(post)
  const images = (post.media ?? []).filter((m) => m.type === "image")
  const video = (post.media ?? []).find((m) => m.type === "video")
  const delay = Math.min(index * 60, 300)

  const initialReactions: ReactionGroup[] = Object.entries(
    post.reactionCounts
  ).map(([emoji, count]) => ({
    emoji,
    count,
    userIds: [],
  }))

  if (variant === "compact") {
    return (
      <article
        className="rounded-xl border border-border-dim bg-bg-card px-4 py-3.5 transition-all duration-200 hover:border-border-subtle"
        style={{ animation: `post-fade-in 0.4s ease-out ${delay}ms both` }}
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="relative shrink-0">
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full p-[1.5px]"
              style={{ background: "linear-gradient(135deg, #a0443a, #c4956a)" }}
            >
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt="" className="h-full w-full rounded-full object-cover ring-1 ring-bg-card" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card text-[10px] font-bold text-text-primary">
                  {(post.author.name?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span className="text-[13px] font-medium text-text-primary">{post.author.name ?? "Anonymous"}</span>
          <span className="text-[12px] text-text-muted">{post.type === "wip" ? "is building" : "posted"}</span>
          <span className="ml-auto text-[10px] text-text-dim">{timeAgo(post.createdAt)}</span>
        </div>
        <div className="text-[13px] leading-relaxed text-text-secondary">{post.body}</div>
      </article>
    )
  }

  if (variant === "hero") {
    return (
      <article
        className="overflow-hidden rounded-2xl border border-accent-green/10 bg-bg-card transition-all duration-200 hover:border-accent-green/15"
        style={{ animation: `post-fade-in 0.4s ease-out ${delay}ms both` }}
      >
        {/* Hero image */}
        {images.length > 0 && (
          <div className="relative">
            <ImageCarousel images={images} />
            <div className="absolute top-3 right-3 rounded-md bg-black/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-green backdrop-blur-sm">
              Shipped
            </div>
            {post.metadata?.deploy_url && (
              <a
                href={post.metadata.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 rounded-lg bg-accent-green/15 px-3 py-1.5 text-[10px] font-semibold text-accent-green backdrop-blur-sm transition-colors hover:bg-accent-green/25"
              >
                Try it live ↗
              </a>
            )}
          </div>
        )}

        <div className="p-[18px]">
          <PostHeader post={post} />
          <PostBody headline={post.headline} body={post.body} />
        </div>

        {post.arcId && post.arcTitle && post.arcSequence != null && (
          <div className="px-[18px]">
            <ArcIndicator arcTitle={post.arcTitle} arcSequence={post.arcSequence} />
          </div>
        )}

        <div className="relative overflow-visible border-t border-border-dim mx-[18px] mt-3 pt-3 pb-4">
          <ReactionBar postId={post.id} initialReactions={initialReactions} userId={userId} />
        </div>

        <div className="px-[18px] pb-4">
          <CommentList postId={post.id} initialCommentCount={post.commentCount} />
        </div>
      </article>
    )
  }

  // Standard variant
  return (
    <article
      className="overflow-visible rounded-2xl border border-border-dim bg-bg-card p-[18px] transition-all duration-200 hover:border-border-subtle"
      style={{ animation: `post-fade-in 0.4s ease-out ${delay}ms both` }}
    >
      <div className={images.length > 0 ? "flex gap-4" : ""}>
        <div className="flex-1 min-w-0">
          <PostHeader post={post} />
          <PostBody headline={post.headline} body={post.body} />
        </div>
        {images.length > 0 && (
          <div className="mt-2 w-[140px] h-[100px] shrink-0 overflow-hidden rounded-xl">
            <img src={images[0].url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {video && <VideoPreview video={video} />}
      {post.type === "live" && post.metadata?.deploy_url && <LiveEmbed url={post.metadata.deploy_url} />}

      {post.arcId && post.arcTitle && post.arcSequence != null && (
        <ArcIndicator arcTitle={post.arcTitle} arcSequence={post.arcSequence} />
      )}

      <div className="relative mt-3 overflow-visible border-t border-border-dim pt-3">
        <ReactionBar postId={post.id} initialReactions={initialReactions} userId={userId} />
      </div>

      <div className="mt-2">
        <CommentList postId={post.id} initialCommentCount={post.commentCount} />
      </div>
    </article>
  )
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/feed/post-card.tsx
git commit -m "feat: three post card variants — hero, standard, compact"
```

---

## Task 5: Wire Up — Circle Page with Sidebar + Arc Filtering

**Files:**
- Modify: `apps/web/src/app/(feed)/[circleId]/page.tsx`
- Modify: `apps/web/src/components/feed/feed-view.tsx`

- [ ] **Step 1: Update circle page — add sidebar, remove MembersPanel**

Read the current `[circleId]/page.tsx`. Replace the return statement to use a flex layout with FeedView + FeedSidebar side by side. Remove the MembersPanel import and usage.

The page is a server component, but the sidebar needs client-side state (arc selection). Create a client wrapper component inline or make the feed + sidebar a client component.

Simplest approach: make a new client component `FeedWithSidebar` that wraps both:

Add to `apps/web/src/components/feed/feed-view.tsx` — update to accept `selectedArc` and filter posts:

In the FeedView component, add arc filtering:
```tsx
const filteredPosts = selectedArc
  ? posts.filter((p) => p.arcId === selectedArc)
  : posts
```

Then map over `filteredPosts` instead of `posts`.

Add `selectedArc?: string | null` to FeedViewProps.

- [ ] **Step 2: Update circle page layout**

In `[circleId]/page.tsx`, change the return to:

```tsx
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <FeedView circleId={circleId} userId={session.user.id} hasToken={hasToken} />
      </div>
      <FeedSidebar circleId={circleId} />
    </div>
  )
```

But since FeedSidebar needs to communicate arc selection to FeedView, and both are client components, create a wrapper:

Create `apps/web/src/components/feed/feed-with-sidebar.tsx`:

```tsx
"use client"

import { useState } from "react"
import { FeedView } from "./feed-view"
import { FeedSidebar } from "./feed-sidebar"

interface FeedWithSidebarProps {
  circleId: string
  userId: string
  hasToken: boolean
}

export function FeedWithSidebar({ circleId, userId, hasToken }: FeedWithSidebarProps) {
  const [selectedArc, setSelectedArc] = useState<string | null>(null)

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <FeedView circleId={circleId} userId={userId} hasToken={hasToken} selectedArc={selectedArc} />
      </div>
      <FeedSidebar circleId={circleId} selectedArc={selectedArc} onArcSelect={setSelectedArc} />
    </div>
  )
}
```

Then in `[circleId]/page.tsx`, replace:
```tsx
import { FeedWithSidebar } from "@/components/feed/feed-with-sidebar"

// In the return:
  return (
    <FeedWithSidebar circleId={circleId} userId={session.user.id} hasToken={hasToken} />
  )
```

Remove `MembersPanel` import and usage.

- [ ] **Step 3: Update FeedView to accept selectedArc**

In `feed-view.tsx`, add `selectedArc?: string | null` to FeedViewProps. Filter posts before mapping:

```tsx
  const filteredPosts = selectedArc
    ? posts.filter((p) => p.arcId === selectedArc)
    : posts
```

Use `filteredPosts` in the render instead of `posts`. Update the empty state to show "No posts in this arc" when filtering.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/feed/feed-with-sidebar.tsx apps/web/src/components/feed/feed-view.tsx apps/web/src/app/(feed)/[circleId]/page.tsx
git commit -m "feat: wire up feed + sidebar layout with arc filtering"
```

---

## Task 6: Cleanup + Build + Deploy

- [ ] **Step 1: Delete members-panel.tsx**

```bash
rm apps/web/src/components/feed/members-panel.tsx
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && bun run build
```

- [ ] **Step 3: Push and deploy**

```bash
cd /Users/alexanderhamilton/Coding/experiments/vibecircle
git add -A
git commit -m "feat: feed + live sidebar redesign — hero cards, arc navigation, presence"
git push origin HEAD
cd apps/web && vercel --prod --yes
```
