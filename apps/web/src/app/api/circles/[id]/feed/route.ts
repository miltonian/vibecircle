import { NextResponse } from "next/server"
import { getFeed } from "@/lib/db/queries"
import { getAuthUserId } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/** GET /api/circles/[id]/feed — paginated feed of posts */
export async function GET(
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

  // Parse query params
  const url = new URL(request.url)
  const cursor = url.searchParams.get("cursor") ?? undefined
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 50) : 20

  const feed = await getFeed(circleId, { cursor, limit })

  return NextResponse.json(feed)
}
