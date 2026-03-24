import { NextResponse } from "next/server"
import { updatePresence } from "@/lib/db/queries"
import { getAuthUserId } from "@/lib/api-auth"

const VALID_STATUSES = ["building", "online", "away"] as const

/** PUT /api/presence — update presence status */
export async function PUT(request: Request) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { circleId?: string; status?: string; activity?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { circleId, status, activity } = body

  if (!circleId || typeof circleId !== "string") {
    return NextResponse.json(
      { error: "circleId is required" },
      { status: 400 }
    )
  }

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    )
  }

  const row = await updatePresence(userId, circleId, status, activity)

  return NextResponse.json(row)
}
