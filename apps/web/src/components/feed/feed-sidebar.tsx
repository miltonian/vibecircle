"use client"

import useSWR from "swr"
import { usePresence } from "@/hooks/use-presence"
import { useArcs } from "@/hooks/use-arcs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Member {
  userId: string
  name: string | null
  avatarUrl: string | null
  image: string | null
  role: string
  hasPlugin: boolean
}

interface FeedSidebarProps {
  circleId: string
  selectedArc: string | null
  onArcSelect: (arcId: string | null) => void
}

export function FeedSidebar({ circleId, selectedArc, onArcSelect }: FeedSidebarProps) {
  const { data: presenceData } = usePresence(circleId)
  const { data: arcs } = useArcs(circleId)
  const { data: members } = useSWR<Member[]>(`/api/circles/${circleId}/members`, fetcher)

  const presenceMembers = presenceData?.members ?? []
  const statusOrder: Record<string, number> = { building: 0, online: 1, away: 2 }
  const sortedPresence = [...presenceMembers].sort(
    (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  )

  return (
    <aside className="hidden w-[220px] shrink-0 md:block" style={{ position: "sticky", top: 76, alignSelf: "flex-start" }}>
      {/* Building now */}
      <div className="mb-6">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Building now
        </div>
        {sortedPresence.map((m) => (
          <div key={m.userId} className="flex items-center gap-2 py-1.5">
            <div
              className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                m.status === "building"
                  ? "bg-accent-green shadow-[0_0_6px_var(--color-glow-green)]"
                  : "bg-text-dim"
              }`}
            />
            <span className={`text-xs font-medium ${m.status === "building" ? "text-text-primary" : "text-text-muted"}`}>
              {m.name ?? "Anonymous"}
            </span>
            <span className="ml-auto text-[10px] text-text-muted">
              {timeAgoShort(m.updatedAt)}
            </span>
          </div>
        ))}
        {sortedPresence.length === 0 && (
          <div className="text-[11px] text-text-dim">No one online</div>
        )}
      </div>

      <hr className="mb-4 border-border-dim" />

      {/* Arcs */}
      <div className="mb-6">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Arcs
        </div>
        <button
          onClick={() => onArcSelect(null)}
          className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
            selectedArc === null ? "bg-accent-green/[0.06] text-text-primary" : "text-accent-green hover:bg-bg-elevated"
          }`}
        >
          All posts
        </button>
        {(arcs ?? []).map((arc) => (
          <button
            key={arc.arcId}
            onClick={() => onArcSelect(arc.arcId)}
            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              selectedArc === arc.arcId ? "bg-accent-green/[0.06] text-text-primary" : "text-accent-green hover:bg-bg-elevated"
            }`}
          >
            <span className="font-medium">{arc.arcTitle ?? "Untitled"}</span>
            <span className="text-text-dim">{arc.postCount}</span>
          </button>
        ))}
      </div>

      <hr className="mb-4 border-border-dim" />

      {/* Members */}
      <div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Members · {members?.length ?? 0}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(members ?? []).map((m) => (
            <div key={m.userId} className="flex items-center gap-1.5 rounded-md bg-bg-elevated px-2 py-1">
              {m.avatarUrl || m.image ? (
                <img src={m.avatarUrl || m.image || ""} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-green/10 text-[8px] font-bold text-accent-green">
                  {(m.name?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <span className="text-[10px] text-text-secondary">{m.name ?? "?"}</span>
              {m.hasPlugin ? (
                <div className="h-1 w-1 rounded-full bg-accent-green" />
              ) : (
                <span className="text-[8px] text-text-dim">no plugin</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function timeAgoShort(dateStr: string | null): string {
  if (!dateStr) return ""
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
