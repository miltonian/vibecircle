"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Member {
  userId: string
  name: string | null
  email: string | null
  avatarUrl: string | null
  image: string | null
  role: string
}

interface MembersPanelProps {
  circleId: string
}

export function MembersPanel({ circleId }: MembersPanelProps) {
  const { data: members } = useSWR<Member[]>(
    `/api/circles/${circleId}/members`,
    fetcher
  )

  if (!members || members.length === 0) return null

  return (
    <div className="mb-4 rounded-2xl border border-border-dim bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted">
          Members ({members.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-2 rounded-lg bg-bg-elevated px-2.5 py-1.5"
          >
            {m.avatarUrl || m.image ? (
              <img
                src={m.avatarUrl || m.image || ""}
                alt={m.name ?? ""}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-green/10 text-[10px] font-bold text-accent-green">
                {(m.name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <span className="text-xs text-text-secondary">
              {m.name ?? m.email ?? "Anonymous"}
            </span>
            {m.role === "owner" && (
              <span className="text-[9px] text-text-dim">owner</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
