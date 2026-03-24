"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import type { PostMedia } from "@/hooks/use-feed"

interface ImageCarouselProps {
  images: PostMedia[]
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const width = el.clientWidth
    const index = Math.round(scrollLeft / width)
    setActiveIndex(Math.min(index, images.length - 1))
  }, [images.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  if (images.length === 0) return null

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            <div className="relative aspect-video w-full overflow-hidden bg-bg-elevated">
              <img
                src={img.url}
                alt={img.caption ?? `Screenshot ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            {img.caption && (
              <p className="mt-1.5 px-1 text-xs text-text-muted">
                {img.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Slide counter badge (top-right) */}
      {images.length > 1 && (
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {activeIndex + 1} / {images.length}
        </div>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                scrollRef.current?.scrollTo({
                  left: i * (scrollRef.current?.clientWidth ?? 0),
                  behavior: "smooth",
                })
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-[18px] bg-accent-green shadow-[0_0_8px_rgba(0,255,136,0.5)]"
                  : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
