interface CommentRowProps {
  author: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
  body: string
  isAi?: boolean | null
}

export function CommentRow({ author, body, isAi }: CommentRowProps) {
  const initial = author.name?.[0]?.toUpperCase() ?? "?"

  return (
    <div className="flex items-start gap-2 py-1">
      {/* Avatar */}
      {author.avatarUrl ? (
        <img
          src={author.avatarUrl}
          alt={author.name ?? "User"}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-semibold text-text-muted">
          {initial}
        </div>
      )}

      {/* Content */}
      <p className="min-w-0 text-[12.5px] leading-snug">
        <span className="font-display text-xs font-semibold text-text-primary">
          {author.name ?? "Anonymous"}
        </span>
        {isAi && (
          <span className="ml-1 inline-flex items-center text-[10px] text-accent-amber">
            <span className="mr-0.5">&#10024;</span>
            AI
          </span>
        )}
        <span className={`ml-1.5 ${isAi ? "text-accent-cyan/70" : "text-text-secondary"}`}>
          {body}
        </span>
      </p>
    </div>
  )
}
