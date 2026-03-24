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
  const [copied, setCopied] = useState(false)

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

  const configJson = JSON.stringify({
    apiUrl: "https://vibecircle.dev",
    authToken: token ?? "vc_...",
    circleId: selectedCircleId || "",
    autoShare: true,
  })

  const oneLiner = `mkdir -p ~/.vibecircle && echo '${configJson}' > ~/.vibecircle/config.json && echo "✓ vibecircle configured"`

  const copyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(oneLiner)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = oneLiner
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }, [oneLiner])

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
            Connect your Claude Code plugin
          </p>
        </div>

        {/* Circle selector — only show if multiple */}
        {circles.length > 1 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-text-muted">Circle</p>
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

        {/* The one command */}
        {tokenLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border-dim bg-bg-elevated px-4 py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-green border-t-transparent" />
            <span className="text-sm text-text-muted">Setting up...</span>
          </div>
        ) : tokenError ? (
          <div className="rounded-xl border border-accent-pink/30 bg-accent-pink/5 px-4 py-3 text-sm text-accent-pink">
            {tokenError}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border-dim bg-bg-elevated p-4">
              <code className="block overflow-x-auto whitespace-pre-wrap break-all font-code text-[11px] leading-relaxed text-accent-green/80">
                {oneLiner}
              </code>
            </div>

            <button
              onClick={copyCommand}
              disabled={!token || !selectedCircleId}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-3.5 text-sm font-bold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30"
            >
              {copied ? "Copied! Paste in your terminal" : "Copy setup command"}
            </button>
          </>
        )}

        {/* After */}
        <p className="mt-5 text-center text-xs text-text-dim">
          Then use <code className="font-code text-accent-green">/share</code> in Claude Code to post to your circle
        </p>
      </div>
    </div>
  )
}
