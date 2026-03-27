"use client"

import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react"

interface TimelapseControlsProps {
  currentFrame: number
  totalFrames: number
  isPlaying: boolean
  speed: 1 | 2 | 4
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onCycleSpeed: () => void
  onGoToFrame: (index: number) => void
}

export function TimelapseControls({
  currentFrame,
  totalFrames,
  isPlaying,
  speed,
  onTogglePlay,
  onPrev,
  onNext,
  onCycleSpeed,
  onGoToFrame,
}: TimelapseControlsProps) {
  const useProgressBar = totalFrames > 10

  return (
    <div className="flex items-center gap-4">
      {/* Progress: dots or bar */}
      <div className="flex-1">
        {useProgressBar ? (
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent-green transition-all duration-300"
              style={{
                width: `${((currentFrame + 1) / totalFrames) * 100}%`,
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalFrames }, (_, i) => (
              <button
                key={i}
                aria-label={`Go to frame ${i + 1}`}
                onClick={() => onGoToFrame(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentFrame
                    ? "w-[18px] bg-accent-green shadow-[0_0_8px_rgba(0,255,136,0.5)]"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Previous frame"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        <button
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Next frame"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          onClick={onCycleSpeed}
          className="ml-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label={`Speed: ${speed}s per frame`}
        >
          {speed}s
        </button>
      </div>
    </div>
  )
}
