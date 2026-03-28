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

  if (body.status && body.status !== "active" && body.status !== "shipped") {
    return NextResponse.json(
      { error: "status must be 'active' or 'shipped'" },
      { status: 400 }
    )
  }

  if (!body.status) {
    return NextResponse.json(arc)
  }

  const updated = await updateArcStatus(arcId, body.status)
  return NextResponse.json(updated)
}
