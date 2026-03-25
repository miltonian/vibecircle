import { eq, and, desc, lt, sql, count } from "drizzle-orm"
import { db } from "."
import { circles, circleMembers, users, posts, reactions, comments, presence, apiTokens } from "./schema"
import type { NewPost } from "./schema"

/** Generate a short random alphanumeric invite code (8 chars) */
function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

/** Return all circles a user belongs to, with their role */
export async function getUserCircles(userId: string) {
  const rows = await db
    .select({
      id: circles.id,
      name: circles.name,
      inviteCode: circles.inviteCode,
      createdAt: circles.createdAt,
      role: circleMembers.role,
    })
    .from(circleMembers)
    .innerJoin(circles, eq(circleMembers.circleId, circles.id))
    .where(eq(circleMembers.userId, userId))

  return rows
}

/** Create a circle and add the creator as owner */
export async function createCircle(name: string, userId: string) {
  const inviteCode = generateCode()

  const [circle] = await db
    .insert(circles)
    .values({
      name,
      createdBy: userId,
      inviteCode,
    })
    .returning()

  await db.insert(circleMembers).values({
    circleId: circle.id,
    userId,
    role: "owner",
  })

  return circle
}

/** Generate a new invite code for a circle */
export async function generateInvite(circleId: string) {
  const code = generateCode()

  await db
    .update(circles)
    .set({ inviteCode: code })
    .where(eq(circles.id, circleId))

  return code
}

/** Look up a circle by invite code and add the user as a member */
export async function joinCircle(inviteCode: string, userId: string) {
  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.inviteCode, inviteCode))
    .limit(1)

  if (!circle) {
    return null
  }

  // Check if user is already a member
  const [existing] = await db
    .select()
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circle.id),
        eq(circleMembers.userId, userId)
      )
    )
    .limit(1)

  if (existing) {
    return circle // Already a member, just return the circle
  }

  await db.insert(circleMembers).values({
    circleId: circle.id,
    userId,
    role: "member",
  })

  return circle
}

/** Return all members of a circle with user info and plugin status */
export async function getCircleMembers(circleId: string) {
  const rows = await db
    .select({
      userId: circleMembers.userId,
      role: circleMembers.role,
      joinedAt: circleMembers.joinedAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      image: users.image,
      tokenId: apiTokens.id,
    })
    .from(circleMembers)
    .innerJoin(users, eq(circleMembers.userId, users.id))
    .leftJoin(apiTokens, eq(circleMembers.userId, apiTokens.userId))
    .where(eq(circleMembers.circleId, circleId))

  // Deduplicate (user might have multiple tokens)
  const seen = new Set<string>()
  return rows.filter((r) => {
    if (seen.has(r.userId)) return false
    seen.add(r.userId)
    return true
  }).map((r) => ({
    userId: r.userId,
    role: r.role,
    joinedAt: r.joinedAt,
    name: r.name,
    email: r.email,
    avatarUrl: r.avatarUrl,
    image: r.image,
    hasPlugin: !!r.tokenId,
  }))
}

/** Get a single circle by ID */
export async function getCircleById(circleId: string) {
  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.id, circleId))
    .limit(1)

  return circle ?? null
}

/** Get a circle by its invite code */
export async function getCircleByInviteCode(inviteCode: string) {
  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.inviteCode, inviteCode))
    .limit(1)

  return circle ?? null
}

// ── Post Queries ────────────────────────────────────────────────────────────

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

/** Get a paginated feed of posts for a circle, newest first */
export async function getFeed(
  circleId: string,
  opts: { cursor?: string; limit?: number } = {}
) {
  const limit = opts.limit ?? 20

  // Build conditions
  const conditions = [eq(posts.circleId, circleId)]

  // If cursor is provided, get the cursor post's createdAt for pagination
  if (opts.cursor) {
    const [cursorPost] = await db
      .select({ createdAt: posts.createdAt })
      .from(posts)
      .where(eq(posts.id, opts.cursor))
      .limit(1)

    if (cursorPost?.createdAt) {
      conditions.push(lt(posts.createdAt, cursorPost.createdAt))
    }
  }

  // Fetch posts with author info
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
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit + 1) // Fetch one extra to determine if there's a next page

  const hasMore = rows.length > limit
  const feedRows = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? feedRows[feedRows.length - 1].id : null

  if (feedRows.length === 0) {
    return { posts: [], nextCursor: null }
  }

  // Get post IDs for batch queries
  const postIds = feedRows.map((r) => r.id)

  // Fetch reaction counts grouped by emoji for all posts
  const reactionRows = await db
    .select({
      postId: reactions.postId,
      emoji: reactions.emoji,
      count: count(),
    })
    .from(reactions)
    .where(sql`${reactions.postId} IN ${postIds}`)
    .groupBy(reactions.postId, reactions.emoji)

  // Fetch comment counts for all posts
  const commentRows = await db
    .select({
      postId: comments.postId,
      count: count(),
    })
    .from(comments)
    .where(sql`${comments.postId} IN ${postIds}`)
    .groupBy(comments.postId)

  // Build lookup maps
  const reactionMap = new Map<string, Record<string, number>>()
  for (const r of reactionRows) {
    if (!reactionMap.has(r.postId)) {
      reactionMap.set(r.postId, {})
    }
    reactionMap.get(r.postId)![r.emoji] = Number(r.count)
  }

  const commentMap = new Map<string, number>()
  for (const c of commentRows) {
    commentMap.set(c.postId, Number(c.count))
  }

  // Assemble final post objects
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

  return { posts: enrichedPosts, nextCursor }
}

/** Get a single post with author info */
export async function getPost(postId: string) {
  const [row] = await db
    .select({
      id: posts.id,
      circleId: posts.circleId,
      type: posts.type,
      body: posts.body,
      media: posts.media,
      metadata: posts.metadata,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorImage: users.image,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1)

  if (!row) return null

  return {
    id: row.id,
    circleId: row.circleId,
    type: row.type,
    body: row.body,
    media: row.media,
    metadata: row.metadata,
    createdAt: row.createdAt,
    author: {
      id: row.authorId,
      name: row.authorName,
      avatarUrl: row.authorAvatarUrl ?? row.authorImage,
    },
  }
}

/** Get active arcs for a circle — grouped by arcId with post count and latest timestamp */
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

  const arcMap = new Map<string, { arcId: string; arcTitle: string | null; authorId: string; authorName: string | null; postCount: number; latestAt: Date | null }>()

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

// ── Presence Queries ─────────────────────────────────────────────────────────

/** Upsert a presence row for a user in a circle */
export async function updatePresence(
  userId: string,
  circleId: string,
  status: string,
  activity?: string | null
) {
  const [row] = await db
    .insert(presence)
    .values({
      userId,
      circleId,
      status,
      activity: activity ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [presence.userId, presence.circleId],
      set: {
        status,
        activity: activity ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()

  return row
}

/** Get all presence info for a circle, joined with user info.
 *  Overrides status to "away" if updatedAt is older than 5 minutes. */
export async function getCirclePresence(circleId: string) {
  const rows = await db
    .select({
      userId: presence.userId,
      status: presence.status,
      activity: presence.activity,
      updatedAt: presence.updatedAt,
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
    })
    .from(presence)
    .innerJoin(users, eq(presence.userId, users.id))
    .where(eq(presence.circleId, circleId))

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    avatarUrl: row.avatarUrl ?? row.image,
    status: row.updatedAt && row.updatedAt < fiveMinutesAgo ? "away" : row.status,
    activity: row.activity,
    updatedAt: row.updatedAt,
  }))
}

// ── Reaction Queries ────────────────────────────────────────────────────────

/** Toggle a reaction on a post. If the user already reacted with this emoji,
 *  remove it; otherwise, add it. Returns { added: boolean }. */
export async function toggleReaction(
  postId: string,
  userId: string,
  emoji: string
) {
  // Check if reaction already exists
  const [existing] = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.postId, postId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, emoji)
      )
    )
    .limit(1)

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id))
    return { added: false }
  }

  await db.insert(reactions).values({ postId, userId, emoji })
  return { added: true }
}

/** Get reactions for a post, grouped by emoji with counts and user IDs */
export async function getReactions(postId: string) {
  const rows = await db
    .select({
      emoji: reactions.emoji,
      userId: reactions.userId,
    })
    .from(reactions)
    .where(eq(reactions.postId, postId))

  // Group by emoji
  const grouped = new Map<string, string[]>()
  for (const row of rows) {
    if (!grouped.has(row.emoji)) {
      grouped.set(row.emoji, [])
    }
    grouped.get(row.emoji)!.push(row.userId)
  }

  return Array.from(grouped.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }))
}

// ── Comment Queries ─────────────────────────────────────────────────────────

/** Add a comment to a post. Returns the comment with author info. */
export async function addComment(
  postId: string,
  authorId: string,
  body: string,
  isAi = false
) {
  const [comment] = await db
    .insert(comments)
    .values({ postId, authorId, body, isAi })
    .returning()

  // Fetch author info
  const [author] = await db
    .select({
      name: users.name,
      avatarUrl: users.avatarUrl,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, authorId))
    .limit(1)

  return {
    id: comment.id,
    postId: comment.postId,
    body: comment.body,
    isAi: comment.isAi,
    createdAt: comment.createdAt,
    author: {
      id: authorId,
      name: author?.name ?? null,
      avatarUrl: author?.avatarUrl ?? author?.image ?? null,
    },
  }
}

/** Get all comments for a post with author info, ordered by created_at ASC */
export async function getComments(postId: string) {
  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      body: comments.body,
      isAi: comments.isAi,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
      authorImage: users.image,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt)

  return rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    body: row.body,
    isAi: row.isAi,
    createdAt: row.createdAt,
    author: {
      id: row.authorId,
      name: row.authorName,
      avatarUrl: row.authorAvatarUrl ?? row.authorImage ?? null,
    },
  }))
}

/** Get recent posts/events for the activity ticker.
 *  Returns last 10 events formatted for display. */
export async function getRecentActivity(circleId: string) {
  const rows = await db
    .select({
      type: posts.type,
      body: posts.body,
      createdAt: posts.createdAt,
      authorName: users.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.circleId, circleId))
    .orderBy(desc(posts.createdAt))
    .limit(10)

  const typeToAction: Record<string, string> = {
    shipped: "shipped something",
    wip: "started new project",
    video: "shared a video",
    live: "went live",
    ambient: "shared an update",
  }

  return rows.map((row) => ({
    userName: row.authorName ?? "Someone",
    action: typeToAction[row.type] ?? "posted",
  }))
}
