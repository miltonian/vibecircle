"use client"

interface PostBodyProps {
  body: string | null
}

export function PostBody({ body }: PostBodyProps) {
  if (!body) return null

  return (
    <div className="mt-3">
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-primary/90">
        {body}
      </p>
    </div>
  )
}
