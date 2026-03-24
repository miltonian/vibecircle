import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createPost } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { jwtDecrypt } from "jose"

const VALID_TYPES = ["shipped", "wip", "video", "live", "ambient"] as const

/** Required metadata keys per post type */
const REQUIRED_METADATA: Record<string, string[]> = {
  shipped: ["repo_url", "deploy_url", "commits_count", "files_changed"],
  wip: ["repo_url"],
  video: [],
  live: ["deploy_url"],
  ambient: ["commits_count", "files_changed"],
}

/** Derive the same encryption key Auth.js uses from AUTH_SECRET */
async function getDerivedKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")

  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "HKDF",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode(""), info: enc.encode("Auth.js Generated Encryption Key") },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

/** Get user ID from session or Bearer token */
async function getAuthUserId(request: Request): Promise<string | null> {
  // Try session auth first
  const session = await auth()
  if (session?.user?.id) {
    return session.user.id
  }

  // Try Bearer token auth (for plugin: the token is a session JWT)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    try {
      // Auth.js v5 with JWT strategy uses JWE (encrypted JWT) with a derived key
      const derivedKey = await getDerivedKey()
      const { payload } = await jwtDecrypt(token, derivedKey)
      if (payload.id && typeof payload.id === "string") {
        return payload.id
      }
    } catch {
      // Invalid token — fall through to return null
    }
  }

  return null
}

/** POST /api/circles/[id]/posts — create a post in a circle */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: circleId } = await params

  // Verify user is a member of this circle
  const [membership] = await db
    .select()
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.userId, userId)
      )
    )
    .limit(1)

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this circle" },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Validate type
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid post type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  // Validate required metadata keys per type
  const requiredKeys = REQUIRED_METADATA[body.type] ?? []
  if (requiredKeys.length > 0) {
    const metadata = body.metadata ?? {}
    const missing = requiredKeys.filter((key) => !(key in metadata))
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required metadata for type "${body.type}": ${missing.join(", ")}`,
        },
        { status: 400 }
      )
    }
  }

  const post = await createPost(circleId, userId, {
    type: body.type,
    body: body.body ?? null,
    media: body.media ?? null,
    metadata: body.metadata ?? null,
  })

  return NextResponse.json(post, { status: 201 })
}
