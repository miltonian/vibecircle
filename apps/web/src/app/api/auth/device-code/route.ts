import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deviceCodes } from "@/lib/db/schema"

/** Generate a random 8-char uppercase alphanumeric code (no ambiguous chars) */
function generateDeviceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O, 1/I/L
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

/** POST — Create a new device code for the auth flow */
export async function POST() {
  const code = generateDeviceCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  const [created] = await db
    .insert(deviceCodes)
    .values({
      code,
      status: "pending",
      expiresAt,
    })
    .returning()

  return NextResponse.json({
    code: created.code,
    expiresAt: created.expiresAt,
    pollUrl: `/api/auth/device-code/${created.code}`,
    authorizeUrl: `https://web-mauve-two-91.vercel.app/setup/device?code=${created.code}`,
  }, { status: 201 })
}
