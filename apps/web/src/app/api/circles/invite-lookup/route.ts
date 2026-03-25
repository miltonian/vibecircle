import { NextResponse } from "next/server"
import { getCircleByInviteCode } from "@/lib/db/queries"

/** GET /api/circles/invite-lookup?code=XXXX — look up circle by invite code (public) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    )
  }

  const circle = await getCircleByInviteCode(code)

  if (!circle) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    )
  }

  return NextResponse.json({ id: circle.id, name: circle.name })
}
