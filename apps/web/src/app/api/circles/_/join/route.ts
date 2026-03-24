import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { joinCircle } from "@/lib/db/queries"

/** POST /api/circles/_/join — join a circle using an invite code (no circle ID needed) */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const inviteCode = body?.inviteCode?.trim()

  if (!inviteCode || typeof inviteCode !== "string") {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    )
  }

  const circle = await joinCircle(inviteCode, session.user.id)

  if (!circle) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    )
  }

  return NextResponse.json(circle)
}
