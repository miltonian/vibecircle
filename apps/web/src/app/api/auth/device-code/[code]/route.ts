import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deviceCodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/** GET — Poll for device code status (plugin calls this) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const [device] = await db
    .select()
    .from(deviceCodes)
    .where(eq(deviceCodes.code, code))
    .limit(1)

  if (!device) {
    return NextResponse.json({ status: "expired" }, { status: 404 })
  }

  // Check if expired
  if (device.expiresAt < new Date()) {
    // Mark as expired if still pending
    if (device.status === "pending") {
      await db
        .update(deviceCodes)
        .set({ status: "expired" })
        .where(eq(deviceCodes.id, device.id))
    }
    return NextResponse.json({ status: "expired" })
  }

  if (device.status === "pending") {
    return NextResponse.json({ status: "pending" })
  }

  if (device.status === "authorized") {
    return NextResponse.json({
      status: "authorized",
      token: device.token,
      circleId: device.circleId,
      apiUrl: "https://web-mauve-two-91.vercel.app",
    })
  }

  // Fallback for any other status
  return NextResponse.json({ status: device.status })
}
