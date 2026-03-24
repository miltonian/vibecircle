"use client"

import type { PostMedia } from "@/hooks/use-feed"

interface VideoPreviewProps {
  video: PostMedia
}

export function VideoPreview({ video }: VideoPreviewProps) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl">
      {/* Video container with gradient fallback */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-bg-elevated to-bg-surface">
        <video
          src={video.url}
          className="h-full w-full object-cover"
          preload="metadata"
          muted
          playsInline
        />

        {/* REC badge top-left */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-bold tracking-wider text-white">
            REC
          </span>
        </div>

        {/* Play button overlay */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg
              className="ml-1 h-7 w-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </a>
      </div>

      {video.caption && (
        <p className="mt-1.5 px-1 text-xs text-text-muted">{video.caption}</p>
      )}
    </div>
  )
}
