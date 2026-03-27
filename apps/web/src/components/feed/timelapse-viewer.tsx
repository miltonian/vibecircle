"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X } from "lucide-react"
import { useTimelapse } from "@/hooks/use-timelapse"
import { TimelapseFrameView } from "./timelapse-frame"
import { TimelapseControls } from "./timelapse-controls"

interface TimelapseViewerProps {
  circleId: string
  arcId: string
  onClose: () => void
}

type Speed = 1 | 2 | 4
const SPEEDS: Speed[] = [1, 2, 4]

function formatElapsed(startDate: string, currentDate: string): string {
  const diffMs = new Date(currentDate).getTime() - new Date(startDate).getTime()
  if (diffMs < 0) return "0m"
  const totalMinutes = Math.floor(diffMs / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours < 24) return `${hours}h ${minutes}m`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

export function TimelapseViewer({
  circleId,
  arcId,
  onClose,
}: TimelapseViewerProps) {
  const { data, error, mutate } = useTimelapse(circleId, arcId)

  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState<Speed>(2)
  const [frameOpacity, setFrameOpacity] = useState(1)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const frames = data?.frames ?? []
  const totalFrames = frames.length

  // --- Scroll lock ---
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // --- Playback engine (chained setTimeout) ---
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Fade-out, swap content, fade-in for smooth transition
  const advance = useCallback(() => {
    setFrameOpacity(0) // Start fade-out
    setTimeout(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1
        if (next >= totalFrames) {
          setIsPlaying(false)
          return 0
        }
        return next
      })
      setFrameOpacity(1) // Fade back in with new content
    }, 150) // Half of the 300ms transition — swap at the midpoint
  }, [totalFrames])

  useEffect(() => {
    clearTimer()
    if (isPlaying && totalFrames > 1) {
      timeoutRef.current = setTimeout(advance, speed * 1000)
    }
    return clearTimer
  }, [isPlaying, currentFrame, speed, totalFrames, advance, clearTimer])

  // --- Image preloading ---
  useEffect(() => {
    if (frames.length === 0) return
    const nextFrame = frames[currentFrame + 1]
    if (!nextFrame?.media) return
    const firstImage = nextFrame.media.find((m) => m.type === "image")
    if (firstImage) {
      const img = new Image()
      img.src = firstImage.url
    }
  }, [currentFrame, frames])

  // --- Controls ---
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p)
  }, [])

  const goToFrame = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalFrames) return
      setFrameOpacity(0)
      setTimeout(() => {
        setCurrentFrame(index)
        setFrameOpacity(1)
      }, 150)
    },
    [totalFrames]
  )

  const prev = useCallback(() => {
    goToFrame(Math.max(0, currentFrame - 1))
  }, [currentFrame, goToFrame])

  const next = useCallback(() => {
    if (currentFrame < totalFrames - 1) {
      goToFrame(currentFrame + 1)
    }
  }, [currentFrame, totalFrames, goToFrame])

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = SPEEDS.indexOf(s)
      return SPEEDS[(idx + 1) % SPEEDS.length]
    })
  }, [])

  // --- Keyboard ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          prev()
          break
        case "ArrowRight":
          e.preventDefault()
          next()
          break
        case " ":
          e.preventDefault()
          togglePlay()
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [prev, next, togglePlay, onClose])

  // --- Swipe detection ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x
      touchStartRef.current = null
      if (Math.abs(dx) < 50) return
      if (dx < 0) next()
      else prev()
    },
    [next, prev]
  )

  // --- Render ---
  const frame = frames[currentFrame]

  // Loading state
  if (!data && !error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="animate-pulse text-sm text-text-muted">
          Loading timelapse...
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data || frames.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-sm text-accent-pink">
            {error ? "Failed to load timelapse." : "No frames in this arc."}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => mutate()}
              className="rounded-xl bg-bg-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-text-muted transition-colors hover:text-text-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const elapsed =
    frames.length > 1 && frame
      ? formatElapsed(frames[0].createdAt, frame.createdAt)
      : null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
      style={{ animation: "fade-in 0.15s ease-out" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close timelapse"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-semibold text-white">
            {data.arcTitle}
          </span>
          {frame?.author.avatarUrl && (
            <img
              src={frame.author.avatarUrl}
              alt={frame.author.name ?? ""}
              className="h-6 w-6 rounded-full"
            />
          )}
          {frame?.author.name && (
            <span className="text-xs text-white/50">{frame.author.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span>
            {currentFrame + 1} / {totalFrames}
          </span>
          {elapsed && <span>{elapsed}</span>}
        </div>
      </div>

      {/* Frame area with fade transition */}
      <div
        className="relative flex-1 overflow-hidden px-4 sm:px-8"
        onClick={togglePlay}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-150 sm:px-8"
          style={{ opacity: frameOpacity }}
        >
          {frame && <TimelapseFrameView frame={frame} />}
        </div>
      </div>

      {/* Controls bar */}
      <div className="px-4 py-4 sm:px-6">
        <TimelapseControls
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          isPlaying={isPlaying}
          speed={speed}
          onTogglePlay={togglePlay}
          onPrev={prev}
          onNext={next}
          onCycleSpeed={cycleSpeed}
          onGoToFrame={goToFrame}
        />
      </div>
    </div>
  )
}
