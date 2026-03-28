import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface ArcContributor {
  id: string
  name: string | null
  avatarUrl: string | null
}

export interface Arc {
  id: string
  title: string
  status: "active" | "shipped"
  epicRef: { source: string; id: string; url: string } | null
  postCount: number
  latestAt: string | null
  shippedAt: string | null
  contributors: ArcContributor[]
  epicProgress: { total: number; done: number; inProgress: number } | null
}

export function useArcs(circleId: string | null) {
  return useSWR<Arc[]>(
    circleId ? `/api/circles/${circleId}/arcs` : null,
    fetcher,
    { refreshInterval: 30000 }
  )
}
