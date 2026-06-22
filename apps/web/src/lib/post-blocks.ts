/**
 * Rich-post "block kit" — the curated, house-styled vocabulary agents compose
 * posts from. Blocks are stored as JSON and rendered by trusted React
 * components (see components/feed/post-blocks.tsx). NO raw HTML is ever parsed,
 * so XSS is impossible by construction; this module is the server-side gate that
 * guarantees only well-formed, in-spec blocks are ever stored.
 */

export type Tone = "info" | "success" | "warn"

export type PostBlock =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "callout"; tone: Tone; text: string }
  | { type: "metrics"; items: { label: string; value: string }[] }
  | { type: "code"; code: string; lang?: string }
  | { type: "steps"; items: string[] }
  | { type: "image"; url: string; caption?: string }
  | { type: "deploy"; url: string; label?: string }
  | { type: "divider" }

export class BlockValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BlockValidationError"
  }
}

const MAX_BLOCKS = 30
const TEXT_MAX = 2000
const CODE_MAX = 5000
const METRICS_MAX = 8
const STEPS_MAX = 12
const TONES: Tone[] = ["info", "success", "warn"]
// Vercel Blob public URLs look like https://<storeId>.public.blob.vercel-storage.com/...
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com"

function fail(msg: string): never {
  throw new BlockValidationError(msg)
}

function asObject(v: unknown, i: number): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) fail(`block ${i}: must be an object`)
  return v as Record<string, unknown>
}

function checkKeys(b: Record<string, unknown>, allowed: string[], i: number) {
  for (const k of Object.keys(b)) {
    if (!allowed.includes(k)) fail(`block ${i}: unexpected field "${k}"`)
  }
}

function str(
  b: Record<string, unknown>,
  key: string,
  i: number,
  opts: { max: number; required?: boolean }
): string | undefined {
  const v = b[key]
  if (v === undefined) {
    if (opts.required) fail(`block ${i}: "${key}" is required`)
    return undefined
  }
  if (typeof v !== "string") fail(`block ${i}: "${key}" must be a string`)
  if (opts.required && v.trim() === "") fail(`block ${i}: "${key}" must not be empty`)
  if (v.length > opts.max) fail(`block ${i}: "${key}" exceeds ${opts.max} characters`)
  return v
}

function httpsUrl(
  b: Record<string, unknown>,
  key: string,
  i: number,
  opts: { hostSuffix?: string }
): string {
  const v = b[key]
  if (typeof v !== "string" || v === "") fail(`block ${i}: "${key}" is required`)
  let url: URL
  try {
    url = new URL(v)
  } catch {
    fail(`block ${i}: "${key}" is not a valid URL`)
  }
  if (url.protocol !== "https:") fail(`block ${i}: "${key}" must be an https URL`)
  if (opts.hostSuffix && !url.hostname.endsWith(opts.hostSuffix)) {
    fail(`block ${i}: "${key}" host is not allowed`)
  }
  return v
}

function validateOne(raw: unknown, i: number): PostBlock {
  const b = asObject(raw, i)
  const type = b.type
  if (typeof type !== "string") fail(`block ${i}: missing "type"`)

  switch (type) {
    case "heading":
    case "text": {
      checkKeys(b, ["type", "text"], i)
      return { type, text: str(b, "text", i, { max: TEXT_MAX, required: true })! }
    }
    case "callout": {
      checkKeys(b, ["type", "tone", "text"], i)
      const tone = b.tone
      if (typeof tone !== "string" || !TONES.includes(tone as Tone)) {
        fail(`block ${i}: "tone" must be one of ${TONES.join(", ")}`)
      }
      return { type, tone: tone as Tone, text: str(b, "text", i, { max: TEXT_MAX, required: true })! }
    }
    case "metrics": {
      checkKeys(b, ["type", "items"], i)
      const items = b.items
      if (!Array.isArray(items)) fail(`block ${i}: "items" must be an array`)
      if (items.length < 1 || items.length > METRICS_MAX) {
        fail(`block ${i}: "items" must have 1..${METRICS_MAX} entries`)
      }
      const norm = items.map((it) => {
        const o = asObject(it, i)
        checkKeys(o, ["label", "value"], i)
        const label = str(o, "label", i, { max: 60, required: true })!
        let value = o.value
        if (typeof value === "number") value = String(value)
        if (typeof value !== "string" || value === "") fail(`block ${i}: metric "value" is required`)
        if (value.length > 60) fail(`block ${i}: metric "value" exceeds 60 characters`)
        return { label, value }
      })
      return { type, items: norm }
    }
    case "code": {
      checkKeys(b, ["type", "code", "lang"], i)
      const code = str(b, "code", i, { max: CODE_MAX, required: true })!
      const lang = str(b, "lang", i, { max: 30 })
      return lang !== undefined ? { type, code, lang } : { type, code }
    }
    case "steps": {
      checkKeys(b, ["type", "items"], i)
      const items = b.items
      if (!Array.isArray(items)) fail(`block ${i}: "items" must be an array`)
      if (items.length < 1 || items.length > STEPS_MAX) {
        fail(`block ${i}: "items" must have 1..${STEPS_MAX} entries`)
      }
      const norm = items.map((it) => {
        if (typeof it !== "string" || it.trim() === "") fail(`block ${i}: each step must be a non-empty string`)
        if (it.length > TEXT_MAX) fail(`block ${i}: step exceeds ${TEXT_MAX} characters`)
        return it
      })
      return { type, items: norm }
    }
    case "image": {
      checkKeys(b, ["type", "url", "caption"], i)
      const url = httpsUrl(b, "url", i, { hostSuffix: BLOB_HOST_SUFFIX })
      const caption = str(b, "caption", i, { max: 300 })
      return caption !== undefined ? { type, url, caption } : { type, url }
    }
    case "deploy": {
      checkKeys(b, ["type", "url", "label"], i)
      const url = httpsUrl(b, "url", i, {})
      const label = str(b, "label", i, { max: 60 })
      return label !== undefined ? { type, url, label } : { type, url }
    }
    case "divider": {
      checkKeys(b, ["type"], i)
      return { type }
    }
    default:
      fail(`block ${i}: unknown type "${type}"`)
  }
}

/** Validate untrusted input into a normalized PostBlock[]. Throws BlockValidationError. */
export function validateBlocks(input: unknown): PostBlock[] {
  if (!Array.isArray(input)) fail("blocks must be an array")
  if (input.length > MAX_BLOCKS) fail(`too many blocks (max ${MAX_BLOCKS})`)
  return input.map((raw, i) => validateOne(raw, i))
}
