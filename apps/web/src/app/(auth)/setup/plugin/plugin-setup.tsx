"use client"

import { useState, useEffect, useCallback } from "react"

interface Circle {
  id: string
  name: string
}

interface PluginSetupProps {
  circles: Circle[]
}

export function PluginSetup({ circles }: PluginSetupProps) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [selectedCircleId, setSelectedCircleId] = useState(
    circles[0]?.id ?? ""
  )
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)

  // Auto-generate token on mount
  useEffect(() => {
    let cancelled = false

    async function generateToken() {
      try {
        const res = await fetch("/api/settings/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Claude Code Plugin" }),
        })

        if (!res.ok) {
          throw new Error(`Failed to generate token (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setToken(data.token)
          setTokenLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setTokenError(
            err instanceof Error ? err.message : "Failed to generate token"
          )
          setTokenLoading(false)
        }
      }
    }

    generateToken()
    return () => {
      cancelled = true
    }
  }, [])

  const configJson = JSON.stringify(
    {
      apiUrl: "https://web-mauve-two-91.vercel.app",
      authToken: token ?? "vc_...",
      circleId: selectedCircleId || "<select-a-circle>",
      autoShare: true,
    },
    null,
    2
  )

  const copyToClipboard = useCallback(
    async (text: string, type: "token" | "config") => {
      try {
        await navigator.clipboard.writeText(text)
        if (type === "token") {
          setCopiedToken(true)
          setTimeout(() => setCopiedToken(false), 2000)
        } else {
          setCopiedConfig(true)
          setTimeout(() => setCopiedConfig(false), 2000)
        }
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
        if (type === "token") {
          setCopiedToken(true)
          setTimeout(() => setCopiedToken(false), 2000)
        } else {
          setCopiedConfig(true)
          setTimeout(() => setCopiedConfig(false), 2000)
        }
      }
    },
    []
  )

  return (
    <div className="relative z-10 w-full max-w-lg">
      <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8">
        {/* Logo & heading */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
              vibecircle
            </span>
          </h1>
          <h2 className="mt-3 font-heading text-xl font-bold text-text-primary">
            Connect your Claude Code plugin
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Link your terminal to your circle in three steps.
          </p>
        </div>

        {/* Step 1: API Token */}
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-green/10 text-xs font-bold text-accent-green">
              1
            </span>
            <h3 className="text-sm font-semibold text-text-primary">
              Your API token
            </h3>
          </div>

          {tokenLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-dim bg-bg-elevated px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-green border-t-transparent" />
              <span className="text-sm text-text-muted">
                Generating token...
              </span>
            </div>
          ) : tokenError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {tokenError}
            </div>
          ) : (
            <div className="group relative rounded-xl border border-border-dim bg-bg-elevated">
              <code className="block overflow-x-auto px-4 py-3 font-code text-sm text-accent-green">
                {token}
              </code>
              <button
                onClick={() => token && copyToClipboard(token, "token")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary opacity-0 transition-all hover:border-accent-green/30 hover:text-accent-green group-hover:opacity-100"
              >
                {copiedToken ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </section>

        {/* Step 2: Select Circle */}
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-cyan/10 text-xs font-bold text-accent-cyan">
              2
            </span>
            <h3 className="text-sm font-semibold text-text-primary">
              Choose a circle
            </h3>
          </div>

          {circles.length === 0 ? (
            <div className="rounded-xl border border-border-dim bg-bg-elevated px-4 py-3 text-sm text-text-muted">
              No circles yet. Create one in the app first.
            </div>
          ) : (
            <div className="space-y-1.5">
              {circles.map((circle) => (
                <button
                  key={circle.id}
                  onClick={() => setSelectedCircleId(circle.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    selectedCircleId === circle.id
                      ? "border-accent-green/40 bg-accent-green/5 text-text-primary"
                      : "border-border-dim bg-bg-elevated text-text-secondary hover:border-border-subtle hover:bg-bg-surface"
                  }`}
                >
                  <span className="font-medium">{circle.name}</span>
                  <span className="font-code text-xs text-text-muted">
                    {circle.id.slice(0, 8)}...
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Step 3: Config JSON */}
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple">
              3
            </span>
            <h3 className="text-sm font-semibold text-text-primary">
              Copy your config
            </h3>
          </div>

          <div className="relative rounded-xl border border-border-dim bg-bg-elevated">
            <pre className="overflow-x-auto p-4 font-code text-sm leading-relaxed text-text-primary">
              {configJson}
            </pre>
            <button
              onClick={() => copyToClipboard(configJson, "config")}
              disabled={!token || !selectedCircleId}
              className="absolute right-3 top-3 rounded-lg bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-1.5 text-xs font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {copiedConfig ? "Copied!" : "Copy config"}
            </button>
          </div>
        </section>

        {/* Instructions */}
        <div className="rounded-xl border border-border-dim bg-bg-surface px-4 py-3">
          <p className="text-sm text-text-secondary">
            Save the config above to:
          </p>
          <code className="mt-1 block font-code text-sm text-accent-cyan">
            ~/.vibecircle/config.json
          </code>
          <p className="mt-2 text-xs text-text-muted">
            Or use{" "}
            <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-code text-accent-green">
              /circle setup
            </code>{" "}
            in Claude Code to do it automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
