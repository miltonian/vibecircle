"use client"

import { useFeed } from "@/hooks/use-feed"
import { PostCard } from "./post-card"
import { CreatePostDialog } from "./create-post-dialog"

interface FeedViewProps {
  circleId: string
  userId?: string
}

export function FeedView({ circleId, userId }: FeedViewProps) {
  const { data, error, isLoading, mutate } = useFeed(circleId)

  const posts = data?.posts ?? []

  return (
    <>
      {/* Feed content */}
      {isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-accent-pink">
              Failed to load feed. Please try again.
            </p>
            <button
              onClick={() => mutate()}
              className="mt-3 rounded-xl bg-bg-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} userId={userId} />
          ))}
        </div>
      )}

      {/* Create post FAB + dialog */}
      <CreatePostDialog circleId={circleId} onPostCreated={() => mutate()} />
    </>
  )
}

function EmptyFeed() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
          <svg
            className="h-8 w-8 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          No posts yet
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Start building and share with{" "}
          <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-code text-xs text-accent-green">
            /share
          </code>
        </p>
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-[20px] border border-border-subtle bg-bg-card p-5"
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-[38px] w-[38px] rounded-full bg-bg-elevated" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-bg-elevated" />
              <div className="mt-1.5 h-3 w-20 rounded bg-bg-elevated" />
            </div>
            <div className="h-5 w-16 rounded-full bg-bg-elevated" />
          </div>
          {/* Body skeleton */}
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full rounded bg-bg-elevated" />
            <div className="h-3.5 w-3/4 rounded bg-bg-elevated" />
          </div>
          {/* Media skeleton */}
          <div className="mt-3 aspect-video w-full rounded-2xl bg-bg-elevated" />
        </div>
      ))}
    </div>
  )
}
