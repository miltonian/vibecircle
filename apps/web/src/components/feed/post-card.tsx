"use client"

import type { FeedPost } from "@/hooks/use-feed"
import { PostHeader } from "./post-header"
import { PostBody } from "./post-body"
import { ImageCarousel } from "./image-carousel"
import { VideoPreview } from "./video-preview"
import { LiveEmbed } from "./live-embed"
import { CommitBar } from "./commit-bar"

interface PostCardProps {
  post: FeedPost
  index: number
}

export function PostCard({ post, index }: PostCardProps) {
  const images = (post.media ?? []).filter((m) => m.type === "image")
  const video = (post.media ?? []).find((m) => m.type === "video")
  const isLive = post.type === "live"

  // Determine animation delay based on index (staggered entrance)
  const delay = Math.min(index * 60, 300)

  return (
    <article
      className={`post-card rounded-[20px] border bg-bg-card p-5 transition-all duration-300 ${
        isLive
          ? "border-accent-green/20 shadow-[0_0_40px_rgba(0,255,136,0.06)]"
          : "border-border-subtle hover:border-border-medium"
      } hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]`}
      style={{
        animation: `post-fade-in 0.5s ease-out ${delay}ms both`,
      }}
    >
      {/* Header: avatar, name, timestamp, type badge */}
      <PostHeader post={post} />

      {/* Body text */}
      <PostBody body={post.body} />

      {/* Media based on post type */}
      {post.type === "live" && post.metadata?.deploy_url ? (
        <LiveEmbed url={post.metadata.deploy_url} />
      ) : video ? (
        <VideoPreview video={video} />
      ) : images.length > 0 ? (
        <ImageCarousel images={images} />
      ) : null}

      {/* Commit bar */}
      <CommitBar metadata={post.metadata} />

      {/* Reactions + Comments placeholder (Task 8) */}
      <div className="mt-3 flex items-center justify-between border-t border-border-dim pt-3">
        <div className="flex items-center gap-1">
          {/* Reaction counts preview */}
          {Object.keys(post.reactionCounts).length > 0 ? (
            <div className="flex items-center gap-1">
              {Object.entries(post.reactionCounts)
                .slice(0, 4)
                .map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="flex items-center gap-0.5 rounded-full border border-border-dim bg-bg-elevated px-2 py-0.5 text-xs"
                  >
                    <span>{emoji}</span>
                    <span className="text-text-muted">{count}</span>
                  </span>
                ))}
            </div>
          ) : (
            <button className="flex items-center gap-1 rounded-full border border-border-dim px-2 py-0.5 text-xs text-text-muted transition-colors hover:border-border-subtle hover:text-text-secondary">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                />
              </svg>
              React
            </button>
          )}
        </div>

        <button className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-secondary">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
            />
          </svg>
          {post.commentCount > 0 ? (
            <span>{post.commentCount}</span>
          ) : (
            <span>Comment</span>
          )}
        </button>
      </div>
    </article>
  )
}
