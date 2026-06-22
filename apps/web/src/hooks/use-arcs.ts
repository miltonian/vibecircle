import useSWR from "swr"

// Throw on non-2xx so SWR surfaces an error and `data` stays undefined, instead
// of resolving to an error body (e.g. {error:"…"} for a deleted circle) that
// downstream `.filter`/`.map` calls would choke on.
const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Arcs fetch failed: ${r.status}`)
  const data = await r.json()
  return Array.isArray(data) ? data : []
}

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
