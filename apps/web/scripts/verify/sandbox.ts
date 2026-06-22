/**
 * Isolated sandbox circle for write/interaction testing on the LIVE database
 * without touching real circles or notifying real teammates.
 *
 *   cd apps/web && bun run scripts/verify/sandbox.ts setup [ownerEmail]
 *   cd apps/web && bun run scripts/verify/sandbox.ts teardown
 *
 * The sandbox is identified by a fixed invite code so setup/teardown are
 * idempotent. teardown deletes ONLY rows belonging to the sandbox circle.
 */

import { neon } from "@neondatabase/serverless"
import { randomUUID } from "crypto"

const sql = neon(process.env.DATABASE_URL!)
const INVITE = "VERIFYSB"
const NAME = "🧪 verify-sandbox"

async function ownerId(email: string): Promise<string> {
  const r = await sql`select id from users where email=${email} limit 1`
  if (!r[0]) throw new Error(`no user ${email}`)
  return r[0].id as string
}

async function findCircle(): Promise<string | null> {
  const r = await sql`select id from circles where invite_code=${INVITE} limit 1`
  return r[0]?.id ?? null
}

async function setup(email: string) {
  await teardown(true) // start clean
  const owner = await ownerId(email)
  const circleId = randomUUID()
  const arcId = randomUUID()

  await sql`insert into circles (id, name, created_by, invite_code) values (${circleId}, ${NAME}, ${owner}, ${INVITE})`
  await sql`insert into circle_members (circle_id, user_id, role) values (${circleId}, ${owner}, 'owner')`
  await sql`insert into arcs (id, circle_id, title, status, created_by) values (${arcId}, ${circleId}, 'Sandbox Arc', 'active', ${owner})`

  const mk = (type: string, body: string, extra: Record<string, unknown> = {}) => ({
    id: randomUUID(),
    type,
    body,
    ...extra,
  })
  const posts = [
    mk("shipped", "Shipped the sandbox demo app — try it live!", {
      headline: "Shipped the sandbox demo",
      metadata: { repo_url: "https://github.com/example/sandbox", deploy_url: "https://example.com", commits_count: 12, files_changed: 8 },
    }),
    mk("wip", "Wiring up the sandbox arc, sequence 1.", { arcId, arcTitle: "Sandbox Arc", arcSequence: 1 }),
    mk("ambient", "Sandbox arc, sequence 2 — refactor pass.", { arcId, arcTitle: "Sandbox Arc", arcSequence: 2 }),
  ]
  for (const p of posts) {
    await sql`insert into posts (id, circle_id, author_id, type, body, headline, metadata, arc_id, arc_title, arc_sequence)
      values (${p.id}, ${circleId}, ${owner}, ${p.type}, ${p.body}, ${(p as any).headline ?? null},
              ${(p as any).metadata ?? null}, ${(p as any).arcId ?? null}, ${(p as any).arcTitle ?? null}, ${(p as any).arcSequence ?? null})`
  }
  // a rich "block kit" post, so the sandbox showcases blocks rendering alongside
  // the markdown posts above (backward-compat in one view).
  const blockPostId = randomUUID()
  const blocks = [
    { type: "callout", tone: "success", text: "Shipped dark mode 🌙" },
    { type: "text", text: "Reworked the **theming** layer to use CSS variables." },
    { type: "metrics", items: [{ label: "files", value: "12" }, { label: "commits", value: "5" }] },
    { type: "steps", items: ["Add design tokens", "Swap hardcoded colors", "Ship it"] },
    { type: "deploy", url: "https://example.com", label: "See it live" },
  ]
  await sql`insert into posts (id, circle_id, author_id, type, headline, blocks)
    values (${blockPostId}, ${circleId}, ${owner}, 'shipped', 'Rich block post', ${JSON.stringify(blocks)}::jsonb)`

  // one comment + one reaction on the first post so comment/reaction rendering has data
  await sql`insert into comments (post_id, author_id, body) values (${posts[0].id}, ${owner}, 'Sandbox seed comment')`
  await sql`insert into reactions (post_id, user_id, emoji) values (${posts[0].id}, ${owner}, '🔥')`

  console.log(JSON.stringify({ circleId, invite: INVITE, posts: posts.map((p) => p.id) }, null, 2))
}

async function teardown(quiet = false) {
  const circleId = await findCircle()
  if (!circleId) {
    if (!quiet) console.log("no sandbox circle to remove")
    return
  }
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
  if (!quiet) console.log(`removed sandbox circle ${circleId}`)
}

const cmd = process.argv[2]
const email = process.argv[3] ?? process.env.VC_EMAIL ?? "miltonian3@gmail.com"
if (cmd === "setup") await setup(email)
else if (cmd === "teardown") await teardown()
else {
  console.error("usage: sandbox.ts setup|teardown [email]")
  process.exit(1)
}
