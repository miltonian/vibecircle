"use client"

import { useState } from "react"

interface Circle {
  id: string
  name: string
}

interface DeviceAuthorizeProps {
  code: string | null
  circles: Circle[]
}

export function DeviceAuthorize({ code, circles }: DeviceAuthorizeProps) {
  const [selectedCircleId, setSelectedCircleId] = useState(
    circles[0]?.id ?? ""
  )
  const [authorizing, setAuthorizing] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAuthorize() {
    if (!code || !selectedCircleId) return

    setAuthorizing(true)
    setError(null)

    try {
      const res = await fetch(`/api/auth/device-code/${code}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: selectedCircleId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to authorize (${res.status})`)
      }

      setAuthorized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to authorize")
    } finally {
      setAuthorizing(false)
    }
  }

  // No code provided
  if (!code) {
    return (
      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8 text-center">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-text-primary">
            Missing device code
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Run{" "}
            <code className="font-code text-accent-green">/circle setup</code>{" "}
            in Claude Code to start the authentication flow.
          </p>
        </div>
      </div>
    )
  }

  // No circles
  if (circles.length === 0) {
    return (
      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8 text-center">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-text-primary">
            No circles yet
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Create or join a circle first, then come back to authorize the plugin.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (authorized) {
    return (
      <div className="relative z-10 w-full max-w-lg">
        <div className="rounded-[20px] border border-accent-green/30 bg-bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
            <svg
              className="h-8 w-8 text-accent-green"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-text-primary">
            Plugin configured!
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            You can close this tab. Your terminal will auto-configure in a moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 w-full max-w-lg">
      <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8">
        {/* Logo */}
        <div className="mb-6 text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
              vibecircle
            </span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Authorize plugin
          </p>
        </div>

        {/* Device code display */}
        <div className="mb-6 rounded-xl border border-border-dim bg-bg-elevated p-4 text-center">
          <p className="mb-1 text-xs font-medium text-text-muted">
            Verify this code matches your terminal
          </p>
          <p className="font-code text-2xl font-bold tracking-[0.3em] text-accent-cyan">
            {code}
          </p>
        </div>

        {/* Circle selector — only show if multiple */}
        {circles.length > 1 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-text-muted">
              Connect to circle
            </p>
            <div className="space-y-1.5">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  onClick={() => setSelectedCircleId(circle.id)}
                  className={`flex w-full items-center rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                    selectedCircleId === circle.id
                      ? "border-accent-green/40 bg-accent-green/5 text-text-primary"
                      : "border-border-dim bg-bg-elevated text-text-secondary hover:border-border-subtle"
                  }`}
                >
                  {circle.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {circles.length === 1 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-text-muted">
              Connect to circle
            </p>
            <div className="rounded-xl border border-accent-green/40 bg-accent-green/5 px-4 py-2.5 text-sm text-text-primary">
              {circles[0].name}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-accent-pink/30 bg-accent-pink/5 px-4 py-3 text-sm text-accent-pink">
            {error}
          </div>
        )}

        {/* Authorize button */}
        <button
          onClick={handleAuthorize}
          disabled={authorizing || !selectedCircleId}
          className="w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-3.5 text-sm font-bold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30"
        >
          {authorizing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              Authorizing...
            </span>
          ) : (
            "Authorize"
          )}
        </button>

        <p className="mt-5 text-center text-xs text-text-dim">
          This will connect your Claude Code plugin to vibecircle
        </p>
      </div>
    </div>
  )
}
