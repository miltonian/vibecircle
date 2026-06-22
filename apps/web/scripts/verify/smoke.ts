/**
 * End-to-end smoke test — the "verify myself" engine.
 *
 * Exercises every plugin-facing + web endpoint through BOTH auth doors
 * (web session and plugin Bearer token) and prints a PASS/FAIL matrix.
 * Exit code = number of failures, so it doubles as a regression guard.
 *
 *   cd apps/web && bun run scripts/verify/smoke.ts [email]
 *
 * Requires: dev server running with ENABLE_DEV_LOGIN=1, and DATABASE_URL set.
 */

import { devLogin, getOrCreateToken, pickCircle, bearerFetch, Session, BASE } from "./harness"

const EMAIL = process.argv[2] ?? process.env.VC_EMAIL ?? "miltonian3@gmail.com"

type Door = "web" | "plugin"
interface Check {
  door: Door
  method: string
  path: string
  expect: number
  note?: string
}

interface Result extends Check {
  actual: number | string
  ok: boolean
}

const results: Result[] = []

async function run(check: Check, web: Session, token: string) {
  let actual: number | string
  try {
    const res =
      check.door === "web"
        ? await web.fetch(check.path, { method: check.method })
        : await bearerFetch(token, check.path, { method: check.method })
    actual = res.status
  } catch (e) {
    actual = `ERR ${(e as Error).message}`
  }
  results.push({ ...check, actual, ok: actual === check.expect })
}

async function main() {
  console.log(`\nvibecircle smoke — base=${BASE}  user=${EMAIL}\n`)

  // Preflight: server reachable?
  try {
    await fetch(`${BASE}/api/auth/csrf`)
  } catch {
    console.error(`✗ Server not reachable at ${BASE}. Start it:  cd apps/web && bun run dev`)
    process.exit(2)
  }

  const web = await devLogin(EMAIL)
  const token = await getOrCreateToken(EMAIL)
  const circle = await pickCircle(EMAIL)
  if (!circle) {
    console.error(`✗ ${EMAIL} is not a member of any circle.`)
    process.exit(2)
  }
  const c = circle.id
  console.log(`target circle: "${circle.name}" (${c})\n`)

  const checks: Check[] = [
    // Web session — everything should be reachable with a real session cookie.
    { door: "web", method: "GET", path: "/api/auth/session", expect: 200 },
    { door: "web", method: "GET", path: "/api/circles", expect: 200 },
    { door: "web", method: "GET", path: `/api/circles/${c}/feed`, expect: 200 },
    { door: "web", method: "GET", path: `/api/circles/${c}/arcs`, expect: 200 },
    { door: "web", method: "GET", path: `/api/circles/${c}/members`, expect: 200 },
    { door: "web", method: "GET", path: `/api/circles/${c}/presence`, expect: 200 },

    // Plugin Bearer token — the plugin authenticates this way. Everything the
    // plugin needs should accept the token. (members + /api/circles currently
    // do NOT — those are the bugs this harness is designed to catch.)
    { door: "plugin", method: "GET", path: "/api/circles", expect: 200, note: "plugin should list its circles" },
    { door: "plugin", method: "GET", path: `/api/circles/${c}/feed`, expect: 200 },
    { door: "plugin", method: "GET", path: `/api/circles/${c}/arcs`, expect: 200 },
    { door: "plugin", method: "GET", path: `/api/circles/${c}/members`, expect: 200, note: "uses session-only auth()" },
    { door: "plugin", method: "GET", path: `/api/circles/${c}/presence`, expect: 200 },
  ]

  for (const check of checks) await run(check, web, token)

  // Report
  const pad = (s: string, n: number) => s.padEnd(n)
  console.log(pad("DOOR", 8) + pad("RESULT", 8) + pad("STATUS", 14) + "ENDPOINT")
  console.log("-".repeat(78))
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL"
    const status = `${r.actual}${r.ok ? "" : ` (≠${r.expect})`}`
    const note = !r.ok && r.note ? `   ← ${r.note}` : ""
    console.log(pad(r.door, 8) + pad(mark, 8) + pad(status, 14) + `${r.method} ${r.path}${note}`)
  }

  const fails = results.filter((r) => !r.ok)
  console.log("-".repeat(78))
  console.log(`${results.length - fails.length}/${results.length} passed.`)
  if (fails.length) {
    console.log(`\n${fails.length} failure(s) — endpoints that should work but don't:`)
    for (const f of fails) console.log(`  • [${f.door}] ${f.method} ${f.path} → ${f.actual}`)
  }
  process.exit(fails.length)
}

main().catch((e) => {
  console.error("smoke crashed:", e)
  process.exit(2)
})
