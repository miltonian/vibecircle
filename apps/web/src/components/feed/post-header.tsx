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

/** Pick a consistent warm-toned gradient for an author based on their name */
function avatarGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, #c4956a, #d4a574)", // copper to light copper
    "linear-gradient(135deg, #a0443a, #c4956a)", // terracotta to copper
    "linear-gradient(135deg, #d4a574, #b8860b)", // light copper to amber
    "linear-gradient(135deg, #c4956a, #a0443a)", // copper to terracotta
    "linear-gradient(135deg, #b8860b, #d4a574)", // amber to light copper
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

/** Narrative verb based on post type */
function narrativeVerb(type: FeedPost["type"]): string {
  switch (type) {
    case "shipped":
      return "shipped"
    case "live":
      return "went live"
    case "wip":
      return "is building"
    case "video":
      return "shared"
    case "ambient":
    default:
      return "posted"
  }
}

const typeBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  shipped: {
    label: "SHIPPED",
    className:
      "bg-accent-green/15 text-accent-green border-accent-green/25",
  },
  wip: {
    label: "WIP",
    className:
      "bg-accent-pink/12 text-accent-pink border-accent-pink/20",
  },
  live: {
    label: "LIVE",
    className:
      "bg-accent-green/20 text-accent-green border-accent-green/30 font-bold",
  },
  video: {
    label: "VIDEO",
    className:
      "bg-accent-pink/12 text-accent-pink border-accent-pink/20",
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
  const { author, createdAt, type, arcTitle } = post
  const badge = typeBadgeConfig[type] ?? typeBadgeConfig.ambient
  const gradient = avatarGradient(author.name ?? "?")
  const verb = narrativeVerb(type)

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Left: Avatar + Author info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar with warm gradient ring */}
        <div className="relative shrink-0">
          <div
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full p-[2px]"
            style={{ background: gradient }}
          >
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

        {/* Narrative header + subheader */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-[14.5px] font-bold leading-tight text-text-primary">
              {author.name ?? "Anonymous"}
            </span>
            <span className="shrink-0 text-[13px] text-text-muted">
              {verb}
            </span>
          </div>
          {/* Subheader: timestamp + arc context */}
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-dim">
            <span>{timeAgo(createdAt)}</span>
            {arcTitle && (
              <>
                <span className="text-text-dim/50">·</span>
                <span className="truncate text-accent-green/80">
                  {arcTitle}
                </span>
              </>
            )}
          </div>
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
