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
