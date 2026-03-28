# Arc Persistence & Ticket Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make arcs a first-class entity with lifecycle, ticket integration via Claude's session context, and rich progress display in the feed.

**Architecture:** New `arcs` table in Neon Postgres (Drizzle ORM). Plugin instructs Claude to resolve branch→ticket→epic and passes enriched metadata with posts. Feed joins posts with arcs for display. Local branch-to-arc cache speeds up repeat sessions.

**Tech Stack:** Drizzle ORM, Next.js 16 API routes, React/SWR hooks, Node.js plugin scripts, Tailwind CSS

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `apps/web/drizzle/0001_arc_entity.sql` | Migration: create arcs table, alter posts |
| `apps/web/src/app/api/circles/[id]/arcs/[arcId]/route.ts` | GET/PATCH single arc endpoint |
| `apps/web/src/components/feed/arc-detail-header.tsx` | Arc detail view header (shown when filtering to one arc) |

### Modified Files
| File | Changes |
|------|---------|
| `apps/web/src/lib/db/schema.ts` | Add `arcs` table definition, update `posts` FK |
| `apps/web/src/lib/db/queries.ts` | New: `createArc`, `getArc`, `updateArcStatus`, `getArcsEnriched`. Modify: `createPost`, `getFeed`, `getArcs`, `getTimelapseFrames` |
| `apps/web/src/app/api/circles/[id]/posts/route.ts` | Upsert arc on post creation, auto-reopen shipped arcs |
| `apps/web/src/app/api/circles/[id]/arcs/route.ts` | POST to create arcs, enhanced GET response |
| `apps/web/src/app/api/circles/[id]/arcs/[arcId]/timelapse/route.ts` | Read arc title from arcs table instead of posts |
| `apps/web/src/app/api/circles/[id]/feed/route.ts` | No changes (query handles it) |
| `apps/web/src/hooks/use-feed.ts` | Update `FeedPost` and `PostMetadata` types |
| `apps/web/src/hooks/use-arcs.ts` | Update `Arc` interface with new fields |
| `apps/web/src/components/feed/arc-indicator.tsx` | Enhanced with ticket badge, progress bar, epic link |
| `apps/web/src/components/feed/feed-sidebar.tsx` | Active/shipped sections, progress bars, avatars |
| `apps/web/src/components/feed/feed-view.tsx` | Show arc detail header when filtering |
| `apps/web/src/components/feed/post-card.tsx` | Pass new arc data to ArcIndicator |
| `packages/plugin/scripts/post-to-circle.js` | Accept ticket/epic metadata flags |
| `packages/plugin/scripts/detect-activity.js` | Enhanced systemMessage with arc resolution instructions |
| `packages/plugin/commands/share.md` | Arc resolution chain, ticket enrichment, ship flow |

---

### Task 1: Create arcs table schema and migration

**Files:**
- Modify: `apps/web/src/lib/db/schema.ts`
- Create: `apps/web/drizzle/0001_arc_entity.sql`

- [ ] **Step 1: Add arcs table to Drizzle schema**

Add the `arcs` table definition after the `circles` table in `apps/web/src/lib/db/schema.ts`:

```typescript
// ── Arcs ──────────────────────────────────────────────────────────────────
export const arcs = pgTable("arcs", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id")
    .references(() => circles.id)
    .notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'shipped'
  epicRef: jsonb("epic_ref"), // {source, id, url} or null
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  shippedAt: timestamp("shipped_at"),
})

export type Arc = typeof arcs.$inferSelect
export type NewArc = typeof arcs.$inferInsert
```

Also update the `posts` table: change `arcId` from `text("arc_id")` to reference the arcs table:

```typescript
arcId: uuid("arc_id").references(() => arcs.id), // was: text("arc_id")
```

Note: `arcId` changes from `text` to `uuid` type to match the arcs table PK.

- [ ] **Step 2: Write the SQL migration**

Create `apps/web/drizzle/0001_arc_entity.sql`:

```sql
-- Create arcs table
CREATE TABLE IF NOT EXISTS "arcs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "circle_id" uuid NOT NULL REFERENCES "circles"("id"),
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "epic_ref" jsonb,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "shipped_at" timestamp
);

-- Migrate existing arc data: create arc rows from distinct (circleId, arcTitle) pairs
INSERT INTO "arcs" ("id", "circle_id", "title", "created_by", "created_at")
SELECT DISTINCT ON (p."circle_id", p."arc_title")
  gen_random_uuid(),
  p."circle_id",
  p."arc_title",
  p."author_id",
  MIN(p."created_at")
FROM "posts" p
WHERE p."arc_title" IS NOT NULL
GROUP BY p."circle_id", p."arc_title", p."author_id";

-- Update posts to reference the new arcs table
-- First, add a temporary column for the new UUID arc reference
ALTER TABLE "posts" ADD COLUMN "arc_id_new" uuid REFERENCES "arcs"("id");

-- Populate arc_id_new by matching on circle_id + arc_title
UPDATE "posts" p
SET "arc_id_new" = a."id"
FROM "arcs" a
WHERE p."circle_id" = a."circle_id"
  AND p."arc_title" = a."title"
  AND p."arc_title" IS NOT NULL;

-- Drop old arc_id column and rename new one
ALTER TABLE "posts" DROP COLUMN "arc_id";
ALTER TABLE "posts" RENAME COLUMN "arc_id_new" TO "arc_id";

-- Keep arc_title for now (will be dropped in a later migration after all code is updated)
-- It's redundant but prevents breakage during the transition
```

- [ ] **Step 3: Run the migration against the database**

Run:
```bash
cd apps/web && npx drizzle-kit push
```

If `drizzle-kit push` doesn't pick up the raw SQL, run it directly:
```bash
cd apps/web && node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
const migration = fs.readFileSync('./drizzle/0001_arc_entity.sql', 'utf-8');
sql(migration).then(() => console.log('Migration complete')).catch(e => { console.error(e); process.exit(1); });
"
```

Expected: Migration completes without errors. Arcs table created, existing posts migrated.

- [ ] **Step 4: Verify migration**

```bash
cd apps/web && node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql('SELECT count(*) as c FROM arcs').then(r => console.log('Arcs:', r[0].c));
sql('SELECT count(*) as c FROM posts WHERE arc_id IS NOT NULL').then(r => console.log('Posts with arcId:', r[0].c));
"
```

Expected: Arc count matches number of distinct arcs previously in posts. Posts with arcId should match posts that had arcTitle.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/db/schema.ts apps/web/drizzle/0001_arc_entity.sql
git commit -m "feat: add arcs table and migrate existing arc data"
```

---

### Task 2: Add arc CRUD queries

**Files:**
- Modify: `apps/web/src/lib/db/queries.ts`

- [ ] **Step 1: Add createArc function**

Add after the circle queries section in `apps/web/src/lib/db/queries.ts`:

```typescript
// ── Arc Queries ──────────────────────────────────────────────────────────

/** Create a new arc in a circle */
export async function createArc(
  circleId: string,
  title: string,
  createdBy: string,
  epicRef?: { source: string; id: string; url: string } | null
) {
  const [arc] = await db
    .insert(arcs)
    .values({
      circleId,
      title,
      createdBy,
      epicRef: epicRef ?? null,
    })
    .returning()

  return arc
}
```

Add the import for `arcs` at the top of the file alongside the other schema imports.

- [ ] **Step 2: Add getArc function**

```typescript
/** Get a single arc by ID */
export async function getArc(arcId: string) {
  const [arc] = await db
    .select()
    .from(arcs)
    .where(eq(arcs.id, arcId))
    .limit(1)

  return arc ?? null
}
```

- [ ] **Step 3: Add updateArcStatus function**

```typescript
/** Update arc status (active → shipped, or shipped → active) */
export async function updateArcStatus(
  arcId: string,
  status: "active" | "shipped"
) {
  const updates: Record<string, unknown> = { status }
  if (status === "shipped") {
    updates.shippedAt = new Date()
  } else {
    updates.shippedAt = null
  }

  const [arc] = await db
    .update(arcs)
    .set(updates)
    .where(eq(arcs.id, arcId))
    .returning()

  return arc ?? null
}
```

- [ ] **Step 4: Add findArcByEpicRef function**

```typescript
/** Find an arc by epic reference (source + id) within a circle */
export async function findArcByEpicRef(
  circleId: string,
  epicSource: string,
  epicId: string
) {
  const rows = await db
    .select()
    .from(arcs)
    .where(
      and(
        eq(arcs.circleId, circleId),
        sql`${arcs.epicRef}->>'source' = ${epicSource}`,
        sql`${arcs.epicRef}->>'id' = ${epicId}`
      )
    )
    .limit(1)

  return rows[0] ?? null
}
```

- [ ] **Step 5: Rewrite getArcs to query arcs table**

Replace the existing `getArcs` function:

```typescript
/** Get arcs for a circle with enriched data */
export async function getArcs(circleId: string) {
  // Get all arcs for this circle
  const arcRows = await db
    .select()
    .from(arcs)
    .where(eq(arcs.circleId, circleId))
    .orderBy(desc(arcs.createdAt))

  if (arcRows.length === 0) return []

  const arcIds = arcRows.map((a) => a.id)

  // Get post counts and latest post date per arc
  const statRows = await db
    .select({
      arcId: posts.arcId,
      postCount: count(),
      latestAt: sql<Date>`max(${posts.createdAt})`,
    })
    .from(posts)
    .where(sql`${posts.arcId} IN ${arcIds}`)
    .groupBy(posts.arcId)

  const statMap = new Map(statRows.map((r) => [r.arcId, r]))

  // Get distinct authors per arc
  const authorRows = await db
    .select({
      arcId: posts.arcId,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorImage: users.image,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(sql`${posts.arcId} IN ${arcIds}`)
    .groupBy(posts.arcId, posts.authorId, users.name, users.avatarUrl, users.image)

  const authorMap = new Map<string, Array<{ id: string; name: string | null; avatarUrl: string | null }>>()
  for (const row of authorRows) {
    if (!row.arcId) continue
    if (!authorMap.has(row.arcId)) authorMap.set(row.arcId, [])
    authorMap.get(row.arcId)!.push({
      id: row.authorId,
      name: row.authorName,
      avatarUrl: row.authorAvatarUrl ?? row.authorImage,
    })
  }

  // Get latest epicProgress from most recent post per arc
  const progressRows = await db
    .select({
      arcId: posts.arcId,
      metadata: posts.metadata,
    })
    .from(posts)
    .where(
      and(
        sql`${posts.arcId} IN ${arcIds}`,
        sql`${posts.metadata}->>'epicProgress' IS NOT NULL`
      )
    )
    .orderBy(desc(posts.createdAt))

  const progressMap = new Map<string, { total: number; done: number; inProgress: number }>()
  for (const row of progressRows) {
    if (!row.arcId || progressMap.has(row.arcId)) continue // first one wins (most recent)
    const meta = row.metadata as Record<string, unknown> | null
    const ep = meta?.epicProgress as { total: number; done: number; inProgress: number } | undefined
    if (ep) progressMap.set(row.arcId, ep)
  }

  return arcRows.map((arc) => {
    const stats = statMap.get(arc.id)
    return {
      id: arc.id,
      title: arc.title,
      status: arc.status,
      epicRef: arc.epicRef as { source: string; id: string; url: string } | null,
      postCount: stats ? Number(stats.postCount) : 0,
      latestAt: stats?.latestAt ?? arc.createdAt,
      shippedAt: arc.shippedAt,
      contributors: authorMap.get(arc.id) ?? [],
      epicProgress: progressMap.get(arc.id) ?? null,
    }
  }).sort((a, b) => {
    // Active first, then by latest activity
    if (a.status !== b.status) return a.status === "active" ? -1 : 1
    const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0
    const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0
    return bTime - aTime
  })
}
```

- [ ] **Step 6: Update createPost to work with new arcId type**

In the existing `createPost` function, the `arcId` parameter now references the arcs table (UUID), but the function signature stays the same — callers pass the arc UUID.

No code change needed here — the column type change is handled by the migration.

- [ ] **Step 7: Update getFeed to join arcs table**

In `getFeed`, update the select to include arc data from the arcs table:

Replace the existing select block (lines ~219-235) with:

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
      arcSequence: posts.arcSequence,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorImage: users.image,
      // Arc data from join
      arcTitle: arcs.title,
      arcStatus: arcs.status,
      arcEpicRef: arcs.epicRef,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(arcs, eq(posts.arcId, arcs.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1)
```

And update the enrichedPosts mapping (around line ~313) to use arc data from the join:

```typescript
  const enrichedPosts = feedRows.map((row) => ({
    id: row.id,
    type: row.type,
    body: row.body,
    media: row.media,
    metadata: row.metadata,
    headline: row.headline,
    arcId: row.arcId,
    arcTitle: row.arcTitle ?? null,
    arcStatus: row.arcStatus ?? null,
    arcEpicRef: row.arcEpicRef ?? null,
    arcSequence: row.arcSequence,
    arcTotalPosts: row.arcId ? (arcCountMap.get(row.arcId) ?? 1) : null,
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

Remove the old `arcTitle: row.arcTitle` line that read from posts (it now comes from arcs).

- [ ] **Step 8: Update getTimelapseFrames to read from arcs table**

Replace the existing function:

```typescript
export async function getTimelapseFrames(circleId: string, arcId: string) {
  // Get arc title from arcs table
  const [arc] = await db
    .select({ title: arcs.title })
    .from(arcs)
    .where(eq(arcs.id, arcId))
    .limit(1)

  const rows = await db
    .select({
      postId: posts.id,
      headline: posts.headline,
      media: posts.media,
      type: posts.type,
      createdAt: posts.createdAt,
      arcSequence: posts.arcSequence,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorImage: users.image,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(
      and(
        eq(posts.circleId, circleId),
        eq(posts.arcId, arcId)
      )
    )
    .orderBy(posts.arcSequence)

  if (rows.length === 0) return null

  return {
    arcTitle: arc?.title ?? "Untitled Arc",
    frames: rows.map((row) => ({
      postId: row.postId,
      headline: row.headline,
      media: row.media,
      type: row.type,
      createdAt: row.createdAt,
      arcSequence: row.arcSequence ?? 0,
      author: {
        name: row.authorName,
        avatarUrl: row.authorAvatarUrl ?? row.authorImage,
      },
    })),
  }
}
```

- [ ] **Step 9: Build to verify no type errors**

Run:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/lib/db/queries.ts
git commit -m "feat: add arc CRUD queries and update feed/timelapse to use arcs table"
```

---

### Task 3: Add arc API endpoints

**Files:**
- Modify: `apps/web/src/app/api/circles/[id]/arcs/route.ts`
- Create: `apps/web/src/app/api/circles/[id]/arcs/[arcId]/route.ts`
- Modify: `apps/web/src/app/api/circles/[id]/posts/route.ts`

- [ ] **Step 1: Add POST to arcs route**

Update `apps/web/src/app/api/circles/[id]/arcs/route.ts` to add a POST handler:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getArcs, createArc } from "@/lib/db/queries"
import { getAuthUserId } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/** GET /api/circles/[id]/arcs — list arcs with enriched data */
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

/** POST /api/circles/[id]/arcs — create a new arc */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

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

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const arc = await createArc(
    circleId,
    body.title,
    userId,
    body.epicRef ?? null
  )

  return NextResponse.json(arc, { status: 201 })
}
```

- [ ] **Step 2: Create single arc endpoint (GET + PATCH)**

Create `apps/web/src/app/api/circles/[id]/arcs/[arcId]/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { getArc, updateArcStatus } from "@/lib/db/queries"
import { getAuthUserId } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/** GET /api/circles/[id]/arcs/[arcId] — get a single arc */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; arcId: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId, arcId } = await params

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

  const arc = await getArc(arcId)
  if (!arc || arc.circleId !== circleId) {
    return NextResponse.json({ error: "Arc not found" }, { status: 404 })
  }

  return NextResponse.json(arc)
}

/** PATCH /api/circles/[id]/arcs/[arcId] — update arc status */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; arcId: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId, arcId } = await params

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

  const arc = await getArc(arcId)
  if (!arc || arc.circleId !== circleId) {
    return NextResponse.json({ error: "Arc not found" }, { status: 404 })
  }

  const body = await request.json()

  if (body.status && !["active", "shipped"].includes(body.status)) {
    return NextResponse.json(
      { error: "status must be 'active' or 'shipped'" },
      { status: 400 }
    )
  }

  if (body.status) {
    const updated = await updateArcStatus(arcId, body.status)
    return NextResponse.json(updated)
  }

  return NextResponse.json(arc)
}
```

- [ ] **Step 3: Update post creation to auto-reopen shipped arcs**

In `apps/web/src/app/api/circles/[id]/posts/route.ts`, add arc reopening logic after validation:

```typescript
import { NextResponse } from "next/server"
import { createPost, getArc, updateArcStatus } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getAuthUserId } from "@/lib/api-auth"

const VALID_TYPES = ["shipped", "wip", "video", "live", "ambient"] as const

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

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

  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid post type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  // If posting to a shipped arc, reopen it
  if (body.arcId) {
    const arc = await getArc(body.arcId)
    if (arc && arc.status === "shipped") {
      await updateArcStatus(body.arcId, "active")
    }
  }

  const post = await createPost(circleId, userId, {
    type: body.type,
    body: body.body ?? null,
    media: body.media ?? null,
    metadata: body.metadata ?? null,
    headline: body.headline ?? null,
    arcId: body.arcId ?? null,
    arcTitle: body.arcTitle ?? null, // kept for backwards compat during transition
    arcSequence: body.arcSequence != null ? Number(body.arcSequence) : null,
  })

  return NextResponse.json(post, { status: 201 })
}
```

- [ ] **Step 4: Build to verify**

Run:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/circles/[id]/arcs/ apps/web/src/app/api/circles/[id]/posts/route.ts
git commit -m "feat: add arc create/get/patch endpoints and auto-reopen on post"
```

---

### Task 4: Update frontend types and hooks

**Files:**
- Modify: `apps/web/src/hooks/use-feed.ts`
- Modify: `apps/web/src/hooks/use-arcs.ts`

- [ ] **Step 1: Update FeedPost type**

In `apps/web/src/hooks/use-feed.ts`, update the `PostMetadata` interface:

```typescript
export interface PostMetadata {
  repo_url?: string
  deploy_url?: string
  commits_count?: number
  files_changed?: number
  tech_tags?: string[]
  ticket?: {
    source: string
    id: string
    title: string
    url: string
    status: string
  }
  epicProgress?: {
    total: number
    done: number
    inProgress: number
  }
}
```

Update `FeedPost` to include new arc fields:

```typescript
export interface FeedPost {
  id: string
  type: "shipped" | "wip" | "video" | "live" | "ambient"
  body: string | null
  headline: string | null
  arcId: string | null
  arcTitle: string | null
  arcStatus: string | null
  arcEpicRef: { source: string; id: string; url: string } | null
  arcSequence: number | null
  arcTotalPosts: number | null
  media: PostMedia[] | null
  metadata: PostMetadata | null
  createdAt: string
  author: PostAuthor
  reactionCounts: Record<string, number>
  commentCount: number
}
```

- [ ] **Step 2: Update Arc type**

Replace `apps/web/src/hooks/use-arcs.ts`:

```typescript
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface ArcContributor {
  id: string
  name: string | null
  avatarUrl: string | null
}

export interface Arc {
  id: string
  title: string
  status: "active" | "shipped"
  epicRef: { source: string; id: string; url: string } | null
  postCount: number
  latestAt: string | null
  shippedAt: string | null
  contributors: ArcContributor[]
  epicProgress: { total: number; done: number; inProgress: number } | null
}

export function useArcs(circleId: string | null) {
  return useSWR<Arc[]>(
    circleId ? `/api/circles/${circleId}/arcs` : null,
    fetcher,
    { refreshInterval: 30000 }
  )
}
```

- [ ] **Step 3: Build to verify types compile**

Run:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds. Some components may have type errors — these will be fixed in the next tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-feed.ts apps/web/src/hooks/use-arcs.ts
git commit -m "feat: update FeedPost and Arc types for ticket enrichment"
```

---

### Task 5: Enhanced arc indicator component

**Files:**
- Modify: `apps/web/src/components/feed/arc-indicator.tsx`

- [ ] **Step 1: Rewrite arc indicator with ticket and progress data**

Replace `apps/web/src/components/feed/arc-indicator.tsx`:

```tsx
"use client"

import { Play, ExternalLink } from "lucide-react"

interface ArcIndicatorProps {
  arcTitle: string
  arcSequence?: number | null
  arcId?: string | null
  circleId?: string | null
  totalPosts?: number | null
  epicRef?: { source: string; id: string; url: string } | null
  ticket?: { source: string; id: string; title: string; url: string; status: string } | null
  epicProgress?: { total: number; done: number; inProgress: number } | null
  onPlayTimelapse?: () => void
  onArcClick?: () => void
}

export function ArcIndicator({
  arcTitle,
  arcSequence,
  totalPosts,
  epicRef,
  ticket,
  epicProgress,
  onPlayTimelapse,
  onArcClick,
}: ArcIndicatorProps) {
  const seq = arcSequence ?? 0
  const dots = seq > 0 ? Array.from({ length: Math.min(seq, 6) }, (_, i) => i) : []
  const showPlay = (totalPosts ?? 0) >= 2 && onPlayTimelapse

  return (
    <div className="mt-3 rounded-lg border border-border-dim bg-bg-base/60 px-3 py-2.5">
      {/* Top row: arc name, epic link, ticket badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green" />
          <button
            onClick={onArcClick}
            className="text-[12px] font-semibold text-accent-green hover:underline"
          >
            {arcTitle}
          </button>
        </div>

        {epicRef && (
          <a
            href={epicRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {epicRef.source === "linear" ? "Linear" : epicRef.source === "jira" ? "Jira" : "GitHub"}
          </a>
        )}

        {ticket && (
          <a
            href={ticket.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded border border-border-dim bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted hover:text-text-secondary"
          >
            {ticket.id}
          </a>
        )}
      </div>

      {/* Progress bar */}
      {epicProgress && epicProgress.total > 0 && (
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex-1 h-1 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green/70"
              style={{ width: `${(epicProgress.done / epicProgress.total) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-text-dim whitespace-nowrap">
            {epicProgress.done} of {epicProgress.total} done
          </span>
        </div>
      )}

      {/* Dots + sequence + timelapse */}
      <div className="mt-2 flex items-center gap-2">
        {dots.length > 0 && (
          <div className="flex gap-1">
            {dots.map((i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === seq - 1
                    ? "bg-accent-green shadow-[0_0_4px_var(--color-glow-green)]"
                    : "bg-accent-green/50"
                }`}
              />
            ))}
          </div>
        )}
        {seq > 0 && (
          <span className="text-[10px] text-text-dim">
            {ordinal(seq)} update
          </span>
        )}
        {showPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlayTimelapse()
            }}
            className="ml-auto flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary"
            aria-label={`Play timelapse for ${arcTitle}`}
          >
            <Play className="h-3 w-3" />
            Timelapse
          </button>
        )}
      </div>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
```

- [ ] **Step 2: Update PostCard to pass new props**

In `apps/web/src/components/feed/post-card.tsx`, update all three ArcIndicator usages to pass the new props. Find each `<ArcIndicator` and update:

```tsx
<ArcIndicator
  arcTitle={post.arcTitle}
  arcSequence={post.arcSequence}
  arcId={post.arcId}
  circleId={circleId}
  totalPosts={post.arcTotalPosts}
  epicRef={post.arcEpicRef}
  ticket={post.metadata?.ticket}
  epicProgress={post.metadata?.epicProgress}
  onPlayTimelapse={timelapseHandler}
/>
```

Note: The condition to show ArcIndicator changes from `post.arcTitle` to `post.arcTitle` (same — arc title now comes from the joined arcs table).

- [ ] **Step 3: Build to verify**

Run:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/feed/arc-indicator.tsx apps/web/src/components/feed/post-card.tsx
git commit -m "feat: enhanced arc indicator with ticket badge, progress bar, epic link"
```

---

### Task 6: Enhanced sidebar with active/shipped sections

**Files:**
- Modify: `apps/web/src/components/feed/feed-sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar arcs section**

Replace the arcs section in `apps/web/src/components/feed/feed-sidebar.tsx` (the `{/* Arcs */}` block, roughly lines 66-93):

```tsx
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

        {/* Active arcs */}
        {(arcs ?? []).filter((a) => a.status === "active").map((arc) => (
          <button
            key={arc.id}
            onClick={() => onArcSelect(arc.id)}
            className={`mb-1 flex w-full flex-col gap-1.5 rounded-lg px-3 py-2 text-left transition-colors ${
              selectedArc === arc.id ? "bg-accent-green/[0.06]" : "hover:bg-bg-elevated"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green" />
              <span className="text-xs font-medium text-text-primary truncate">{arc.title}</span>
            </div>
            {arc.epicProgress && arc.epicProgress.total > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-green/60"
                    style={{ width: `${(arc.epicProgress.done / arc.epicProgress.total) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-dim">{arc.epicProgress.done}/{arc.epicProgress.total}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {arc.contributors.slice(0, 3).map((c, i) => (
                <div
                  key={c.id}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-bg-card text-[8px] font-bold"
                  style={{ marginLeft: i > 0 ? -6 : 0, backgroundColor: `hsl(${c.id.charCodeAt(0) * 37 % 360}, 40%, 35%)` }}
                >
                  <span className="text-text-primary">{(c.name?.[0] ?? "?").toUpperCase()}</span>
                </div>
              ))}
              <span className="text-[10px] text-text-dim ml-1">
                {arc.latestAt ? timeAgoShort(arc.latestAt) : ""}
              </span>
            </div>
          </button>
        ))}

        {/* Shipped arcs */}
        {(arcs ?? []).filter((a) => a.status === "shipped").length > 0 && (
          <>
            <div className="mt-3 mb-2 text-[9px] font-semibold uppercase tracking-wider text-text-dim">
              Shipped
            </div>
            {(arcs ?? []).filter((a) => a.status === "shipped").map((arc) => (
              <button
                key={arc.id}
                onClick={() => onArcSelect(arc.id)}
                className={`mb-1 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-xs transition-colors opacity-70 ${
                  selectedArc === arc.id ? "bg-accent-green/[0.06]" : "hover:bg-bg-elevated"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent-green shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-medium text-text-secondary truncate">{arc.title}</span>
                <span className="ml-auto text-[10px] text-text-dim">
                  {arc.shippedAt ? new Date(arc.shippedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
```

- [ ] **Step 2: Build to verify**

Run:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/feed/feed-sidebar.tsx
git commit -m "feat: sidebar arcs with progress bars, contributors, shipped section"
```

---

### Task 7: Arc detail header component

**Files:**
- Create: `apps/web/src/components/feed/arc-detail-header.tsx`
- Modify: `apps/web/src/components/feed/feed-view.tsx`

- [ ] **Step 1: Create arc detail header**

Create `apps/web/src/components/feed/arc-detail-header.tsx`:

```tsx
"use client"

import { ExternalLink, Play, X } from "lucide-react"
import type { Arc } from "@/hooks/use-arcs"

interface ArcDetailHeaderProps {
  arc: Arc
  onClose: () => void
  onPlayTimelapse?: () => void
}

export function ArcDetailHeader({ arc, onClose, onPlayTimelapse }: ArcDetailHeaderProps) {
  return (
    <div className="rounded-2xl border border-border-dim bg-bg-card p-5 mb-4">
      {/* Title row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-2 w-2 shrink-0 rounded-full bg-accent-green" />
        <h2 className="font-display text-lg font-bold text-text-primary">{arc.title}</h2>
        {arc.epicRef && (
          <a
            href={arc.epicRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-bg-elevated px-2.5 py-1 text-[11px] text-text-muted hover:text-text-secondary"
          >
            <ExternalLink className="h-3 w-3" />
            Open in {arc.epicRef.source === "linear" ? "Linear" : arc.epicRef.source === "jira" ? "Jira" : "GitHub"}
          </a>
        )}
        <div className="ml-auto flex items-center gap-2">
          {arc.postCount >= 2 && onPlayTimelapse && (
            <button
              onClick={onPlayTimelapse}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary"
            >
              <Play className="h-3.5 w-3.5" />
              Play timelapse
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {arc.epicProgress && arc.epicProgress.total > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green/70"
              style={{ width: `${(arc.epicProgress.done / arc.epicProgress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">
            {arc.epicProgress.done} of {arc.epicProgress.total} tickets done
          </span>
        </div>
      )}

      {/* Contributors + stats */}
      <div className="flex items-center gap-2 pt-3 border-t border-border-dim">
        <div className="flex items-center">
          {arc.contributors.slice(0, 5).map((c, i) => (
            <div
              key={c.id}
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-bg-card text-[9px] font-bold"
              style={{ marginLeft: i > 0 ? -6 : 0, backgroundColor: `hsl(${c.id.charCodeAt(0) * 37 % 360}, 40%, 35%)` }}
            >
              <span className="text-text-primary">{(c.name?.[0] ?? "?").toUpperCase()}</span>
            </div>
          ))}
        </div>
        <span className="text-[11px] text-text-dim">
          {arc.contributors.length} contributor{arc.contributors.length !== 1 ? "s" : ""} · {arc.postCount} update{arc.postCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update feed-view to show arc detail header**

In `apps/web/src/components/feed/feed-view.tsx`, add the arc detail header when `selectedArc` is set. Import the component and the `useArcs` hook, then render the header above the posts:

Add to imports:
```typescript
import { ArcDetailHeader } from "./arc-detail-header"
import { useArcs } from "@/hooks/use-arcs"
```

Inside the component, after the existing hooks:
```typescript
const { data: arcsData } = useArcs(circleId)
const selectedArcData = selectedArc
  ? arcsData?.find((a) => a.id === selectedArc)
  : null
```

Then in the JSX, above the post cards, add:
```tsx
{selectedArcData && (
  <ArcDetailHeader
    arc={selectedArcData}
    onClose={() => onArcSelect?.(null)}
  />
)}
```

Note: The `onArcSelect` prop needs to be available in feed-view. Check if it's already passed down — if not, add it to the FeedView props interface and pass it from the parent (`feed-with-sidebar.tsx`).

- [ ] **Step 3: Update feed-view arc filtering**

Update the arc filtering logic in feed-view to use arc IDs only (no more fallback to arcTitle):

```typescript
const filteredPosts = selectedArc
  ? posts.filter((p) => p.arcId === selectedArc)
  : posts
```

- [ ] **Step 4: Build to verify**

Run:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/feed/arc-detail-header.tsx apps/web/src/components/feed/feed-view.tsx
git commit -m "feat: arc detail header with progress, contributors, epic link"
```

---

### Task 8: Update plugin post-to-circle.js for ticket metadata

**Files:**
- Modify: `packages/plugin/scripts/post-to-circle.js`

- [ ] **Step 1: Add ticket metadata flags to parseArgs**

Update the `parseArgs` function to accept new flags:

```javascript
function parseArgs(argv) {
  const args = {
    type: "wip", body: "", screenshot: "", headline: "",
    arcId: "", arcTitle: "", arcSequence: "", circleId: "",
    ticketSource: "", ticketId: "", ticketTitle: "", ticketUrl: "", ticketStatus: "",
    epicTotal: "", epicDone: "", epicInProgress: "",
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
    } else if (argv[i] === "--circle-id" && argv[i + 1]) {
      args.circleId = argv[++i];
    } else if (argv[i] === "--ticket-source" && argv[i + 1]) {
      args.ticketSource = argv[++i];
    } else if (argv[i] === "--ticket-id" && argv[i + 1]) {
      args.ticketId = argv[++i];
    } else if (argv[i] === "--ticket-title" && argv[i + 1]) {
      args.ticketTitle = argv[++i];
    } else if (argv[i] === "--ticket-url" && argv[i + 1]) {
      args.ticketUrl = argv[++i];
    } else if (argv[i] === "--ticket-status" && argv[i + 1]) {
      args.ticketStatus = argv[++i];
    } else if (argv[i] === "--epic-total" && argv[i + 1]) {
      args.epicTotal = argv[++i];
    } else if (argv[i] === "--epic-done" && argv[i + 1]) {
      args.epicDone = argv[++i];
    } else if (argv[i] === "--epic-in-progress" && argv[i + 1]) {
      args.epicInProgress = argv[++i];
    }
  }
  return args;
}
```

- [ ] **Step 2: Pack ticket metadata into post payload**

Update the payload construction in `main()`:

```javascript
  const metadata = getGitMetadata();

  // Add ticket metadata if provided
  if (args.ticketId) {
    metadata.ticket = {
      source: args.ticketSource || "unknown",
      id: args.ticketId,
      title: args.ticketTitle || "",
      url: args.ticketUrl || "",
      status: args.ticketStatus || "unknown",
    };
  }

  if (args.epicTotal) {
    metadata.epicProgress = {
      total: parseInt(args.epicTotal, 10) || 0,
      done: parseInt(args.epicDone, 10) || 0,
      inProgress: parseInt(args.epicInProgress, 10) || 0,
    };
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/scripts/post-to-circle.js
git commit -m "feat: post-to-circle accepts ticket and epic metadata flags"
```

---

### Task 9: Update detect-activity.js with arc resolution instructions

**Files:**
- Modify: `packages/plugin/scripts/detect-activity.js`

- [ ] **Step 1: Update systemMessage with arc resolution chain**

Replace the `suggest()` function's `systemMessage` to include arc resolution:

```javascript
function suggest(trigger, circleNames, config) {
  const last = getLastSuggestTime();
  if (Date.now() - last < 5 * 60 * 1000) {
    process.exit(0);
  }
  setLastSuggestTime();

  const circles = config.circles || [];
  const circleInfo = circles.map(c => `${c.name} (id: ${c.id}, tone: ${c.tone}, filter: ${c.filter})`).join(", ");
  const apiUrl = config.apiUrl || "https://vibecircle.dev";

  const output = JSON.stringify({
    decision: "approve",
    systemMessage: `[vibecircle auto-share] ${trigger}

This looks like a good moment to share with the user's circles: ${circleInfo}.

**Arc Resolution — do this first:**
1. Check if ~/.vibecircle/arc-map.json exists. If so, read it and look for the current branch name as a key.
   - If found and "resolvedAt" is less than 24 hours old, use the cached arcId and arcTitle.
   - If not found or stale, continue to step 2.
2. Get the current branch: git branch --show-current
3. Parse the branch name for a ticket ID pattern (e.g., PAY-123, PROJ-123, #123, feat/PAY-123-description).
4. If a ticket ID is found, try to look it up:
   - If Linear MCP tools are available, use them to get the issue and its parent project/epic.
   - If GitHub CLI is available, try: gh issue view <number> --json title,projectItems
   - If Jira MCP tools are available, use them.
5. If you found a parent epic/project:
   - Check existing arcs: GET ${apiUrl}/api/circles/<circleId>/arcs (use Bearer token from ~/.vibecircle/config.json authToken)
   - If an arc exists with matching epicRef, use it. Note its ID.
   - If no match, create a new arc: POST ${apiUrl}/api/circles/<circleId>/arcs with {"title": "<epic/project name>", "epicRef": {"source": "linear|jira|github", "id": "<epicId>", "url": "<epicUrl>"}}
   - Save the new arc ID.
6. If you could NOT find a ticket or epic:
   - Auto-generate an arc name from the repo name, branch, and nature of the changes.
   - Tell the user: "I couldn't find a ticket for this branch. I'm calling this arc '<name>'. Want to attach it to an existing arc instead?" Then list active arcs as numbered options.
7. Determine the arc sequence: count existing posts in this arc + 1.
8. Save the branch→arc mapping to ~/.vibecircle/arc-map.json for next time.

**If you found ticket info, also gather:**
- ticket source, ID, title, URL, status
- epic/project progress (total tickets, done, in-progress)

**Then draft and share:**
1. Based on what was just built, draft a post for each matching circle. Write a headline (one line, plain English) and a body (2-3 sentences, markdown). Adapt tone per circle.
2. Try to capture a screenshot if UI work was done.
3. Show the user a numbered preview with full content. Ask: Post: [all] · [1,2] · [skip] · [edit N]
4. If they approve, post each via: node ${process.env.CLAUDE_PLUGIN_ROOT || "PLUGIN_ROOT"}/scripts/post-to-circle.js --circle-id <id> --type <shipped|wip> --headline "<headline>" --body "<body>" --arc-id "<arcId>" --arc-title "<arcTitle>" --arc-sequence <n>
   Add ticket flags if available: --ticket-source <source> --ticket-id <id> --ticket-title "<title>" --ticket-url "<url>" --ticket-status "<status>" --epic-total <n> --epic-done <n> --epic-in-progress <n>
5. Add --screenshot <path> if one was captured.

Be casual — "Looks like you made progress on <arc name> — want to share it?"`
  });
  process.stdout.write(output);
  process.exit(0);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/scripts/detect-activity.js
git commit -m "feat: detect-activity includes arc resolution chain in systemMessage"
```

---

### Task 10: Update /share command with arc resolution

**Files:**
- Modify: `packages/plugin/commands/share.md`

- [ ] **Step 1: Update share command with arc resolution steps**

Replace `packages/plugin/commands/share.md`:

```markdown
---
name: share
description: Share what you're building with your vibecircles
allowed-tools: Bash, Read, Write, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot
user-invocable: true
---

# /share — Share what you're building

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If not configured, tell user to run `/circle setup`.

## 2. Determine matching circles

Detect current repo: run `git remote get-url origin` and parse out the `owner/repo` part.

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles-for-repo <owner/repo>`

This returns the circles whose repo scope includes this repo. If no circles match, ask: "This repo isn't mapped to any circle. Which circles should it post to?" Show numbered list of all circles, let user pick, and ask "Remember this for next time?" If yes, update the circle's repos in config.

## 3. Resolve arc context

This is critical — every post should belong to an arc.

**Step 3a: Check local cache**
Read `~/.vibecircle/arc-map.json` if it exists. Look for the current branch name as a key.
- If found and `resolvedAt` is less than 24 hours old → use the cached `arcId` and `arcTitle`. Skip to step 4.

**Step 3b: Parse branch for ticket ID**
Get the current branch: `git branch --show-current`
Look for ticket ID patterns: `PAY-123`, `PROJ-123`, `#123`, `feat/PAY-123-description`, etc.

**Step 3c: Look up ticket → epic**
If a ticket ID is found, try to resolve it:
- **Linear MCP:** Get the issue, find its parent project/cycle
- **GitHub CLI:** `gh issue view <number> --json title,projectItems`
- **Jira MCP:** Get the issue, find its parent epic
- If none are available, skip to step 3e.

**Step 3d: Match or create arc**
Read the API URL from config (`~/.vibecircle/config.json` → `apiUrl`) and the auth token (`authToken`).

Check existing arcs:
```bash
curl -s -H "Authorization: Bearer <authToken>" <apiUrl>/api/circles/<circleId>/arcs
```

If an arc exists with a matching epicRef (same source and id), use it.

If no match, create one:
```bash
curl -s -X POST -H "Authorization: Bearer <authToken>" -H "Content-Type: application/json" \
  -d '{"title":"<epic name>","epicRef":{"source":"<linear|jira|github>","id":"<epicId>","url":"<epicUrl>"}}' \
  <apiUrl>/api/circles/<circleId>/arcs
```

Use the returned arc ID.

**Step 3e: Fallback (no ticket found)**
Auto-generate an arc name from git context (repo name, branch name, nature of changes).
Tell the user: "I couldn't find a ticket for this branch. I'm calling this arc **<name>**. Want to attach it to an existing arc instead?"
List active arcs as numbered options. User picks or accepts.

**Step 3f: Determine sequence**
Count posts in this arc (from the arcs list response → `postCount`) and set sequence to `postCount + 1`.

**Step 3g: Update local cache**
Write the branch→arc mapping to `~/.vibecircle/arc-map.json`:
```json
{
  "<branch-name>": {
    "arcId": "<uuid>",
    "arcTitle": "<title>",
    "lastSequence": <n>,
    "resolvedAt": "<ISO timestamp>"
  }
}
```

## 4. Capture a screenshot

Try to capture a screenshot:
a. Check conversation context for dev server URL
b. Detect via `lsof` for this project
c. Use production URL from config `apiUrl`
d. Screenshot with Playwright MCP
e. If nothing works, ask: "Want to attach a screenshot? Drop a file path or say 'skip'."

## 5. Gather ticket metadata (if available)

If you resolved a ticket in step 3c, gather:
- **ticket**: source, id, title, url, status
- **epicProgress**: total tickets in epic, done count, in-progress count

These will be passed as flags to post-to-circle.js.

## 6. Apply filters

For each matching circle, check its `filter`:
- `"everything"` → always qualifies
- `"features-only"` → check if this is feature work. If unsure, include it.
- `"milestones-only"` → check if this was deployed/shipped. If not, skip this circle.

Remove circles that don't qualify.

## 7. Generate per-circle posts

For each qualifying circle, write a headline and body using the circle's `tone`:

- `"casual"` — write like telling a friend. Informal, enthusiastic, short.
- `"technical"` — include frameworks, architecture, tradeoffs. For engineers.
- `"non-technical"` — focus on what it does for users. For PMs/designers.
- `"business-impact"` — focus on outcomes, metrics, who benefits. For leadership.

**Write the body in markdown.** Use bold, bullet lists, `code`, blockquotes. Keep paragraphs short.

Also determine type: "shipped" if deployed, "wip" otherwise.

Use the same arc across all circles.

## 8. Show numbered preview

Show ALL versions with FULL content (no truncation):

```
vibecircle — Ready to share to N circles:

  Arc: <arc title> (Nth update)

  1. Friends (casual)
     [headline]
     [full body]

  2. Eng Team (technical)
     [headline]
     [full body]

  [📸 Screenshot attached (or "No screenshot")]

Post: [all] · [1,2,3] · [skip] · [edit 2] · [📸 add screenshot] · [🚀 ship arc]
```

Wait for user input:
- `all` → post to all circles
- `1,2` or `1,3` → post to specific circles by number
- `skip` → don't post
- `edit 2` → ask what to change for circle 2, update, re-show
- `📸` or `screenshot` → ask for file path
- `ship` or `🚀` → mark this as the final post, set arc to shipped after posting

## 9. Post to selected circles

For each selected circle, run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
  --circle-id <circleId> \
  --type <type> \
  --body "<body for this circle>" \
  --headline "<headline for this circle>" \
  --arc-id "<arcId>" \
  --arc-title "<arcTitle>" \
  --arc-sequence <arcSequence> \
  --ticket-source "<source>" \
  --ticket-id "<ticketId>" \
  --ticket-title "<ticketTitle>" \
  --ticket-url "<ticketUrl>" \
  --ticket-status "<ticketStatus>" \
  --epic-total <total> \
  --epic-done <done> \
  --epic-in-progress <inProgress>
```

Add `--screenshot <path>` if one was captured. Omit ticket/epic flags if not available.

## 10. Ship arc (if requested)

If user chose "ship":
```bash
curl -s -X PATCH -H "Authorization: Bearer <authToken>" -H "Content-Type: application/json" \
  -d '{"status":"shipped"}' \
  <apiUrl>/api/circles/<circleId>/arcs/<arcId>
```

## 11. Confirm

Tell user which circles were posted to: "Shared to Friends, Eng Team!"
If arc was shipped: "🚀 Arc '<arc title>' marked as shipped!"

Update the local arc-map cache with the new sequence number.
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/commands/share.md
git commit -m "feat: /share command with arc resolution chain and ship flow"
```

---

### Task 11: Deploy and verify

**Files:** None (verification only)

- [ ] **Step 1: Build the web app**

```bash
cd apps/web && npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Deploy to Vercel**

```bash
cd apps/web && vercel --prod
```

Expected: Deployment succeeds.

- [ ] **Step 3: Verify arcs API returns data**

```bash
# Get your auth token and circle ID from config
TOKEN=$(node -e "const c = require('$HOME/.vibecircle/config.json'); process.stdout.write(c.authToken)")
CIRCLE_ID=$(node -e "const c = require('$HOME/.vibecircle/config.json'); process.stdout.write(c.circles[0].id)")

curl -s -H "Authorization: Bearer $TOKEN" "https://vibecircle.dev/api/circles/$CIRCLE_ID/arcs" | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ const a=JSON.parse(d); console.log(a.length, 'arcs'); a.slice(0,3).forEach(a=>console.log(' -', a.title, '('+a.status+',', a.postCount, 'posts)')) })"
```

Expected: Lists existing arcs migrated from old data, each with status "active", post counts matching.

- [ ] **Step 4: Verify feed still loads**

Open https://vibecircle.dev in browser. Check:
- Posts load correctly
- Arc indicators show on posts that have arcs
- Sidebar shows arcs with the new format
- Clicking an arc filters the feed

- [ ] **Step 5: Test arc creation via API**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Test Arc","epicRef":null}' \
  "https://vibecircle.dev/api/circles/$CIRCLE_ID/arcs" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)))"
```

Expected: Returns created arc with UUID id.

- [ ] **Step 6: Test arc shipping**

```bash
ARC_ID=<id from step 5>
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"shipped"}' \
  "https://vibecircle.dev/api/circles/$CIRCLE_ID/arcs/$ARC_ID"
```

Expected: Returns arc with status "shipped" and shippedAt timestamp.

- [ ] **Step 7: Reload plugin and test /share**

In Claude Code:
```
/reload-plugins
```

Then test `/share` to verify the arc resolution chain works.

- [ ] **Step 8: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
