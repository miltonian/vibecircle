import useSWRMutation from "swr/mutation"

export interface ReactionGroup {
  emoji: string
  count: number
  userIds: string[]
}

interface ToggleResult {
  added: boolean
  reactions: ReactionGroup[]
}

async function toggleReactionFetcher(
  url: string,
  { arg }: { arg: { emoji: string } }
): Promise<ToggleResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  })
  if (!res.ok) throw new Error("Failed to toggle reaction")
  return res.json()
}

/**
 * Custom hook for optimistic reaction toggling.
 * Wraps useSWR for reading + useSWRMutation for optimistic writes.
 */
export function useReactions(postId: string, userId: string | undefined) {
  const key = `/api/posts/${postId}/reactions`

  // We don't have a dedicated GET for reactions (they come from the feed),
  // so we manage local state through the mutation cache key.
  // The parent (feed) provides initial data; this hook handles toggling.

  const { trigger, isMutating } = useSWRMutation(
    key,
    toggleReactionFetcher
  )

  /**
   * Optimistically toggle a reaction. Accepts current state + a mutate
   * callback from the parent SWR cache to enable optimistic updates.
   */
  async function toggle(
    emoji: string,
    currentReactions: ReactionGroup[],
    onOptimisticUpdate: (updated: ReactionGroup[]) => void,
    onRevert: () => void
  ) {
    if (!userId) return

    // Compute optimistic next state
    const existing = currentReactions.find((r) => r.emoji === emoji)
    const userHasReacted = existing?.userIds.includes(userId) ?? false

    let optimistic: ReactionGroup[]
    if (userHasReacted && existing) {
      // Remove user's reaction
      const newUserIds = existing.userIds.filter((id) => id !== userId)
      if (newUserIds.length === 0) {
        optimistic = currentReactions.filter((r) => r.emoji !== emoji)
      } else {
        optimistic = currentReactions.map((r) =>
          r.emoji === emoji
            ? { ...r, count: newUserIds.length, userIds: newUserIds }
            : r
        )
      }
    } else {
      // Add user's reaction
      if (existing) {
        optimistic = currentReactions.map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
            : r
        )
      } else {
        optimistic = [
          ...currentReactions,
          { emoji, count: 1, userIds: [userId] },
        ]
      }
    }

    // Apply optimistic update immediately
    onOptimisticUpdate(optimistic)

    try {
      const result = await trigger({ emoji })
      // Apply server-confirmed state
      if (result?.reactions) {
        onOptimisticUpdate(result.reactions)
      }
    } catch {
      // Revert on error
      onRevert()
    }
  }

  return { toggle, isMutating }
}
