"use client"

import { Play } from "lucide-react"

interface ArcIndicatorProps {
  arcTitle: string
  arcSequence?: number | null
  arcId?: string | null
  circleId?: string | null
  totalPosts?: number | null
  onPlayTimelapse?: () => void
}

export function ArcIndicator({
  arcTitle,
  arcSequence,
  totalPosts,
  onPlayTimelapse,
}: ArcIndicatorProps) {
  const seq = arcSequence ?? 0
  const dots = seq > 0 ? Array.from({ length: Math.min(seq, 6) }, (_, i) => i) : []
  const showPlay = (totalPosts ?? 0) >= 2 && onPlayTimelapse

  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border-dim bg-bg-base/60 px-3 py-2">
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
      <span className="text-[11px] text-text-muted">
        Part of{" "}
        <span className="font-medium text-accent-green">{arcTitle}</span>
        {seq > 0 && (
          <>
            {" · "}
            {ordinal(seq)} update
          </>
        )}
      </span>
      {showPlay && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlayTimelapse()
          }}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-accent-green/10 text-accent-green transition-colors hover:bg-accent-green/20"
          aria-label={`Play timelapse for ${arcTitle}`}
        >
          <Play className="h-3 w-3 ml-[1px]" />
        </button>
      )}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
