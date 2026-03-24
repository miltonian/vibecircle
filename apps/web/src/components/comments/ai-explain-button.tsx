"use client"

interface AiExplainButtonProps {
  postId: string
  hasRepoUrl: boolean
}

export function AiExplainButton({ postId, hasRepoUrl }: AiExplainButtonProps) {
  if (!hasRepoUrl) return null

  return (
    <button
      onClick={() => {
        // Placeholder for Task 10 — AI Explain Feature
      }}
      className="group flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-gradient-to-r from-accent-purple/5 to-accent-cyan/5 px-3 py-2 text-xs transition-all hover:border-accent-purple/30 hover:from-accent-purple/10 hover:to-accent-cyan/10"
    >
      <span className="text-sm text-accent-amber">&#10024;</span>
      <span className="bg-gradient-to-r from-accent-purple to-accent-cyan bg-clip-text text-transparent">
        Explain how this was built
      </span>
      <span className="text-text-muted">
        &middot; AI reads the code &amp; commits
      </span>
    </button>
  )
}
