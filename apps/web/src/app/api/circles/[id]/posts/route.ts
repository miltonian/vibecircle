import { NextResponse } from "next/server"
import { createPost, getArc, updateArcStatus } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getAuthUserId } from "@/lib/api-auth"
import { validateBlocks, BlockValidationError, type PostBlock } from "@/lib/post-blocks"

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

  // Validate optional rich blocks. Reject the whole post if they're malformed —
  // only in-spec blocks ever reach the database.
  let blocks: PostBlock[] | null = null
  if (body.blocks != null) {
    try {
      blocks = validateBlocks(body.blocks)
    } catch (err) {
      if (err instanceof BlockValidationError) {
        return NextResponse.json({ error: `Invalid blocks: ${err.message}` }, { status: 400 })
      }
      throw err
    }
  }

  // An arcId in the body must belong to THIS circle — otherwise a member of one
  // circle could attach posts to, or reopen the shipped arcs of, another circle.
  if (body.arcId) {
    const arc = await getArc(body.arcId)
    if (!arc || arc.circleId !== circleId) {
      return NextResponse.json(
        { error: "Arc does not belong to this circle" },
        { status: 400 }
      )
    }
    // Auto-reopen shipped arcs when a new post is added.
    if (arc.status === "shipped") {
      await updateArcStatus(body.arcId, "active")
    }
  }

  const post = await createPost(circleId, userId, {
    type: body.type,
    body: body.body ?? null,
    media: body.media ?? null,
    metadata: body.metadata ?? null,
    blocks,
    headline: body.headline ?? null,
    arcId: body.arcId ?? null,
    arcTitle: body.arcTitle ?? null,
    arcSequence: body.arcSequence != null ? Number(body.arcSequence) : null,
  })

  return NextResponse.json(post, { status: 201 })
}
