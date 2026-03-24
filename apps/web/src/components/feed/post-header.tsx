"use client"

import type { FeedPost } from "@/hooks/use-feed"

/** Format a timestamp into a relative time string */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Pick a consistent gradient for an author based on their name */
function avatarGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, #00ff88, #00ccff)",
    "linear-gradient(135deg, #a855f7, #ff0066)",
    "linear-gradient(135deg, #fbbf24, #ff0066)",
    "linear-gradient(135deg, #00ccff, #a855f7)",
    "linear-gradient(135deg, #00ff88, #a855f7)",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

const typeBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  shipped: {
    label: "SHIPPED",
    className:
      "bg-[rgba(168,85,247,0.15)] text-[#a855f7] border-[rgba(168,85,247,0.25)]",
  },
  wip: {
    label: "WIP",
    className:
      "bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.2)]",
  },
  live: {
    label: "LIVE",
    className:
      "live-badge bg-gradient-to-r from-[#00ff88] to-[#00ccff] text-black border-transparent font-bold",
  },
  video: {
    label: "VIDEO",
    className:
      "bg-[rgba(255,0,102,0.12)] text-[#ff0066] border-[rgba(255,0,102,0.2)]",
  },
  ambient: {
    label: "UPDATE",
    className:
      "bg-[rgba(255,255,255,0.06)] text-text-secondary border-border-subtle",
  },
}

interface PostHeaderProps {
  post: FeedPost
}

export function PostHeader({ post }: PostHeaderProps) {
  const { author, createdAt, type, metadata } = post
  const badge = typeBadgeConfig[type] ?? typeBadgeConfig.ambient
  const gradient = avatarGradient(author.name ?? "?")

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Left: Avatar + Author info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar with gradient ring */}
        <div className="relative shrink-0">
          {/* Outer gradient ring */}
          <div
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full p-[2px]"
            style={{ background: gradient }}
          >
            {/* Inner circle */}
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.name ?? ""}
                className="h-full w-full rounded-full object-cover ring-2 ring-bg-card"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card text-sm font-bold text-text-primary">
                {(author.name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Author name + timestamp + tool badge */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[14.5px] font-bold leading-tight text-text-primary">
              {author.name ?? "Anonymous"}
            </span>
            <span className="shrink-0 text-[11px] text-text-dim">
              {timeAgo(createdAt)}
            </span>
          </div>
          {/* Tech tags / tool badge */}
          {metadata?.tech_tags && metadata.tech_tags.length > 0 && (
            <div className="mt-0.5 flex items-center gap-1.5">
              {metadata.tech_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 font-code text-[10px] text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Type badge */}
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
      >
        {badge.label}
      </span>
    </div>
  )
}
