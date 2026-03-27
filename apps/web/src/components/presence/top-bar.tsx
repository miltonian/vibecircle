"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePresence } from "@/hooks/use-presence"
import { AvatarRing } from "./avatar-ring"
import { ActivityTicker } from "./activity-ticker"

interface Circle {
  id: string
  name: string
  inviteCode: string
}

interface TopBarProps {
  circleName: string | null
  circleId: string | null
  inviteCode: string | null
  circles: Circle[]
}

export function TopBar({ circleName, circleId, inviteCode, circles }: TopBarProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [showSwitcher, setShowSwitcher] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const { data } = usePresence(circleId)

  const inviteUrl = inviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://vibecircle.dev"}/invite/${inviteCode}`
    : null

  const copyInvite = useCallback(() => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [inviteUrl])

  // Close switcher on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const members = data?.members ?? []
  const activity = data?.activity ?? []

  const statusOrder: Record<string, number> = { building: 0, online: 1, away: 2 }
  const sortedMembers = [...members].sort(
    (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
  )

  const activeMembers = sortedMembers.filter(
    (m) => m.status === "building" || m.status === "online"
  )
  const buildingCount = members.filter((m) => m.status === "building").length

  const otherCircles = circles.filter((c) => c.id !== circleId)

  return (
    <>
      <header className="glass sticky top-0 z-50 border-b border-[rgba(255,255,255,0.04)]">
        <div className="mx-auto flex h-14 items-center justify-between px-4" style={{ maxWidth: 960 }}>
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-heading text-xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
                vibecircle
              </span>
            </span>
          </Link>

          {/* Center: Presence cluster */}
          <div className="flex items-center gap-1">
            {activeMembers.length > 0 && (
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {activeMembers.slice(0, 6).map((member) => (
                    <AvatarRing
                      key={member.userId}
                      name={member.name ?? "?"}
                      status={member.status}
                    />
                  ))}
                </div>
                {buildingCount > 0 && (
                  <span className="ml-2 text-xs font-medium text-accent-green">
                    {buildingCount} building
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Circle switcher + invite + new circle */}
          <div className="flex items-center gap-2">
            {/* Circle name as dropdown trigger */}
            {circleName && (
              <div className="relative" ref={switcherRef}>
                <button
                  onClick={() => setShowSwitcher(!showSwitcher)}
                  className="flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-green/30 hover:text-text-primary"
                >
                  {circleName}
                  {circles.length > 1 && (
                    <svg className="h-3 w-3 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {showSwitcher && circles.length > 1 && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border-subtle bg-bg-card py-1.5 shadow-lg">
                    {circles.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setShowSwitcher(false)
                          router.push(`/${c.id}`)
                        }}
                        className={`flex w-full items-center px-3 py-2 text-left text-xs transition-colors ${
                          c.id === circleId
                            ? "font-semibold text-accent-green"
                            : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                        }`}
                      >
                        {c.name}
                        {c.id === circleId && (
                          <span className="ml-auto text-[10px] text-text-dim">current</span>
                        )}
                      </button>
                    ))}
                    <div className="mx-2 my-1 border-t border-border-dim" />
                    <Link
                      href="/new-circle"
                      onClick={() => setShowSwitcher(false)}
                      className="flex w-full items-center px-3 py-2 text-left text-xs text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      + New circle
                    </Link>
                  </div>
                )}
              </div>
            )}

            {inviteUrl && (
              <button
                onClick={copyInvite}
                className="rounded-full border border-accent-green/25 bg-accent-green/5 px-3 py-1 text-xs font-medium text-accent-green transition-colors hover:bg-accent-green/10"
              >
                {copied ? "Link copied!" : "Invite"}
              </button>
            )}

            {/* Only show + New circle if not in the dropdown */}
            {!circleName && (
              <Link
                href="/new-circle"
                className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-green/30 hover:text-text-primary"
              >
                + New circle
              </Link>
            )}
          </div>
        </div>
      </header>

      {activity.length > 0 && <ActivityTicker events={activity} />}
    </>
  )
}
