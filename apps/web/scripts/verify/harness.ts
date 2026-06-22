/**
 * Verification harness — the reusable pieces that let tooling (and Claude)
 * drive this app end-to-end without a human in the loop.
 *
 * Two auth doors, mirroring the app itself:
 *   1. Web session  — dev-login (CSRF -> credentials callback) -> cookie jar.
 *                     Requires ENABLE_DEV_LOGIN=1 in the server's env.
 *   2. Plugin token — a `vc_` Bearer token from the api_tokens table.
 *
 * Nothing here is production code; it is only used by scripts/verify/*.
 */

import { neon } from "@neondatabase/serverless"
import { randomBytes } from "crypto"

export const BASE = process.env.VC_BASE_URL ?? "http://localhost:3000"

// ── tiny cookie jar over fetch ───────────────────────────────────────────────
export class Session {
  private jar: Record<string, string> = {}

  private absorb(res: Response) {
    const all = (res.headers as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    for (const c of all) {
      const [kv] = c.split(";")
      const i = kv.indexOf("=")
      if (i > 0) this.jar[kv.slice(0, i)] = kv.slice(i + 1)
    }
  }

  get cookie() {
    return Object.entries(this.jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")
  }

  async fetch(path: string, init: RequestInit = {}) {
    const res = await fetch(BASE + path, {
      ...init,
      headers: { ...(init.headers ?? {}), cookie: this.cookie },
      redirect: "manual",
    })
    this.absorb(res)
    return res
  }
}

/** Mint a logged-in web session for an existing user, by email. */
export async function devLogin(email: string): Promise<Session> {
  const s = new Session()
  const csrfRes = await s.fetch("/api/auth/csrf")
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

  const form = new URLSearchParams({ csrfToken, email, callbackUrl: BASE, json: "true" })
  const cb = await s.fetch("/api/auth/callback/dev-login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  })
  if (cb.status !== 302 && cb.status !== 200) {
    throw new Error(
      `dev-login failed (HTTP ${cb.status}). Is ENABLE_DEV_LOGIN=1 set and the server restarted? ` +
        `Does a user with email ${email} exist?`
    )
  }
  const session = (await (await s.fetch("/api/auth/session")).json()) as { user?: { id?: string } }
  if (!session?.user?.id) throw new Error("dev-login produced no session — check ENABLE_DEV_LOGIN.")
  return s
}

// ── DB helpers (read existing data / mint a plugin token) ────────────────────
function db() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set (run from apps/web so .env.local loads).")
  return neon(url)
}

export async function userIdByEmail(email: string): Promise<string | null> {
  const r = await db()`select id from users where email=${email} limit 1`
  return r[0]?.id ?? null
}

/** Reuse an existing plugin token for the user, or create one if none exists. */
export async function getOrCreateToken(email: string): Promise<string> {
  const sql = db()
  const existing = await sql`
    select t.token from api_tokens t join users u on u.id = t.user_id
    where u.email = ${email} order by t.created_at desc nulls last limit 1`
  if (existing[0]?.token) return existing[0].token as string

  const uid = await userIdByEmail(email)
  if (!uid) throw new Error(`No user with email ${email}`)
  const token = `vc_${randomBytes(32).toString("hex")}`
  await sql`insert into api_tokens (user_id, token, name) values (${uid}, ${token}, 'verify-harness')`
  return token
}

/** Pick a circle the user belongs to that has posts (best target for smoke). */
export async function pickCircle(email: string): Promise<{ id: string; name: string } | null> {
  const sql = db()
  const r = await sql`
    select c.id, c.name, (select count(*)::int from posts p where p.circle_id = c.id) as posts
    from circles c
    join circle_members m on m.circle_id = c.id
    join users u on u.id = m.user_id
    where u.email = ${email}
    order by posts desc limit 1`
  return r[0] ? { id: r[0].id as string, name: r[0].name as string } : null
}

export async function bearerFetch(token: string, path: string, init: RequestInit = {}) {
  return fetch(BASE + path, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}`, "content-type": "application/json" },
    redirect: "manual",
  })
}
