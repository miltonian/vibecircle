"use client"

import type { TimelapseFrame } from "@/hooks/use-timelapse"

interface TimelapseFrameProps {
  frame: TimelapseFrame
}

export function TimelapseFrameView({ frame }: TimelapseFrameProps) {
  const firstImage = (frame.media ?? []).find((m) => m.type === "image")

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      {firstImage ? (
        /* Screenshot frame */
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl">
          <div className="relative aspect-video w-full bg-bg-elevated">
            <img
              src={firstImage.url}
              alt={frame.headline ?? "Screenshot"}
              className="h-full w-full object-cover"
            />
          </div>
          {/* Headline overlay */}
          {frame.headline && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-4 pt-10">
              <p className="font-display text-base font-semibold text-white sm:text-lg">
                {frame.headline}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Text-only frame */
        <div className="flex w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-border-dim bg-bg-card px-8 py-16 text-center">
          <p className="font-display text-xl font-bold text-text-primary sm:text-2xl">
            {frame.headline ?? "Update"}
          </p>
          {frame.type && (
            <span className="mt-3 text-xs text-text-muted">
              {frame.type === "shipped" ? "Shipped" : frame.type === "wip" ? "Work in progress" : "Update"}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
