"use client"

import type { PostMetadata } from "@/hooks/use-feed"

interface CommitBarProps {
  metadata: PostMetadata | null
}

export function CommitBar({ metadata }: CommitBarProps) {
  if (!metadata) return null

  const { commits_count, files_changed, repo_url, deploy_url } = metadata

  // Only show if there's something meaningful to display
  if (!commits_count && !files_changed && !repo_url && !deploy_url) return null

  return (
    <div className="mt-3 flex items-center gap-3 overflow-x-auto rounded-xl border border-border-dim bg-bg-base/60 px-3 py-2 scrollbar-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {files_changed != null && (
        <span className="shrink-0 font-code text-xs">
          <span className="text-accent-green">+{files_changed}</span>
          <span className="text-text-muted"> files</span>
        </span>
      )}

      {repo_url && (
        <a
          href={repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 truncate font-code text-xs text-accent-cyan transition-colors hover:text-accent-cyan/80"
        >
          {extractRepoPath(repo_url)}
        </a>
      )}

      {commits_count != null && (
        <span className="shrink-0 font-code text-xs">
          <span className="text-accent-green">{commits_count}</span>
          <span className="text-text-muted"> commits</span>
        </span>
      )}

      {deploy_url && (
        <a
          href={deploy_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 flex items-center gap-1 rounded-md bg-accent-green/10 px-2 py-0.5 font-code text-[10px] font-medium text-accent-green transition-colors hover:bg-accent-green/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          Live
        </a>
      )}
    </div>
  )
}

function extractRepoPath(url: string): string {
  try {
    const parsed = new URL(url)
    // e.g., "/user/repo" -> "user/repo"
    return parsed.pathname.replace(/^\//, "").replace(/\.git$/, "")
  } catch {
    return url
  }
}
