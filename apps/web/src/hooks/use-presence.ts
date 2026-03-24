import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface PresenceMember {
  userId: string
  name: string | null
  avatarUrl: string | null
  status: string
  activity: string | null
  updatedAt: string
}

export interface ActivityEvent {
  userName: string
  action: string
}

interface PresenceData {
  members: PresenceMember[]
  activity: ActivityEvent[]
}

export function usePresence(circleId: string | null) {
  return useSWR<PresenceData>(
    circleId ? `/api/circles/${circleId}/presence` : null,
    fetcher,
    { refreshInterval: 5000 }
  )
}
