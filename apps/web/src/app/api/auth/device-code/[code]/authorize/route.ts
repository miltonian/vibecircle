import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { deviceCodes, apiTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { randomBytes } from "crypto"

/** POST — Authorize a device code (user clicks "Authorize" in browser) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { code } = await params
  const body = await request.json().catch(() => ({}))
  const { circleId } = body

  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 })
  }

  // Look up device code
  const [device] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code))
    .limit(1)

  if (!device) {
    return NextResponse.json({ error: "Device code not found" }, { status: 404 })
  }

  if (device.status !== "pending") {
    return NextResponse.json({ error: "Device code already used or expired" }, { status: 400 })
  }

  if (device.expiresAt < new Date()) {
    await db
      .update(deviceCodes)
      .set({ status: "expired" })
      .where(eq(deviceCodes.id, device.id))
    return NextResponse.json({ error: "Device code expired" }, { status: 400 })
  }

  // Generate an API token (same as /api/settings/token)
  const token = `vc_${randomBytes(32).toString("hex")}`

  await db.insert(apiTokens).values({
    userId: session.user.id,
    token,
    name: "Claude Code Plugin (device auth)",
  })

  // Update device code with authorization info
  await db
    .update(deviceCodes)
    .set({
      userId: session.user.id,
      token,
      circleId,
      status: "authorized",
    })
    .where(eq(deviceCodes.id, device.id))

  return NextResponse.json({ ok: true })
}
