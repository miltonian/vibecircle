"use client"

import { ExternalLink, Play, X } from "lucide-react"
import type { Arc } from "@/hooks/use-arcs"

interface ArcDetailHeaderProps {
  arc: Arc
  onClose: () => void
  onPlayTimelapse?: () => void
}

export function ArcDetailHeader({ arc, onClose, onPlayTimelapse }: ArcDetailHeaderProps) {
  return (
    <div className="rounded-2xl border border-border-dim bg-bg-card p-5 mb-4">
      {/* Title row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-2 w-2 shrink-0 rounded-full bg-accent-green" />
        <h2 className="font-display text-lg font-bold text-text-primary">{arc.title}</h2>
        {arc.epicRef && (
          <a
            href={arc.epicRef.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-bg-elevated px-2.5 py-1 text-[11px] text-text-muted hover:text-text-secondary"
          >
            <ExternalLink className="h-3 w-3" />
            Open in {arc.epicRef.source === "linear" ? "Linear" : arc.epicRef.source === "jira" ? "Jira" : "GitHub"}
          </a>
        )}
        <div className="ml-auto flex items-center gap-2">
          {arc.postCount >= 2 && onPlayTimelapse && (
            <button
              onClick={onPlayTimelapse}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary"
            >
              <Play className="h-3.5 w-3.5" />
              Play timelapse
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted hover:bg-bg-elevated hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {arc.epicProgress && arc.epicProgress.total > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green/70"
              style={{ width: `${(arc.epicProgress.done / arc.epicProgress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">
            {arc.epicProgress.done} of {arc.epicProgress.total} tickets done
          </span>
        </div>
      )}

      {/* Contributors + stats */}
      <div className="flex items-center gap-2 pt-3 border-t border-border-dim">
        <div className="flex items-center">
          {arc.contributors.slice(0, 5).map((c, i) => (
            <div
              key={c.id}
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-bg-card text-[9px] font-bold"
              style={{ marginLeft: i > 0 ? -6 : 0, backgroundColor: `hsl(${c.id.charCodeAt(0) * 37 % 360}, 40%, 35%)` }}
            >
              <span className="text-text-primary">{(c.name?.[0] ?? "?").toUpperCase()}</span>
            </div>
          ))}
        </div>
        <span className="text-[11px] text-text-dim">
          {arc.contributors.length} contributor{arc.contributors.length !== 1 ? "s" : ""} · {arc.postCount} update{arc.postCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
