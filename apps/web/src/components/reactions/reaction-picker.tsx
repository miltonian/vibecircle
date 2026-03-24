"use client"

import { useEffect, useRef } from "react"

const EMOJIS = [
  "\uD83D\uDD25", // fire
  "\uD83D\uDE0D", // heart eyes
  "\uD83D\uDE80", // rocket
  "\uD83D\uDC8E", // gem
  "\uD83E\uDD2F", // exploding head
  "\u26A1",       // zap
  "\u2764\uFE0F", // red heart
  "\uD83C\uDFAE", // game controller
  "\u2728",       // sparkles
  "\uD83D\uDC40", // eyes
]

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-2 rounded-xl border border-border-subtle bg-bg-card p-2 shadow-lg"
    >
      <div className="grid grid-cols-5 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-bg-elevated"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
