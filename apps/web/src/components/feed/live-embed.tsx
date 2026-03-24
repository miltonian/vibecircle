"use client"

import { useState } from "react"

interface LiveEmbedProps {
  url: string
}

export function LiveEmbed({ url }: LiveEmbedProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available
    }
  }

  // Extract display hostname
  let displayUrl = url
  try {
    const parsed = new URL(url)
    displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "")
  } catch {
    // Use raw URL if parsing fails
  }

  return (
    <div className="mt-3">
      {/* iframe viewport */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-green/20 shadow-[0_0_30px_rgba(0,255,136,0.08)]">
        {/* INTERACTIVE badge */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green shadow-[0_0_6px_rgba(0,255,136,0.6)]" />
          <span className="text-[10px] font-bold tracking-wider text-accent-green">
            INTERACTIVE
          </span>
        </div>

        <iframe
          src={url}
          title="Live preview"
          className="h-[320px] w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
        />
      </div>

      {/* Toolbar */}
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border-dim bg-bg-elevated/50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-code text-xs text-text-muted">
          {displayUrl}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
        >
          Open
        </a>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  )
}
