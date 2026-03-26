"use client"

import ReactMarkdown from "react-markdown"

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
        <div className={`${headline ? "mt-1.5" : ""} prose-vibecircle text-[14px] leading-relaxed text-text-secondary`}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              code: ({ children }) => (
                <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-code text-[12px] text-accent-green">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="my-2 overflow-x-auto rounded-lg bg-bg-elevated p-3 font-code text-[12px] text-text-primary">
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-green underline decoration-accent-green/30 hover:decoration-accent-green/60"
                >
                  {children}
                </a>
              ),
              h1: ({ children }) => <p className="mb-1 font-semibold text-text-primary">{children}</p>,
              h2: ({ children }) => <p className="mb-1 font-semibold text-text-primary">{children}</p>,
              h3: ({ children }) => <p className="mb-1 font-semibold text-text-primary">{children}</p>,
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-2 border-accent-green/30 pl-3 italic text-text-muted">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-3 border-border-dim" />,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
