import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/api-auth"
import { getCircleMembers } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

/** GET /api/circles/[id]/members — list all members of a circle */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Accept either a web session or a plugin Bearer token (same as feed/arcs).
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

  // Verify user is a member
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

  const members = await getCircleMembers(circleId)
  return NextResponse.json(members)
}
