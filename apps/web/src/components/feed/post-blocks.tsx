"use client"

import ReactMarkdown from "react-markdown"
import type { PostBlock, Tone } from "@/lib/post-blocks"

/**
 * Renders the curated rich-post "block kit". Every block maps to one trusted
 * component here — there is no raw HTML, and all text flows through React
 * children (auto-escaped) or react-markdown WITHOUT rehype-raw. See
 * lib/post-blocks.ts for the matching server-side validator.
 */

// Inline-only markdown for text/callout bodies (bold/italic/code/links), styled
// to match PostBody. No block-level chrome, no raw HTML.
const inline = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-code text-[12px] text-accent-green">
      {children}
    </code>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-green underline decoration-accent-green/30 hover:decoration-accent-green/60"
    >
      {children}
    </a>
  ),
}

function Inline({ text }: { text: string }) {
  return <ReactMarkdown components={inline}>{text}</ReactMarkdown>
}

const calloutStyles: Record<Tone, string> = {
  info: "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan",
  success: "border-accent-green/30 bg-accent-green/10 text-accent-green",
  warn: "border-accent-pink/30 bg-accent-pink/10 text-accent-pink",
}

function Block({ block }: { block: PostBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h4 className="font-display text-[15px] font-semibold leading-snug text-text-primary">
          {block.text}
        </h4>
      )
    case "text":
      return (
        <p className="text-text-secondary">
          <Inline text={block.text} />
        </p>
      )
    case "callout":
      return (
        <div className={`rounded-lg border px-3 py-2 text-[13px] ${calloutStyles[block.tone]}`}>
          <Inline text={block.text} />
        </div>
      )
    case "metrics":
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((m, j) => (
            <div
              key={j}
              className="flex items-baseline gap-1.5 rounded-lg border border-border-dim bg-bg-elevated/50 px-2.5 py-1"
            >
              <span className="font-code text-[13px] font-semibold text-text-primary">{m.value}</span>
              <span className="text-[11px] text-text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      )
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg bg-bg-elevated p-3 font-code text-[12px] text-text-primary">
          <code>{block.code}</code>
        </pre>
      )
    case "steps":
      return (
        <ol className="ml-4 list-decimal space-y-0.5 text-text-secondary">
          {block.items.map((s, j) => (
            <li key={j}>{s}</li>
          ))}
        </ol>
      )
    case "image":
      return (
        <figure className="overflow-hidden rounded-xl border border-border-dim">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.caption ?? ""} className="w-full object-cover" />
          {block.caption && (
            <figcaption className="px-3 py-1.5 text-[11px] text-text-muted">{block.caption}</figcaption>
          )}
        </figure>
      )
    case "deploy":
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-accent-green/10 px-3 py-1.5 text-[11px] font-semibold text-accent-green transition-colors hover:bg-accent-green/20"
        >
          {block.label ?? "Try it live"} ↗
        </a>
      )
    case "divider":
      return <hr className="border-border-dim" />
    default:
      return null
  }
}

export function PostBlocks({ blocks }: { blocks: PostBlock[] }) {
  return (
    <div className="space-y-3 text-[14px] leading-relaxed">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}
