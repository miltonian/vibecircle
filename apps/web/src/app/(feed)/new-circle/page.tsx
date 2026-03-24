"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewCirclePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [inviteUrl, setInviteUrl] = useState("")
  const [circleId, setCircleId] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create circle")
        return
      }

      const circle = await res.json()
      setCircleId(circle.id)

      // Build invite URL from the invite code
      const baseUrl = window.location.origin
      setInviteUrl(`${baseUrl}/invite/${circle.inviteCode}`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteUrl)
  }

  // After creation: show the invite link
  if (inviteUrl && circleId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-[20px] border border-border-subtle bg-bg-card p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/10">
            <svg
              className="h-6 w-6 text-accent-green"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Circle created!
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Share this invite link with your friends so they can join.
          </p>

          {/* Invite URL */}
          <div className="mt-6 flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5 text-sm text-text-primary outline-none"
            />
            <button
              onClick={handleCopyInvite}
              className="shrink-0 rounded-xl border border-border-subtle bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-surface"
            >
              Copy
            </button>
          </div>

          <button
            onClick={() => router.push(`/${circleId}`)}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Go to circle
          </button>
        </div>
      </div>
    )
  }

  // Create form
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-[20px] border border-border-subtle bg-bg-card p-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Create a circle
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          A circle is a private group for you and your friends to share what
          you&apos;re building.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="circle-name"
              className="block text-sm font-medium text-text-secondary"
            >
              Circle name
            </label>
            <input
              id="circle-name"
              type="text"
              required
              maxLength={50}
              placeholder="e.g. Weekend Hackers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent-green/40 focus:ring-1 focus:ring-accent-green/20"
            />
          </div>

          {error && (
            <p className="text-sm text-[#ff0066]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create circle"}
          </button>
        </form>
      </div>
    </div>
  )
}
