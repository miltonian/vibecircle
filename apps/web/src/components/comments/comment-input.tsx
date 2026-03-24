"use client"

import { useState, useCallback } from "react"

interface CommentInputProps {
  postId: string
  onCommentAdded: (comment: {
    id: string
    postId: string
    body: string
    isAi: boolean | null
    createdAt: string
    author: {
      id: string
      name: string | null
      avatarUrl: string | null
    }
  }) => void
}

export function CommentInput({ postId, onCommentAdded }: CommentInputProps) {
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    const body = value.trim()
    if (!body || isSubmitting) return

    setIsSubmitting(true)
    setValue("")

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })

      if (!res.ok) throw new Error("Failed to add comment")

      const comment = await res.json()
      onCommentAdded(comment)
    } catch {
      // Restore the input value on error
      setValue(body)
    } finally {
      setIsSubmitting(false)
    }
  }, [value, isSubmitting, postId, onCommentAdded])

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
      }}
      placeholder="Write a comment..."
      disabled={isSubmitting}
      className="w-full rounded-lg border border-border-subtle bg-bg-elevated/50 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-border-medium focus:bg-bg-elevated disabled:opacity-50"
    />
  )
}
