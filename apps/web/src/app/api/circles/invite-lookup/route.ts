import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCircleByInviteCode } from "@/lib/db/queries"

/** GET /api/circles/invite-lookup?code=XXXX — look up circle by invite code */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
