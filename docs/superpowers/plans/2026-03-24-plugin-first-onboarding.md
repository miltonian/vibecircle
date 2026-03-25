# Plugin-First Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make plugin installation the centerpiece of onboarding — circle creators get a full-screen setup flow, invited members get a feed banner, and the empty feed state promotes the plugin.

**Architecture:** A new `/${circleId}/setup` page handles the creator onboarding flow with polling for token detection. The feed page checks for token existence and shows an install banner for users without the plugin. A lightweight `/api/settings/token/check` endpoint returns `{ hasToken: boolean }` for polling.

**Tech Stack:** Next.js (App Router), Drizzle ORM, SWR, Tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-24-plugin-first-onboarding-design.md`

---

## File Structure

### New Files
- `apps/web/src/app/api/settings/token/check/route.ts` — Lightweight `GET` endpoint returning `{ hasToken: boolean }`
- `apps/web/src/app/(feed)/[circleId]/setup/page.tsx` — Server component: auth guard, token check, redirect if already connected
- `apps/web/src/components/onboarding/plugin-setup.tsx` — Client component: 3-step setup flow with polling
- `apps/web/src/components/onboarding/install-banner.tsx` — Client component: feed banner for users without plugin
- `apps/web/src/hooks/use-has-token.ts` — SWR hook for polling `/api/settings/token/check`

### Modified Files
- `apps/web/src/app/(feed)/new-circle/page.tsx` — Redirect to `/${circleId}/setup` after creation instead of showing invite link
- `apps/web/src/app/(feed)/[circleId]/page.tsx` — Check token, redirect creators to setup, pass `hasToken` to feed
- `apps/web/src/components/feed/feed-view.tsx` — Accept `hasToken` prop, show banner or updated empty state

---

## Task 1: Token Check API Endpoint

**Files:**
- Create: `apps/web/src/app/api/settings/token/check/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

/** GET /api/settings/token/check — lightweight check if user has a plugin token */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [token] = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.userId, session.user.id))
    .limit(1)

  return NextResponse.json({ hasToken: !!token })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/settings/token/check/route.ts
git commit -m "feat: add lightweight token check endpoint for onboarding"
```

---

## Task 2: useHasToken Hook

**Files:**
- Create: `apps/web/src/hooks/use-has-token.ts`

- [ ] **Step 1: Create the hook**

```typescript
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TokenCheckResponse {
  hasToken: boolean
}

/**
 * Poll /api/settings/token/check to detect when the plugin is connected.
 * @param poll - if true, refreshes every 3 seconds (for setup page waiting state)
 */
export function useHasToken(poll = false) {
  return useSWR<TokenCheckResponse>(
    "/api/settings/token/check",
    fetcher,
    {
      refreshInterval: poll ? 3000 : 0,
      revalidateOnFocus: true,
    }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-has-token.ts
git commit -m "feat: add useHasToken hook for plugin detection polling"
```

---

## Task 3: Plugin Setup Page (Full-Screen, Creator Path)

**Files:**
- Create: `apps/web/src/app/(feed)/[circleId]/setup/page.tsx`
- Create: `apps/web/src/components/onboarding/plugin-setup.tsx`

- [ ] **Step 1: Create the server component (page.tsx)**

This page lives inside the `(feed)` route group so it gets the feed layout (top bar). It checks auth, verifies the circle exists, checks if user already has a token (if so, redirects to feed), and checks the user is the circle owner.

```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCircleById } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { apiTokens, circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { PluginSetupFlow } from "@/components/onboarding/plugin-setup"

export default async function SetupPage({
  params,
}: {
  params: Promise<{ circleId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { circleId } = await params
  const circle = await getCircleById(circleId)

  if (!circle) {
    redirect("/new-circle")
  }

  // If user already has a token, skip to feed
  const [existingToken] = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.userId, session.user.id))
    .limit(1)

  if (existingToken) {
    redirect(`/${circleId}`)
  }

  return (
    <PluginSetupFlow
      circleId={circleId}
      inviteCode={circle.inviteCode}
    />
  )
}
```

- [ ] **Step 2: Create the client component (plugin-setup.tsx)**

Three-step flow: Circle created → Install plugin → Invite team. Uses `useHasToken(true)` to poll for connection. Auto-transitions to step 3 when token detected.

Use @frontend-design for the visual implementation. The component should follow the Warm Editorial design system (dark brown-black, warm cream text, copper accents, serif headings).

Key elements:
- 3-step progress bar at top (copper dots and lines)
- Step 2 (active): "Connect Claude Code" heading, serif font
- Two command blocks with copy buttons:
  - `/plugin marketplace add miltonian/vibecircle` then `/plugin install vibecircle`
  - `/circle setup`
- Pulsing "Waiting for plugin to connect..." indicator
- "Skip for now" link at bottom → navigates to `/${circleId}`
- When `hasToken` becomes true → auto-transition to step 3
- Step 3: "Plugin connected ✓" success, invite link with copy button, "Go to your feed" button

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useHasToken } from "@/hooks/use-has-token"

interface PluginSetupFlowProps {
  circleId: string
  inviteCode: string
}

export function PluginSetupFlow({ circleId, inviteCode }: PluginSetupFlowProps) {
  const router = useRouter()
  const { data } = useHasToken(true) // poll every 3s
  const [step, setStep] = useState<2 | 3>(2) // start at step 2 (circle already created)
  const [copied, setCopied] = useState<string | null>(null)

  // Auto-advance to step 3 when plugin connects
  useEffect(() => {
    if (data?.hasToken && step === 2) {
      setStep(3)
    }
  }, [data?.hasToken, step])

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/invite/${inviteCode}`
    : `https://vibecircle.dev/invite/${inviteCode}`

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-3">
        {/* Step 1: done */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-green text-xs font-bold text-bg-base">✓</div>
        <div className="h-0.5 w-10 bg-accent-green" />
        {/* Step 2 */}
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          step >= 2 ? "bg-accent-green text-bg-base" : "border border-border-subtle bg-bg-elevated text-text-muted"
        }`}>{step > 2 ? "✓" : "2"}</div>
        <div className={`h-0.5 w-10 ${step > 2 ? "bg-accent-green" : "bg-border-subtle"}`} />
        {/* Step 3 */}
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          step >= 3 ? "bg-accent-green text-bg-base" : "border border-border-subtle bg-bg-elevated text-text-muted"
        }`}>3</div>
      </div>
      <div className="mb-10 flex gap-12 text-[11px]">
        <span className="text-text-muted">Circle created</span>
        <span className={step === 2 ? "font-semibold text-text-primary" : "text-text-muted"}>Install plugin</span>
        <span className={step === 3 ? "font-semibold text-text-primary" : "text-text-muted"}>Invite team</span>
      </div>

      {step === 2 && (
        <div className="w-full max-w-lg text-center">
          <h2 className="font-display text-2xl font-semibold text-text-primary">Connect Claude Code</h2>
          <p className="mt-2 text-sm text-text-secondary">
            The plugin watches what you build and creates shareable updates for your team. Three commands and you&apos;re done.
          </p>

          <div className="mt-8 space-y-4 text-left">
            {/* Command 1 */}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-green">Step 1 — Install from marketplace</div>
              <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-card px-4 py-3">
                <code className="font-code text-[13px] text-text-primary">/plugin marketplace add miltonian/vibecircle</code>
                <button
                  onClick={() => copyToClipboard("/plugin marketplace add miltonian/vibecircle", "install")}
                  className="shrink-0 rounded-lg bg-accent-green px-3 py-1.5 text-[11px] font-bold text-bg-base"
                >
                  {copied === "install" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-text-dim">Then run: <code className="font-code text-text-muted">/plugin install vibecircle</code></div>
            </div>

            {/* Command 2 */}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-green">Step 2 — Connect to your circle</div>
              <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-card px-4 py-3">
                <code className="font-code text-[13px] text-text-primary">/circle setup</code>
                <button
                  onClick={() => copyToClipboard("/circle setup", "setup")}
                  className="shrink-0 rounded-lg bg-accent-green px-3 py-1.5 text-[11px] font-bold text-bg-base"
                >
                  {copied === "setup" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-text-dim">Opens a browser tab to authorize — takes 10 seconds.</div>
            </div>
          </div>

          {/* Waiting indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-accent-green/15 bg-accent-green/5 px-5 py-2.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent-green" />
            <span className="text-xs text-text-muted">Waiting for plugin to connect...</span>
          </div>

          {/* Skip */}
          <button
            onClick={() => router.push(`/${circleId}`)}
            className="mt-6 text-xs text-text-dim hover:text-text-muted"
          >
            Skip for now — go to feed →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="w-full max-w-lg text-center">
          <div className="mb-2 text-sm font-semibold text-accent-green">Plugin connected ✓</div>
          <h2 className="font-display text-2xl font-semibold text-text-primary">Invite your team</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Share this link — anyone with it can join your circle.
          </p>

          <div className="mt-6 flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-xl border border-border-subtle bg-bg-card px-4 py-3 font-code text-sm text-text-primary outline-none"
            />
            <button
              onClick={() => copyToClipboard(inviteUrl, "invite")}
              className="shrink-0 rounded-xl bg-accent-green px-4 py-3 text-sm font-bold text-bg-base"
            >
              {copied === "invite" ? "Copied!" : "Copy"}
            </button>
          </div>

          <button
            onClick={() => router.push(`/${circleId}`)}
            className="mt-6 inline-block rounded-xl border border-accent-green/30 px-6 py-3 text-sm font-semibold text-accent-green transition-colors hover:bg-accent-green/5"
          >
            Go to your feed →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(feed)/[circleId]/setup/page.tsx apps/web/src/components/onboarding/plugin-setup.tsx
git commit -m "feat: add full-screen plugin setup page for circle creators"
```

---

## Task 4: Install Banner Component

**Files:**
- Create: `apps/web/src/components/onboarding/install-banner.tsx`

- [ ] **Step 1: Create the banner**

Shown at the top of the feed for users without a plugin token. Dismissable via × button (uses sessionStorage so it comes back on next browser session). Disappears permanently once `hasToken` is true.

```tsx
"use client"

import { useState, useCallback } from "react"

interface InstallBannerProps {
  onDismiss?: () => void
}

export function InstallBanner({ onDismiss }: InstallBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem("vc-banner-dismissed") === "true"
  })
  const [copied, setCopied] = useState(false)

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem("vc-banner-dismissed", "true")
    setDismissed(true)
    onDismiss?.()
  }, [onDismiss])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("/plugin marketplace add miltonian/vibecircle")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  if (dismissed) return null

  return (
    <div className="mb-4 rounded-2xl border border-accent-green/15 bg-gradient-to-br from-accent-green/[0.06] to-transparent p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-display text-[15px] font-semibold text-text-primary">
            Start sharing what you build
          </h3>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            Install the Claude Code plugin and your coding sessions auto-generate updates for the team.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5">
              <code className="font-code text-[11px] text-accent-green">/plugin marketplace add miltonian/vibecircle</code>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-accent-green px-3 py-1.5 text-[11px] font-bold text-bg-base"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-text-dim">
            Then: <code className="font-code text-text-muted">/plugin install vibecircle</code> → <code className="font-code text-text-muted">/circle setup</code>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-text-dim hover:text-text-muted"
        >
          ×
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/onboarding/install-banner.tsx
git commit -m "feat: add plugin install banner for feed"
```

---

## Task 5: Update New Circle Page — Redirect to Setup

**Files:**
- Modify: `apps/web/src/app/(feed)/new-circle/page.tsx`

- [ ] **Step 1: Change post-creation redirect**

After circle creation succeeds, redirect to the setup page instead of showing the invite link inline. Make these specific changes:

1. Remove `const [inviteUrl, setInviteUrl] = useState("")` (line 11)
2. Remove `setInviteUrl(...)` call inside handleSubmit (line 39)
3. Remove the `handleCopyInvite` function (lines 47-49)
4. Add `router.push(`/${circleId}/setup`)` after `setCircleId(circle.id)` inside handleSubmit (after line 35)
5. Replace the entire success block (`if (inviteUrl && circleId)` block, lines 52-103) with:

```typescript
  // After creation: redirect to plugin setup
  if (circleId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-text-muted">Redirecting to setup...</div>
      </div>
    )
  }
```

The `router.push` in handleSubmit triggers the redirect. The return block is a fallback in case it renders before navigation completes.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(feed)/new-circle/page.tsx
git commit -m "feat: redirect new circle creation to plugin setup page"
```

---

## Task 6: Update Feed Page — Token Check + Banner

**Files:**
- Modify: `apps/web/src/app/(feed)/[circleId]/page.tsx`
- Modify: `apps/web/src/components/feed/feed-view.tsx`

- [ ] **Step 1: Add token check to the circle page**

Update the server component to check if the user has a token and if they're the circle owner. Pass this info to FeedView.

```typescript
import { auth } from "@/lib/auth"
import { getCircleById } from "@/lib/db/queries"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FeedView } from "@/components/feed/feed-view"
import { db } from "@/lib/db"
import { apiTokens, circleMembers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export default async function CircleFeedPage({
  params,
}: {
  params: Promise<{ circleId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { circleId } = await params
  const circle = await getCircleById(circleId)

  if (!circle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Circle not found
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            This circle doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/new-circle"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Create a circle
          </Link>
        </div>
      </div>
    )
  }

  // Check if user has plugin token
  const [existingToken] = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.userId, session.user.id))
    .limit(1)

  const hasToken = !!existingToken

  // If creator (owner) and no token, redirect to setup
  if (!hasToken) {
    const [membership] = await db
      .select({ role: circleMembers.role })
      .from(circleMembers)
      .where(
        and(
          eq(circleMembers.circleId, circleId),
          eq(circleMembers.userId, session.user.id)
        )
      )
      .limit(1)

    if (membership?.role === "owner") {
      redirect(`/${circleId}/setup`)
    }
  }

  return (
    <div>
      <FeedView circleId={circleId} userId={session.user.id} hasToken={hasToken} />
    </div>
  )
}
```

- [ ] **Step 2: Update FeedView to accept hasToken and show banner**

Add `hasToken` prop to FeedView. When `hasToken` is false, show the InstallBanner above the feed. Update the empty state based on plugin status.

```tsx
"use client"

import { useFeed } from "@/hooks/use-feed"
import { PostCard } from "./post-card"
import { CreatePostDialog } from "./create-post-dialog"
import { InstallBanner } from "@/components/onboarding/install-banner"

interface FeedViewProps {
  circleId: string
  userId?: string
  hasToken?: boolean
}

export function FeedView({ circleId, userId, hasToken = false }: FeedViewProps) {
  const { data, error, isLoading, mutate } = useFeed(circleId)

  const posts = data?.posts ?? []

  return (
    <>
      {/* Plugin install banner for users without token */}
      {!hasToken && <InstallBanner />}

      {/* Feed content */}
      {isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-accent-pink">
              Failed to load feed. Please try again.
            </p>
            <button
              onClick={() => mutate()}
              className="mt-3 rounded-xl bg-bg-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed hasToken={hasToken} />
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} userId={userId} />
          ))}
        </div>
      )}

      {/* Create post FAB + dialog */}
      <CreatePostDialog circleId={circleId} onPostCreated={() => mutate()} />
    </>
  )
}

function EmptyFeed({ hasToken }: { hasToken: boolean }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border-dim bg-bg-card">
          <svg
            className="h-8 w-8 text-accent-green/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {hasToken ? "No posts yet" : "Install the plugin to get started"}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {hasToken
            ? "Start building something — the plugin will suggest sharing."
            : "The Claude Code plugin auto-captures what you build and shares it here."}
        </p>
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[18px] border border-border-subtle bg-bg-card p-[18px]"
        >
          <div className="flex items-center gap-3">
            <div className="h-[42px] w-[42px] rounded-full bg-bg-elevated" />
            <div className="flex-1">
              <div className="h-4 w-36 rounded bg-bg-elevated" />
              <div className="mt-1.5 h-3 w-24 rounded bg-bg-elevated" />
            </div>
            <div className="h-5 w-16 rounded-full bg-bg-elevated" />
          </div>
          <div className="mt-4">
            <div className="h-5 w-3/4 rounded bg-bg-elevated" />
          </div>
          <div className="mt-2 space-y-2">
            <div className="h-3.5 w-full rounded bg-bg-elevated" />
            <div className="h-3.5 w-2/3 rounded bg-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(feed)/[circleId]/page.tsx apps/web/src/components/feed/feed-view.tsx
git commit -m "feat: add plugin detection to feed — show banner or redirect to setup"
```

---

## Task 7: Build Verification + Deploy

- [ ] **Step 1: Verify build**

Run: `cd apps/web && bun run build`
Expected: Build succeeds with new routes: `/(feed)/[circleId]/setup`

- [ ] **Step 2: Push and deploy**

```bash
cd /Users/alexanderhamilton/Coding/experiments/vibecircle
git push origin HEAD
cd apps/web && vercel --prod --yes
```

- [ ] **Step 3: Verify on production**

Visit vibecircle.dev, create a new circle (or have someone join via invite), and verify:
- Creator → sees full-screen plugin setup
- Invited member → sees feed with banner
- User with existing token → sees normal feed, no banner

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: onboarding polish"
```
