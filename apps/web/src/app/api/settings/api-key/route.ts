import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/** GET /api/settings/api-key — check if user has an API key configured */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [user] = await db
    .select({
      apiKey: users.apiKey,
      apiKeyProvider: users.apiKeyProvider,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return NextResponse.json({
    hasKey: !!user?.apiKey,
    provider: user?.apiKeyProvider ?? null,
  })
}

/** PUT /api/settings/api-key — save user's API key and provider */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { apiKey, provider } = body as {
    apiKey?: string
    provider?: string
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return NextResponse.json(
      { error: "API key is required" },
      { status: 400 }
    )
  }

  if (!provider || !["openai", "anthropic"].includes(provider)) {
    return NextResponse.json(
      { error: "Provider must be 'openai' or 'anthropic'" },
      { status: 400 }
    )
  }

  await db
    .update(users)
    .set({
      apiKey: apiKey.trim(),
      apiKeyProvider: provider,
    })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ hasKey: true, provider })
}
