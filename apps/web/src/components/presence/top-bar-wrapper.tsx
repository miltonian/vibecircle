"use client"

import { useParams } from "next/navigation"
import { TopBar } from "./top-bar"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Client wrapper that reads circleId from the URL params
 * and fetches circle info for the TopBar.
 */
export function TopBarWrapper() {
  const params = useParams<{ circleId?: string }>()
  const circleId = params?.circleId ?? null

  // Fetch circle name when we have a circleId
  const { data: circles } = useSWR<
    { id: string; name: string; inviteCode: string }[]
  >("/api/circles", fetcher)

  const circle = circles?.find((c) => c.id === circleId)

  return (
    <TopBar
      circleName={circle?.name ?? null}
      circleId={circleId}
      inviteCode={circle?.inviteCode ?? null}
    />
  )
}
