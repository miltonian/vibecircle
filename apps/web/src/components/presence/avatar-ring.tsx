"use client"

interface AvatarRingProps {
  name: string
  emoji?: string
  status: string
  className?: string
}

export function AvatarRing({ name, emoji, status, className = "" }: AvatarRingProps) {
  const initial = name?.[0]?.toUpperCase() ?? "?"

  // Gradient and animation styles based on status
  const ringStyles: Record<string, { gradient: string; animate: boolean }> = {
    building: {
      gradient: "linear-gradient(135deg, #00ff88, #00ccff)",
      animate: true,
    },
    online: {
      gradient: "linear-gradient(135deg, #a855f7, #ff0066)",
      animate: false,
    },
    away: {
      gradient: "linear-gradient(135deg, #3a3a3a, #3a3a3a)",
      animate: false,
    },
  }

  const ring = ringStyles[status] ?? ringStyles.away

  return (
    <div
      className={`relative group ${className}`}
      title={`${name} \u00B7 ${status}`}
    >
      {/* Outer ring with gradient border */}
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full p-[2px] ${
          ring.animate ? "avatar-ring-pulse" : ""
        }`}
        style={{ background: ring.gradient }}
      >
        {/* Inner circle */}
        <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-base text-xs font-semibold text-text-secondary">
          {emoji ?? initial}
        </div>
      </div>

      {/* Tooltip */}
      <div className="pointer-events-none absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-elevated px-2 py-1 text-[10px] text-text-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {name} &middot; {status}
      </div>

      <style jsx>{`
        @keyframes ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.2); }
          50% { box-shadow: 0 0 0 4px rgba(0, 255, 136, 0); }
        }
        .avatar-ring-pulse {
          animation: ring-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
