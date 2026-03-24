"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { CommentRow } from "./comment-row"
import { CommentInput } from "./comment-input"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CommentData {
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
}

interface CommentListProps {
  postId: string
  initialCommentCount?: number
}

export function CommentList({ postId, initialCommentCount = 0 }: CommentListProps) {
  const { data, mutate } = useSWR<{ comments: CommentData[] }>(
    `/api/posts/${postId}/comments`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const [expanded, setExpanded] = useState(false)

  const comments = data?.comments ?? []
  const visibleLimit = 3
  const hasMore = comments.length > visibleLimit
  const visibleComments = expanded ? comments : comments.slice(-visibleLimit)

  const handleCommentAdded = useCallback(
    (comment: CommentData) => {
      // Optimistic update: add the new comment to the local cache
      mutate(
        (current) => {
          if (!current) return { comments: [comment] }
          return { comments: [...current.comments, comment] }
        },
        { revalidate: false }
      )
      // Auto-expand when a new comment is added and we're collapsed
      if (!expanded && comments.length >= visibleLimit) {
        setExpanded(true)
      }
    },
    [mutate, expanded, comments.length]
  )

  return (
    <div className="space-y-1">
      {/* Collapsed indicator */}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          View {comments.length - visibleLimit} more comment
          {comments.length - visibleLimit > 1 ? "s" : ""}...
        </button>
      )}

      {/* Comment rows */}
      {visibleComments.map((comment) => (
        <CommentRow
          key={comment.id}
          author={comment.author}
          body={comment.body}
          isAi={comment.isAi}
        />
      ))}

      {/* Input */}
      <div className="pt-1">
        <CommentInput postId={postId} onCommentAdded={handleCommentAdded} />
      </div>
    </div>
  )
}
