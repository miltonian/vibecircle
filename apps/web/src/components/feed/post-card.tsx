"use client"

import type { FeedPost } from "@/hooks/use-feed"
import type { ReactionGroup } from "@/hooks/use-reactions"
import { PostHeader } from "./post-header"
import { PostBody } from "./post-body"
import { ImageCarousel } from "./image-carousel"
import { VideoPreview } from "./video-preview"
import { LiveEmbed } from "./live-embed"
import { ArcIndicator } from "./arc-indicator"
import { ReactionBar } from "@/components/reactions/reaction-bar"
import { CommentList } from "@/components/comments/comment-list"

interface PostCardProps {
  post: FeedPost
  index: number
  userId?: string
}

export function PostCard({ post, index, userId }: PostCardProps) {
  const images = (post.media ?? []).filter((m) => m.type === "image")
  const video = (post.media ?? []).find((m) => m.type === "video")
  const isLive = post.type === "live"

  // Determine animation delay based on index (staggered entrance)
  const delay = Math.min(index * 60, 300)

  // Convert reactionCounts (Record<string, number>) to ReactionGroup[] for ReactionBar
  const initialReactions: ReactionGroup[] = Object.entries(
    post.reactionCounts
  ).map(([emoji, count]) => ({
    emoji,
    count,
    userIds: [],
  }))

  return (
    <article
      className={`post-card rounded-[18px] border bg-bg-card p-[18px] transition-all duration-300 ${
        isLive
          ? "border-accent-green/15 shadow-[0_0_30px_rgba(196,149,106,0.06)]"
          : "border-border-subtle hover:border-border-dim hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
      }`}
      style={{
        animation: `post-fade-in 0.5s ease-out ${delay}ms both`,
      }}
    >
      {/* Header: avatar, narrative, timestamp, type badge */}
      <PostHeader post={post} />

      {/* Body: headline + description */}
      <PostBody headline={post.headline} body={post.body} />

      {/* Media based on post type */}
      {post.type === "live" && post.metadata?.deploy_url ? (
        <LiveEmbed url={post.metadata.deploy_url} />
      ) : video ? (
        <VideoPreview video={video} />
      ) : images.length > 0 ? (
        <ImageCarousel images={images} />
      ) : null}

      {/* Arc indicator */}
      {post.arcTitle && post.arcSequence != null && (
        <ArcIndicator arcTitle={post.arcTitle} arcSequence={post.arcSequence} />
      )}

      {/* Reactions */}
      <div className="mt-3 border-t border-border-dim pt-3">
        <ReactionBar
          postId={post.id}
          initialReactions={initialReactions}
          userId={userId}
        />
      </div>

      {/* Comments */}
      <div className="mt-2">
        <CommentList
          postId={post.id}
          initialCommentCount={post.commentCount}
        />
      </div>
    </article>
  )
}
