"use client"

import type { FeedPost } from "@/hooks/use-feed"
import type { ReactionGroup } from "@/hooks/use-reactions"
import { PostHeader } from "./post-header"
import { PostBody } from "./post-body"
import { ArcIndicator } from "./arc-indicator"
import { ImageCarousel } from "./image-carousel"
import { VideoPreview } from "./video-preview"
import { LiveEmbed } from "./live-embed"
import { ReactionBar } from "@/components/reactions/reaction-bar"
import { CommentList } from "@/components/comments/comment-list"

interface PostCardProps {
  post: FeedPost
  index: number
  userId?: string
}

function getCardVariant(post: FeedPost): "hero" | "standard" | "compact" {
  const hasImages = (post.media ?? []).some((m) => m.type === "image")
  if (post.type === "shipped" && hasImages) return "hero"
  if (post.type === "wip" || post.type === "ambient") return "compact"
  return "standard"
}

export function PostCard({ post, index, userId }: PostCardProps) {
  const variant = getCardVariant(post)
  const images = (post.media ?? []).filter((m) => m.type === "image")
  const video = (post.media ?? []).find((m) => m.type === "video")
  const delay = Math.min(index * 60, 300)

  const initialReactions: ReactionGroup[] = Object.entries(
    post.reactionCounts
  ).map(([emoji, count]) => ({
    emoji,
    count,
    userIds: [],
  }))

  if (variant === "compact") {
    return (
      <article
        className="overflow-visible rounded-xl border border-border-dim bg-bg-card px-4 py-3.5 transition-all duration-200 hover:border-border-subtle"
        style={{ animation: `post-fade-in 0.4s ease-out ${delay}ms both` }}
      >
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="relative shrink-0">
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full p-[1.5px]"
              style={{ background: "linear-gradient(135deg, #a0443a, #c4956a)" }}
            >
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt="" className="h-full w-full rounded-full object-cover ring-1 ring-bg-card" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card text-[10px] font-bold text-text-primary">
                  {(post.author.name?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span className="text-[13px] font-medium text-text-primary">{post.author.name ?? "Anonymous"}</span>
          <span className="text-[12px] text-text-muted">{post.type === "wip" ? "is building" : "posted"}</span>
          <span className="ml-auto text-[10px] text-text-dim">{timeAgo(post.createdAt)}</span>
        </div>

        <PostBody headline={post.headline} body={post.body} />

        {/* Media — compact cards still show images/video/embeds */}
        {post.type === "live" && post.metadata?.deploy_url ? (
          <LiveEmbed url={post.metadata.deploy_url} />
        ) : video ? (
          <VideoPreview video={video} />
        ) : images.length > 0 ? (
          <ImageCarousel images={images} />
        ) : null}

        {/* Reactions */}
        <div className="relative mt-2 overflow-visible border-t border-border-dim pt-2">
          <ReactionBar postId={post.id} initialReactions={initialReactions} userId={userId} />
        </div>
      </article>
    )
  }

  if (variant === "hero") {
    return (
      <article
        className="overflow-hidden rounded-2xl border border-accent-green/10 bg-bg-card transition-all duration-200 hover:border-accent-green/15"
        style={{ animation: `post-fade-in 0.4s ease-out ${delay}ms both` }}
      >
        {/* Hero image */}
        {images.length > 0 && (
          <div className="relative">
            <ImageCarousel images={images} />
            <div className="absolute top-3 right-3 rounded-md bg-black/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-accent-green backdrop-blur-sm">
              Shipped
            </div>
            {post.metadata?.deploy_url && (
              <a
                href={post.metadata.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 rounded-lg bg-accent-green/15 px-3 py-1.5 text-[10px] font-semibold text-accent-green backdrop-blur-sm transition-colors hover:bg-accent-green/25"
              >
                Try it live ↗
              </a>
            )}
          </div>
        )}

        <div className="p-[18px]">
          <PostHeader post={post} />
          <PostBody headline={post.headline} body={post.body} />
        </div>

        {post.arcId && post.arcTitle && post.arcSequence != null && (
          <div className="px-[18px]">
            <ArcIndicator arcTitle={post.arcTitle} arcSequence={post.arcSequence} />
          </div>
        )}

        <div className="relative overflow-visible border-t border-border-dim mx-[18px] mt-3 pt-3 pb-4">
          <ReactionBar postId={post.id} initialReactions={initialReactions} userId={userId} />
        </div>

        <div className="px-[18px] pb-4">
          <CommentList postId={post.id} initialCommentCount={post.commentCount} />
        </div>
      </article>
    )
  }

  // Standard variant
  return (
    <article
      className="overflow-visible rounded-2xl border border-border-dim bg-bg-card p-[18px] transition-all duration-200 hover:border-border-subtle"
      style={{ animation: `post-fade-in 0.4s ease-out ${delay}ms both` }}
    >
      <div className={images.length > 0 ? "flex gap-4" : ""}>
        <div className="flex-1 min-w-0">
          <PostHeader post={post} />
          <PostBody headline={post.headline} body={post.body} />
        </div>
        {images.length > 0 && (
          <div className="mt-2 w-[140px] h-[100px] shrink-0 overflow-hidden rounded-xl">
            <img src={images[0].url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {video && <VideoPreview video={video} />}
      {post.type === "live" && post.metadata?.deploy_url && <LiveEmbed url={post.metadata.deploy_url} />}

      {post.arcId && post.arcTitle && post.arcSequence != null && (
        <ArcIndicator arcTitle={post.arcTitle} arcSequence={post.arcSequence} />
      )}

      <div className="relative mt-3 overflow-visible border-t border-border-dim pt-3">
        <ReactionBar postId={post.id} initialReactions={initialReactions} userId={userId} />
      </div>

      <div className="mt-2">
        <CommentList postId={post.id} initialCommentCount={post.commentCount} />
      </div>
    </article>
  )
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
