"use client"

interface ArcIndicatorProps {
  arcTitle: string
  arcSequence?: number | null
}

export function ArcIndicator({ arcTitle, arcSequence }: ArcIndicatorProps) {
  const seq = arcSequence ?? 0
  const dots = seq > 0 ? Array.from({ length: Math.min(seq, 6) }, (_, i) => i) : []

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
    </div>
  )
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
