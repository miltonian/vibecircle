/**
 * Authorization harness — proves the membership checks added for the security
 * review actually deny non-members while still allowing members.
 *
 *   cd apps/web && bun run scripts/verify/authz.ts
 *
 * MEMBER     = sandbox owner (allowed)
 * NON-MEMBER = dave@example.com (a real user who is NOT in the sandbox circle)
 *
 * All writes are against a throwaway sandbox circle/post, and non-member calls
 * are rejected before any write, so real circles are never touched. The sandbox
 * is deleted by id at the end (the invite test rotates the code, so we can't rely
 * on the code-based teardown). Exit code = number of failures.
 */

import { execFileSync } from "child_process"
import { join } from "path"
import { neon } from "@neondatabase/serverless"
import { devLogin, Session } from "./harness"

const sql = neon(process.env.DATABASE_URL!)
const MEMBER = "miltonian3@gmail.com"
const NON_MEMBER = "dave@example.com"
const VERIFY_DIR = (import.meta as unknown as { dir: string }).dir

interface Case {
  name: string
  method: string
  path: string
  body?: unknown
  memberExpect: number | null // null = skip the member (allowed) check
}

const results: { name: string; who: string; ok: boolean; detail: string }[] = []

async function call(s: Session, c: Case): Promise<number> {
  const res = await s.fetch(c.path, {
    method: c.method,
    headers: c.body ? { "content-type": "application/json" } : {},
    body: c.body ? JSON.stringify(c.body) : undefined,
  })
  return res.status
}

async function destroy(circleId: string) {
  const postIds = (await sql`select id from posts where circle_id=${circleId}`).map((r: any) => r.id)
  if (postIds.length) {
    await sql`delete from comments where post_id = ANY(${postIds})`
    await sql`delete from reactions where post_id = ANY(${postIds})`
  }
  await sql`delete from posts where circle_id=${circleId}`
  await sql`delete from arcs where circle_id=${circleId}`
  await sql`delete from presence where circle_id=${circleId}`
  await sql`delete from circle_members where circle_id=${circleId}`
  await sql`delete from circles where id=${circleId}`
}

async function main() {
  const setup = JSON.parse(
    execFileSync("bun", ["run", join(VERIFY_DIR, "sandbox.ts"), "setup", MEMBER], { encoding: "utf8" })
  )
  const CID: string = setup.circleId
  const PID: string = setup.posts[0]
  const foreignArc = (await sql`select id from arcs where circle_id <> ${CID} limit 1`)[0]?.id as string | undefined

  const member = await devLogin(MEMBER)
  const nonMember = await devLogin(NON_MEMBER)

  const cases: Case[] = [
    { name: "invite (rotate code)", method: "POST", path: `/api/circles/${CID}/invite`, memberExpect: 200 },
    { name: "presence GET", method: "GET", path: `/api/circles/${CID}/presence`, memberExpect: 200 },
    { name: "presence PUT", method: "PUT", path: `/api/presence`, body: { circleId: CID, status: "online" }, memberExpect: 200 },
    { name: "comments GET", method: "GET", path: `/api/posts/${PID}/comments`, memberExpect: 200 },
    { name: "comments POST", method: "POST", path: `/api/posts/${PID}/comments`, body: { body: "authz test" }, memberExpect: 201 },
    { name: "reactions POST", method: "POST", path: `/api/posts/${PID}/reactions`, body: { emoji: "👍" }, memberExpect: 200 },
    // explain: only assert the non-member is denied — the member path would spend a real API key.
    { name: "explain POST", method: "POST", path: `/api/posts/${PID}/explain`, memberExpect: null },
  ]

  try {
    for (const c of cases) {
      if (c.memberExpect !== null) {
        const m = await call(member, c)
        results.push({ name: c.name, who: "member", ok: m === c.memberExpect, detail: `${m} (want ${c.memberExpect})` })
      }
      const n = await call(nonMember, c)
      results.push({ name: c.name, who: "non-member", ok: n === 403, detail: `${n} (want 403)` })
    }

    // Arc tampering: a member of THIS circle posting with an arcId from ANOTHER circle must be rejected.
    if (foreignArc) {
      const s = await member.fetch(`/api/circles/${CID}/posts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "wip", body: "x", arcId: foreignArc }),
      })
      results.push({ name: "cross-circle arc rejected", who: "member", ok: s.status === 400, detail: `${s.status} (want 400)` })
    }
  } finally {
    await destroy(CID)
  }

  console.log(`\nvibecircle authorization checks (member=${MEMBER}, non-member=${NON_MEMBER})\n`)
  const pad = (s: string, n: number) => s.padEnd(n)
  for (const r of results) {
    console.log(`${pad(r.ok ? "PASS" : "FAIL", 6)}${pad(r.who, 12)}${pad(r.name, 28)}${r.ok ? "" : "  ← got " + r.detail}`)
  }
  const fails = results.filter((r) => !r.ok)
  console.log(`\n${results.length - fails.length}/${results.length} authorization checks passed.`)
  process.exit(fails.length)
}

main().catch((e) => {
  console.error("authz harness crashed:", e)
  process.exit(2)
})
