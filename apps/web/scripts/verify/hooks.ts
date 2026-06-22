/**
 * Plugin hook verification — proves the Claude Code plugin hooks actually work
 * end-to-end, without needing a live Claude session.
 *
 *   cd apps/web && bun run scripts/verify/hooks.ts [email]
 *
 * What it drives (the real plugin scripts in packages/plugin/scripts):
 *   • SessionStart → update-presence.js building   → asserts presence row in DB
 *   • Stop         → detect-activity.js (sentinel) → asserts it emits the
 *                    {decision:"approve", systemMessage:"…auto-share…"} payload
 *                    when a repo has uncommitted work
 *   • (drafting)   → post-to-circle.js             → asserts a post lands via the API
 *   • SessionEnd   → update-presence.js away       → asserts presence flips to away
 *
 * It runs against an ISOLATED plugin config (CLAUDE_PLUGIN_DATA = temp dir) and a
 * throwaway sandbox circle, so your real ~/.vibecircle/config.json and real
 * circles are never touched. Exit code = number of failures.
 *
 * Note: the middle "Claude drafts the copy from the sentinel's systemMessage"
 * step is agentic and needs a real session — out of scope here. This verifies
 * every deterministic seam: detection → posting → presence.
 */

import { execFileSync, spawnSync } from "child_process"
import { mkdtempSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { neon } from "@neondatabase/serverless"
import { getOrCreateToken, BASE } from "./harness"

const EMAIL = process.argv[2] ?? process.env.VC_EMAIL ?? "miltonian3@gmail.com"
const sql = neon(process.env.DATABASE_URL!)

const VERIFY_DIR = (import.meta as unknown as { dir: string }).dir // Bun: .../apps/web/scripts/verify
const ROOT = join(VERIFY_DIR, "..", "..", "..", "..") // repo root
const PLUGIN = join(ROOT, "packages", "plugin", "scripts")

const results: { name: string; ok: boolean; detail: string }[] = []
const check = (name: string, ok: boolean, detail = "") => results.push({ name, ok, detail })

function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  // spawnSync captures BOTH stdout and stderr regardless of exit code — important
  // because the plugin scripts always exit 0 and report failures only on stderr.
  const r = spawnSync(cmd, args, { encoding: "utf8", env: opts.env ?? process.env, cwd: opts.cwd })
  return { out: r.stdout ?? "", err: r.stderr ?? "", code: r.status ?? 0 }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Run a hook action and poll for its DB effect, retrying a few times. The plugin
 * deliberately swallows transient API errors (exit 0), and the dev server can
 * spike under load, so a single attempt is not a reliable signal. On the last
 * failed attempt we surface the script's stderr.
 */
async function attempt(
  action: () => { out: string; err: string },
  assert: () => Promise<boolean>,
  tries = 3
): Promise<{ ok: boolean; detail: string }> {
  let lastErr = ""
  for (let i = 0; i < tries; i++) {
    const r = action()
    lastErr = r.err.trim() || r.out.trim()
    for (let waited = 0; waited < 4000; waited += 500) {
      if (await assert()) return { ok: true, detail: "" }
      await sleep(500)
    }
  }
  return { ok: false, detail: lastErr.slice(0, 100) || "no effect observed" }
}

async function main() {
  // ── 0. isolated sandbox circle + token + plugin config ──────────────────────
  const setupOut = run("bun", ["run", join(VERIFY_DIR, "sandbox.ts"), "setup", EMAIL]).out
  const { circleId } = JSON.parse(setupOut)
  const token = await getOrCreateToken(EMAIL)
  const owner = (await sql`select id from users where email=${EMAIL} limit 1`)[0].id as string

  const dataDir = mkdtempSync(join(tmpdir(), "vc-hooks-"))
  writeFileSync(
    join(dataDir, "config.json"),
    JSON.stringify({
      apiUrl: BASE,
      authToken: token,
      circles: [{ id: circleId, name: "verify-sandbox", tone: "casual", filter: "everything", repos: "*" }],
      autoShare: true,
    })
  )
  const env = { ...process.env, CLAUDE_PLUGIN_DATA: dataDir }

  // synthetic git repo with uncommitted work, so the Stop sentinel has a reason to fire
  const repoDir = mkdtempSync(join(tmpdir(), "vc-repo-"))
  const git = (args: string[]) => run("git", args, { cwd: repoDir, env })
  git(["init", "-q"])
  git(["config", "user.email", "verify@vibecircle.local"])
  git(["config", "user.name", "verify"])
  writeFileSync(join(repoDir, "README.md"), "init")
  git(["add", "."])
  git(["commit", "-q", "-m", "init"])
  git(["remote", "add", "origin", "https://github.com/test/sandbox-repo.git"])
  writeFileSync(join(repoDir, "a.ts"), "export const a = 1\n")
  writeFileSync(join(repoDir, "b.ts"), "export const b = 2\n")

  const presenceStatus = async () =>
    ((await sql`select status from presence where circle_id=${circleId} and user_id=${owner}`)[0]?.status as string) ?? null

  try {
    // Warm the routes once (first hit triggers Turbopack route compilation + a
    // cold Neon connection, which is the main source of latency spikes).
    run("node", [join(PLUGIN, "update-presence.js"), "online"], { env })

    // ── 1. SessionStart → presence "building" ──────────────────────────────────
    const r1 = await attempt(
      () => run("node", [join(PLUGIN, "update-presence.js"), "building"], { env }),
      async () => (await presenceStatus()) === "building"
    )
    check("SessionStart → presence 'building'", r1.ok, r1.detail)

    // ── 2. Stop → sentinel emits a PASSIVE nudge (deterministic, local) ────────
    // It must surface a /share hint but NEVER block the stop (no `decision`),
    // otherwise it hijacks the turn and Claude keeps going instead of stopping.
    const sentinel = run("node", [join(PLUGIN, "detect-activity.js")], { cwd: repoDir, env })
    let parsed: any = null
    try { parsed = JSON.parse(sentinel.out) } catch {}
    const nonBlocking = !parsed?.decision
    const nudges = /\/share/.test(parsed?.systemMessage ?? "")
    check("Stop → sentinel nudges /share without blocking", nonBlocking && nudges, ((sentinel.out || sentinel.err) || "(no output)").slice(0, 90))

    // ── 3. post-to-circle.js actually writes a post via the API ────────────────
    const headline = `Hook verify ${Date.now()}`
    const r3 = await attempt(
      () => run("node", [
        join(PLUGIN, "post-to-circle.js"),
        "--circle-id", circleId, "--type", "wip", "--headline", headline, "--body", "Posted by hook verification.",
      ], { cwd: repoDir, env }),
      async () => (await sql`select id from posts where circle_id=${circleId} and headline=${headline}`).length === 1
    )
    check("post-to-circle.js → post created via API", r3.ok, r3.detail)

    // ── 4. SessionEnd → presence "away" ────────────────────────────────────────
    const r4 = await attempt(
      () => run("node", [join(PLUGIN, "update-presence.js"), "away"], { env }),
      async () => (await presenceStatus()) === "away"
    )
    check("SessionEnd → presence 'away'", r4.ok, r4.detail)
  } finally {
    rmSync(dataDir, { recursive: true, force: true })
    rmSync(repoDir, { recursive: true, force: true })
    run("bun", ["run", join(VERIFY_DIR, "sandbox.ts"), "teardown"])
  }

  // ── report ───────────────────────────────────────────────────────────────────
  console.log(`\nvibecircle plugin-hook verification — base=${BASE} user=${EMAIL}\n`)
  const pad = (s: string, n: number) => s.padEnd(n)
  for (const r of results) {
    console.log(`${pad(r.ok ? "PASS" : "FAIL", 6)}${pad(r.name, 52)}${r.ok ? "" : "  ← " + r.detail}`)
  }
  const fails = results.filter((r) => !r.ok)
  console.log(`\n${results.length - fails.length}/${results.length} hooks verified.`)
  process.exit(fails.length)
}

main().catch((e) => {
  console.error("hook verification crashed:", e)
  process.exit(2)
})
