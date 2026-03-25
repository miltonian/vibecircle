import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/** GET /api/settings/token/check — lightweight check if user has a plugin token */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token] = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.userId, session.user.id))
    .limit(1)

  return NextResponse.json({ hasToken: !!token })
}
