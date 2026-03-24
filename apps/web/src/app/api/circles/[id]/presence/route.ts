import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCirclePresence, getRecentActivity } from "@/lib/db/queries"

/** GET /api/circles/[id]/presence — get presence for all circle members */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

  const [members, activity] = await Promise.all([
    getCirclePresence(circleId),
    getRecentActivity(circleId),
  ])

  return NextResponse.json({ members, activity })
}
