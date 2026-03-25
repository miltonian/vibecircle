"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

export default function InvitePage() {
  const router = useRouter()
  const params = useParams<{ code: string }>()
  const code = params.code

  const [circleName, setCircleName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Fetch circle info by invite code
    async function fetchCircle() {
      try {
        const res = await fetch(`/api/circles/invite-lookup?code=${encodeURIComponent(code)}`)
        if (res.ok) {
          const data = await res.json()
          setCircleName(data.name)
        } else if (res.status === 401) {
          // Not logged in — redirect to login with callback
          const callbackUrl = encodeURIComponent(`/invite/${code}`)
          router.push(`/login?callbackUrl=${callbackUrl}`)
          return
        } else {
          setError("Invalid or expired invite link.")
        }
      } catch {
        setError("Something went wrong.")
      } finally {
        setLoading(false)
      }
    }

    fetchCircle()
  }, [code, router])

  async function handleJoin() {
    setJoining(true)
    setError("")

    try {
      const res = await fetch(`/api/circles/_/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      })

      if (res.status === 401) {
        const callbackUrl = encodeURIComponent(`/invite/${code}`)
        router.push(`/login?callbackUrl=${callbackUrl}`)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to join circle.")
        return
      }

      const circle = await res.json()
      router.push(`/${circle.id}`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
        <div className="ambient-glow ambient-glow--green" />
        <div className="ambient-glow ambient-glow--cyan" />
        <div className="relative z-10 text-sm text-text-muted">Loading...</div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="ambient-glow ambient-glow--green" />
      <div className="ambient-glow ambient-glow--cyan" />
      <div className="ambient-glow ambient-glow--purple" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <span className="font-heading text-2xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
                vibecircle
              </span>
            </span>
          </div>

          {error ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="h-7 w-7 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="font-heading text-xl font-bold text-text-primary">
                Invalid invite
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 text-sm text-text-muted transition-colors hover:text-text-secondary"
              >
                Go home
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-green/10">
                <svg
                  className="h-7 w-7 text-accent-green"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>

              <h2 className="font-heading text-xl font-bold text-text-primary">
                You&apos;ve been invited!
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Join{" "}
                <span className="font-semibold text-text-primary">
                  {circleName}
                </span>{" "}
                on vibecircle
              </p>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {joining ? "Joining..." : `Join ${circleName}`}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
