"use client"

import { useState, useCallback, useEffect } from "react"

export function InstallBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("vc-banner-dismissed") === "true") {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem("vc-banner-dismissed", "true")
    setDismissed(true)
  }, [])

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
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Install the Claude Code plugin and your coding sessions auto-generate updates for the team.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5">
              <code className="font-code text-[11px] text-accent-green">/plugin marketplace add miltonian/vibecircle</code>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-accent-green px-3 py-1.5 text-[11px] font-bold text-black"
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
