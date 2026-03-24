import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiTokens } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { randomBytes } from "crypto"

/** POST — Generate a new API token for the current user */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name = body.name || "Claude Code Plugin"

  // Generate a secure random token prefixed with "vc_" for easy identification
  const token = `vc_${randomBytes(32).toString("hex")}`

  const [created] = await db
    .insert(apiTokens)
    .values({
      userId: session.user.id,
      token,
      name,
    })
    .returning()

  return NextResponse.json({
    token: created.token,
    name: created.name,
    id: created.id,
    createdAt: created.createdAt,
  }, { status: 201 })
}

/** GET — List user's tokens (without revealing full token values) */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tokens = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPreview: apiTokens.token, // We'll mask this
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, session.user.id))

  return NextResponse.json(
    tokens.map((t) => ({
      ...t,
      tokenPreview: `${t.tokenPreview.slice(0, 7)}...${t.tokenPreview.slice(-4)}`,
    }))
  )
}

/** DELETE — Revoke a token */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  if (!body.id) {
    return NextResponse.json({ error: "Token ID required" }, { status: 400 })
  }

  await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, body.id), eq(apiTokens.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
