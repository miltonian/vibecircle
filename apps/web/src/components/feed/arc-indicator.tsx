"use client"

import { Play, ExternalLink } from "lucide-react"

interface ArcIndicatorProps {
  arcTitle: string
  arcSequence?: number | null
  arcId?: string | null
  circleId?: string | null
  totalPosts?: number | null
  epicRef?: { source: string; id: string; url: string } | null
  ticket?: { source: string; id: string; title: string; url: string; status: string } | null
  epicProgress?: { total: number; done: number; inProgress: number } | null
  onPlayTimelapse?: () => void
  onArcClick?: () => void
}

export function ArcIndicator({
  arcTitle,
  arcSequence,
  totalPosts,
  epicRef,
  ticket,
  epicProgress,
  onPlayTimelapse,
  onArcClick,
}: ArcIndicatorProps) {
  const seq = arcSequence ?? 0
  const dots = seq > 0 ? Array.from({ length: Math.min(seq, 6) }, (_, i) => i) : []
  const showPlay = (totalPosts ?? 0) >= 2 && onPlayTimelapse

  return (
    <div className="mt-3 rounded-lg border border-border-dim bg-bg-base/60 px-3 py-2.5">
      {/* Top row: arc name, epic link, ticket badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green" />
          <button
            onClick={onArcClick}
            className="text-[12px] font-semibold text-accent-green hover:underline"
          >
            {arcTitle}
          </button>
        </div>

        {epicRef && (
          <a
            href={epicRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {epicRef.source === "linear" ? "Linear" : epicRef.source === "jira" ? "Jira" : "GitHub"}
          </a>
        )}

        {ticket && (
          <a
            href={ticket.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded border border-border-dim bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted hover:text-text-secondary"
          >
            {ticket.id}
          </a>
        )}
      </div>

      {/* Progress bar */}
      {epicProgress && epicProgress.total > 0 && (
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex-1 h-1 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green/70"
              style={{ width: `${(epicProgress.done / epicProgress.total) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-text-dim whitespace-nowrap">
            {epicProgress.done} of {epicProgress.total} done
          </span>
        </div>
      )}

      {/* Dots + sequence + timelapse */}
      <div className="mt-2 flex items-center gap-2">
        {dots.length > 0 && (
          <div className="flex gap-1">
            {dots.map((i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === seq - 1
                    ? "bg-accent-green shadow-[0_0_4px_var(--color-glow-green)]"
                    : "bg-accent-green/50"
                }`}
              />
            ))}
          </div>
        )}
        {seq > 0 && (
          <span className="text-[10px] text-text-dim">
            {ordinal(seq)} update
          </span>
        )}
        {showPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlayTimelapse()
            }}
            className="ml-auto flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary"
            aria-label={`Play timelapse for ${arcTitle}`}
          >
            <Play className="h-3 w-3" />
            Timelapse
          </button>
        )}
      </div>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
