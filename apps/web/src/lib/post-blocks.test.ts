import { describe, it, expect } from "vitest"
import { validateBlocks, BlockValidationError } from "./post-blocks"

const ok = (blocks: unknown) => validateBlocks(blocks)
const bad = (blocks: unknown) => () => validateBlocks(blocks)

describe("validateBlocks", () => {
  it("accepts a full, valid kit and returns normalized blocks", () => {
    const input = [
      { type: "heading", text: "Shipped dark mode" },
      { type: "text", text: "Reworked the **theming** layer." },
      { type: "callout", tone: "success", text: "Live in prod 🎉" },
      { type: "metrics", items: [{ label: "files", value: "12" }, { label: "commits", value: "5" }] },
      { type: "code", lang: "ts", code: "const a = 1" },
      { type: "steps", items: ["Add tokens", "Swap colors", "Ship"] },
      { type: "image", url: "https://abc123.public.blob.vercel-storage.com/s.png", caption: "screenshot" },
      { type: "deploy", url: "https://example.com", label: "Try it" },
      { type: "divider" },
    ]
    const out = ok(input)
    expect(out).toHaveLength(input.length)
    expect(out[0]).toEqual({ type: "heading", text: "Shipped dark mode" })
  })

  it("rejects non-array input", () => {
    expect(bad({ type: "heading", text: "x" })).toThrow(BlockValidationError)
    expect(bad(null)).toThrow(BlockValidationError)
  })

  it("rejects too many blocks (>30)", () => {
    const many = Array.from({ length: 31 }, () => ({ type: "divider" }))
    expect(bad(many)).toThrow(BlockValidationError)
  })

  it("rejects an unknown block type", () => {
    expect(bad([{ type: "script", text: "x" }])).toThrow(BlockValidationError)
  })

  it("rejects unexpected fields on a block", () => {
    expect(bad([{ type: "heading", text: "x", onClick: "alert(1)" }])).toThrow(BlockValidationError)
  })

  it("rejects a bad callout tone", () => {
    expect(bad([{ type: "callout", tone: "danger", text: "x" }])).toThrow(BlockValidationError)
  })

  it("rejects oversized text", () => {
    expect(bad([{ type: "text", text: "a".repeat(2001) }])).toThrow(BlockValidationError)
  })

  it("rejects missing required fields", () => {
    expect(bad([{ type: "callout", text: "no tone" }])).toThrow(BlockValidationError)
    expect(bad([{ type: "heading" }])).toThrow(BlockValidationError)
  })

  it("rejects non-https and non-allowlisted image urls", () => {
    expect(bad([{ type: "image", url: "http://abc.public.blob.vercel-storage.com/x.png" }])).toThrow(BlockValidationError)
    expect(bad([{ type: "image", url: "https://evil.com/x.png" }])).toThrow(BlockValidationError)
    expect(bad([{ type: "image", url: "https://evil.com/.public.blob.vercel-storage.com" }])).toThrow(BlockValidationError)
  })

  it("rejects non-https deploy urls but allows https", () => {
    expect(bad([{ type: "deploy", url: "javascript:alert(1)" }])).toThrow(BlockValidationError)
    expect(ok([{ type: "deploy", url: "https://app.example.com" }])).toHaveLength(1)
  })

  it("rejects too many metrics items (>8)", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ label: `l${i}`, value: `${i}` }))
    expect(bad([{ type: "metrics", items }])).toThrow(BlockValidationError)
  })
})
