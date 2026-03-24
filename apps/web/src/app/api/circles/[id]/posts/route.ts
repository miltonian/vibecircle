import { NextResponse } from "next/server"
import { createPost } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getAuthUserId } from "@/lib/api-auth"

const VALID_TYPES = ["shipped", "wip", "video", "live", "ambient"] as const

/** Required metadata keys per post type */
const REQUIRED_METADATA: Record<string, string[]> = {
  shipped: ["repo_url", "deploy_url", "commits_count", "files_changed"],
  wip: ["repo_url"],
  video: [],
  live: ["deploy_url"],
  ambient: ["commits_count", "files_changed"],
}

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

  // Validate required metadata keys per type
  const requiredKeys = REQUIRED_METADATA[body.type] ?? []
  if (requiredKeys.length > 0) {
    const metadata = body.metadata ?? {}
    const missing = requiredKeys.filter((key) => !(key in metadata))
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required metadata for type "${body.type}": ${missing.join(", ")}`,
        },
        { status: 400 }
      )
    }
  }

  const post = await createPost(circleId, userId, {
    type: body.type,
    body: body.body ?? null,
    media: body.media ?? null,
    metadata: body.metadata ?? null,
  })

  return NextResponse.json(post, { status: 201 })
}
