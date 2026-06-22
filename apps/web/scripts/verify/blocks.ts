/**
 * Rich-post (block kit) round-trip verification.
 *
 *   cd apps/web && bun run scripts/verify/blocks.ts
 *
 * Posts a valid blocks payload to a sandbox circle (→201), confirms it round-trips
 * through the feed API, and confirms a malformed payload is rejected (→400).
 * Self-contained: sets up + tears down its own sandbox. Exit code = failures.
 */

import { execFileSync } from "child_process"
import { join } from "path"
import { neon } from "@neondatabase/serverless"
import { devLogin } from "./harness"

const sql = neon(process.env.DATABASE_URL!)
const MEMBER = "miltonian3@gmail.com"
const VERIFY_DIR = (import.meta as unknown as { dir: string }).dir

const validBlocks = [
  { type: "callout", tone: "success", text: "Shipped dark mode 🌙" },
  { type: "text", text: "Reworked the **theming** layer to use CSS variables." },
  { type: "metrics", items: [{ label: "files", value: "12" }, { label: "commits", value: "5" }] },
  { type: "steps", items: ["Add tokens", "Swap colors", "Ship"] },
  { type: "deploy", url: "https://example.com", label: "See it" },
]
const invalidBlocks = [{ type: "script", text: "alert(1)" }]

const results: { name: string; ok: boolean; detail: string }[] = []
const check = (name: string, ok: boolean, detail = "") => results.push({ name, ok, detail })

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
  const member = await devLogin(MEMBER)
  const post = (path: string, body: unknown) =>
    member.fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

  try {
    const r1 = await post(`/api/circles/${CID}/posts`, { type: "shipped", headline: "Rich post", blocks: validBlocks })
    check("valid blocks → 201", r1.status === 201, `got ${r1.status}`)

    const feed = (await (await member.fetch(`/api/circles/${CID}/feed`)).json()) as any
    const created = feed.posts?.find((p: any) => p.headline === "Rich post")
    check("feed returns the blocks array", Array.isArray(created?.blocks) && created.blocks.length === validBlocks.length, `len=${created?.blocks?.length}`)
    check(
      "block content round-trips",
      created?.blocks?.[0]?.type === "callout" && created.blocks[0].tone === "success" && created.blocks[2]?.type === "metrics",
      JSON.stringify(created?.blocks?.[0] ?? null)
    )

    const r2 = await post(`/api/circles/${CID}/posts`, { type: "wip", blocks: invalidBlocks })
    check("malformed blocks → 400", r2.status === 400, `got ${r2.status}`)
  } finally {
    await destroy(CID)
  }

  console.log(`\nvibecircle rich-post round-trip\n`)
  for (const r of results) console.log(`${(r.ok ? "PASS" : "FAIL").padEnd(6)}${r.name.padEnd(34)}${r.ok ? "" : "  ← " + r.detail}`)
  const fails = results.filter((r) => !r.ok)
  console.log(`\n${results.length - fails.length}/${results.length} passed.`)
  process.exit(fails.length)
}

main().catch((e) => {
  console.error("blocks harness crashed:", e)
  process.exit(2)
})
