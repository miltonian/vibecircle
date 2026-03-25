"use client"

interface PostBodyProps {
  headline: string | null
  body: string | null
}

export function PostBody({ headline, body }: PostBodyProps) {
  if (!headline && !body) return null

  return (
    <div className="mt-3">
      {headline && (
        <h3 className="font-display text-[17px] font-semibold leading-snug text-text-primary">
          {headline}
        </h3>
      )}
      {body && (
        <p className={`${headline ? "mt-1.5" : ""} text-[14px] leading-relaxed text-text-secondary`}>
          {body}
        </p>
      )}
    </div>
  )
}
