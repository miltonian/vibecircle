import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updatePresence } from "@/lib/db/queries"

const VALID_STATUSES = ["building", "online", "away"] as const

/** Resolve the authenticated user ID from session or Bearer token */
async function resolveUserId(request: Request): Promise<string | null> {
  // Check for Bearer token first (plugin auth)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    // For plugin auth, the token is expected to be the user ID
    // In production this would validate a JWT or API key
    if (token && token.length > 0) {
      return token
    }
  }

  // Fall back to session auth (web)
  const session = await auth()
  return session?.user?.id ?? null
}

/** PUT /api/presence — update presence status */
export async function PUT(request: Request) {
  const userId = await resolveUserId(request)
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
