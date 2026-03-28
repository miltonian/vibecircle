"use client"

import { useState } from "react"
import { FeedView } from "./feed-view"
import { FeedSidebar } from "./feed-sidebar"

interface FeedWithSidebarProps {
  circleId: string
  userId: string
  hasToken: boolean
}

export function FeedWithSidebar({ circleId, userId, hasToken }: FeedWithSidebarProps) {
  const [selectedArc, setSelectedArc] = useState<string | null>(null)

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <FeedView circleId={circleId} userId={userId} hasToken={hasToken} selectedArc={selectedArc} onArcSelect={setSelectedArc} />
      </div>
      <FeedSidebar circleId={circleId} selectedArc={selectedArc} onArcSelect={setSelectedArc} />
    </div>
  )
}
