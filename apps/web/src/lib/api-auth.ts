import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/**
 * Get the authenticated user ID from either:
 * 1. Auth.js session (web app)
 * 2. Bearer token (plugin — looked up in api_tokens table)
 */
export async function getAuthUserId(request: Request): Promise<string | null> {
  // Try session auth first (web app)
  const session = await auth()
  if (session?.user?.id) {
    return session.user.id
  }

  // Try Bearer token auth (plugin)
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)

    const [found] = await db
      .select({ userId: apiTokens.userId })
      .from(apiTokens)
      .where(eq(apiTokens.token, token))
      .limit(1)

    if (found) {
      // Update last_used_at (fire and forget)
      db.update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.token, token))
        .then(() => {})
        .catch(() => {})

      return found.userId
    }
  }

  return null
}
