/**
 * Server-FREE verification of the rich-post (block kit) data path.
 *
 *   cd apps/web && bun run scripts/verify/blocks-db.ts
 *
 * Exercises the exact server-side functions the API route uses — validateBlocks →
 * createPost → getFeed — directly against the database. Does NOT start next dev
 * (which is very CPU/memory heavy here); this is just a few Neon HTTP calls.
 * Uses a throwaway circle that it deletes afterward. Exit code = failures.
 */

import { neon } from "@neondatabase/serverless"
import { randomUUID } from "crypto"
import { validateBlocks, BlockValidationError } from "../../src/lib/post-blocks"
import { createPost, getFeed } from "../../src/lib/db/queries"

const sql = neon(process.env.DATABASE_URL!)
const results: { name: string; ok: boolean; detail: string }[] = []
const check = (name: string, ok: boolean, detail = "") => results.push({ name, ok, detail })

const validBlocks = [
  { type: "callout", tone: "success", text: "Shipped dark mode 🌙" },
  { type: "text", text: "Reworked the **theming** layer." },
  { type: "metrics", items: [{ label: "files", value: "12" }, { label: "commits", value: "5" }] },
  { type: "deploy", url: "https://example.com", label: "See it" },
]

async function main() {
  const owner = (await sql`select id from users where email='miltonian3@gmail.com' limit 1`)[0]?.id as string
  if (!owner) throw new Error("test user not found")

  const circleId = randomUUID()
  await sql`insert into circles (id, name, created_by, invite_code) values (${circleId}, 'blocks-db', ${owner}, ${"BLKDB" + circleId.slice(0, 6)})`
  await sql`insert into circle_members (circle_id, user_id, role) values (${circleId}, ${owner}, 'owner')`

  try {
    // 1. validator accepts the kit and rejects junk (logic the route relies on)
    const normalized = validateBlocks(validBlocks)
    check("validateBlocks accepts the kit", normalized.length === validBlocks.length)
    let rejected = false
    try { validateBlocks([{ type: "script", text: "x" }]) } catch (e) { rejected = e instanceof BlockValidationError }
    check("validateBlocks rejects unknown type", rejected)

    // 2. createPost persists blocks
    const post = await createPost(circleId, owner, { type: "shipped", headline: "DB blocks test", blocks: normalized })
    const stored = (await sql`select blocks from posts where id=${post.id}`)[0]?.blocks
    check("createPost persists blocks to DB", Array.isArray(stored) && stored.length === validBlocks.length, `len=${(stored as unknown[])?.length}`)

    // 3. getFeed returns the blocks, correctly shaped
    const feed = await getFeed(circleId, { viewerId: owner })
    const fed = feed.posts.find((p) => p.id === post.id) as any
    check("getFeed returns blocks", Array.isArray(fed?.blocks) && fed.blocks.length === validBlocks.length)
    check(
      "block content round-trips",
      fed?.blocks?.[0]?.type === "callout" && fed.blocks[0].tone === "success" && fed.blocks[2]?.type === "metrics",
      JSON.stringify(fed?.blocks?.[0] ?? null)
    )
  } finally {
    await sql`delete from posts where circle_id=${circleId}`
    await sql`delete from circle_members where circle_id=${circleId}`
    await sql`delete from circles where id=${circleId}`
  }

  console.log("\nrich-post data path (server-free)\n")
  for (const r of results) console.log(`${(r.ok ? "PASS" : "FAIL").padEnd(6)}${r.name.padEnd(34)}${r.ok ? "" : "  ← " + r.detail}`)
  const fails = results.filter((r) => !r.ok)
  console.log(`\n${results.length - fails.length}/${results.length} passed.`)
  process.exit(fails.length)
}

main().catch((e) => {
  console.error("blocks-db crashed:", e)
  process.exit(2)
})
