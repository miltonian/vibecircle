"use client"

import { useState, useCallback, useRef } from "react"
import { ReactionPicker } from "./reaction-picker"
import { useReactions, type ReactionGroup } from "@/hooks/use-reactions"

interface ReactionBarProps {
  postId: string
  initialReactions: ReactionGroup[]
  userId?: string
}

export function ReactionBar({
  postId,
  initialReactions,
  userId,
}: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionGroup[]>(initialReactions)
  const [showPicker, setShowPicker] = useState(false)
  const snapshotRef = useRef<ReactionGroup[]>(initialReactions)

  const { toggle, isMutating } = useReactions(postId, userId)

  const handleToggle = useCallback(
    (emoji: string) => {
      // Save snapshot for revert
      snapshotRef.current = reactions

      toggle(
        emoji,
        reactions,
        (updated) => setReactions(updated),
        () => setReactions(snapshotRef.current)
      )

      setShowPicker(false)
    },
    [reactions, toggle]
  )

  const userReactions = userId
    ? reactions
        .filter((r) => r.userIds.includes(userId))
        .map((r) => r.emoji)
    : []

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reactions.map((reaction) => {
        const isActive = userReactions.includes(reaction.emoji)
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleToggle(reaction.emoji)}
            disabled={isMutating}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all
              ${
                isActive
                  ? "border border-accent-green/40 bg-accent-green/10 text-accent-green shadow-[0_0_8px_rgba(0,255,136,0.15)]"
                  : "border border-border-subtle bg-bg-elevated/50 text-text-secondary hover:border-border-medium hover:bg-bg-elevated"
              }`}
          >
            <span>{reaction.emoji}</span>
            <span
              className={`font-medium ${
                isActive ? "text-accent-green" : "text-text-muted"
              }`}
            >
              {reaction.count}
            </span>
          </button>
        )
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated/50 text-text-muted transition-all hover:border-border-medium hover:bg-bg-elevated hover:text-text-secondary"
        >
          +
        </button>

        {showPicker && (
          <ReactionPicker
            onSelect={handleToggle}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  )
}
