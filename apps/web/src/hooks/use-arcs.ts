import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface Arc {
  arcId: string
  arcTitle: string | null
  authorId: string
  authorName: string | null
  postCount: number
  latestAt: string | null
}

export function useArcs(circleId: string | null) {
  return useSWR<Arc[]>(
    circleId ? `/api/circles/${circleId}/arcs` : null,
    fetcher,
    { refreshInterval: 30000 }
  )
}
