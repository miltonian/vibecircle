import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserCircles, createCircle } from "@/lib/db/queries"

/** GET /api/circles — list the authenticated user's circles */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const circles = await getUserCircles(session.user.id)
  return NextResponse.json(circles)
}

/** POST /api/circles — create a new circle */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const name = body?.name?.trim()

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Circle name is required" },
      { status: 400 }
    )
  }

  if (name.length > 50) {
    return NextResponse.json(
      { error: "Circle name must be 50 characters or fewer" },
      { status: 400 }
    )
  }

  const circle = await createCircle(name, session.user.id)

  return NextResponse.json(circle, { status: 201 })
}
