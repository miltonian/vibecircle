import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateInvite, isCircleMember } from "@/lib/db/queries"

/** POST /api/circles/[id]/invite — generate a new invite code */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

  // Only members may rotate a circle's invite code.
  if (!(await isCircleMember(circleId, session.user.id))) {
    return NextResponse.json(
      { error: "You are not a member of this circle" },
      { status: 403 }
    )
  }

  const inviteCode = await generateInvite(circleId)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const inviteUrl = `${baseUrl}/invite/${inviteCode}`

  return NextResponse.json({ inviteCode, inviteUrl })
}
