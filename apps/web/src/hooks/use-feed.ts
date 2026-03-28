import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface PostMedia {
  type: "image" | "video"
  url: string
  caption?: string
}

export interface PostMetadata {
  repo_url?: string
  deploy_url?: string
  commits_count?: number
  files_changed?: number
  tech_tags?: string[]
  ticket?: {
    source: string
    id: string
    title: string
    url: string
    status: string
  }
  epicProgress?: {
    total: number
    done: number
    inProgress: number
  }
}

export interface PostAuthor {
  id: string
  name: string | null
  avatarUrl: string | null
}

export interface FeedPost {
  id: string
  type: "shipped" | "wip" | "video" | "live" | "ambient"
  body: string | null
  headline: string | null
  arcId: string | null
  arcTitle: string | null
  arcStatus: string | null
  arcEpicRef: { source: string; id: string; url: string } | null
  arcSequence: number | null
  arcTotalPosts: number | null
  media: PostMedia[] | null
  metadata: PostMetadata | null
  createdAt: string
  author: PostAuthor
  reactionCounts: Record<string, number>
  commentCount: number
}

interface FeedResponse {
  posts: FeedPost[]
  nextCursor: string | null
}

export function useFeed(circleId: string) {
  return useSWR<FeedResponse>(
    circleId ? `/api/circles/${circleId}/feed` : null,
    fetcher,
    {
      refreshInterval: 4000,
    }
  )
}
