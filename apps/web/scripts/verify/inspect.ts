/**
 * Quick database overview — "see everything" at a glance.
 *
 *   cd apps/web && bun run scripts/verify/inspect.ts
 *
 * Read-only. Prints users, circles (with counts), and which circles each
 * token-holder can reach, so you can pick a target for the smoke test.
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const users = await sql`select id, email, name from users order by created_at nulls last`
console.log(`\n=== USERS (${users.length}) ===`)
for (const u of users) console.log(`  ${u.email ?? "(no email)"}  ${u.name ?? ""}  [${u.id}]`)

const circles = await sql`
  select c.id, c.name, c.invite_code,
    (select count(*)::int from posts p where p.circle_id = c.id) as posts,
    (select count(*)::int from circle_members m where m.circle_id = c.id) as members
  from circles c order by posts desc`
console.log(`\n=== CIRCLES (${circles.length}) ===`)
for (const c of circles)
  console.log(`  "${c.name}"  posts=${c.posts}  members=${c.members}  invite=${c.invite_code}  [${c.id}]`)

const toks = await sql`
  select u.email, count(*)::int as n
  from api_tokens t join users u on u.id = t.user_id
  group by u.email order by n desc`
console.log(`\n=== API TOKEN HOLDERS ===`)
for (const t of toks) console.log(`  ${t.email}  (${t.n} token${t.n === 1 ? "" : "s"})`)
console.log()
