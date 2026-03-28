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

  // Auto-reopen shipped arcs when a new post is added
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
    arcTitle: body.arcTitle ?? null,
    arcSequence: body.arcSequence != null ? Number(body.arcSequence) : null,
  })

  return NextResponse.json(post, { status: 201 })
}
