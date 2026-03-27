import useSWR from "swr"
import type { PostMedia } from "./use-feed"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Timelapse fetch failed: ${r.status}`)
    return r.json()
  })

export interface TimelapseFrame {
  postId: string
  headline: string | null
  media: PostMedia[] | null
  type: string
  createdAt: string
  arcSequence: number
  author: { name: string | null; avatarUrl: string | null }
}

export interface TimelapseResponse {
  arcTitle: string
  frames: TimelapseFrame[]
}

export function useTimelapse(circleId: string | null, arcId: string | null) {
  return useSWR<TimelapseResponse>(
    circleId && arcId
      ? `/api/circles/${circleId}/arcs/${arcId}/timelapse`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )
}
