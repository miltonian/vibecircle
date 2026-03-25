"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewCirclePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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
      router.push(`/${circle.id}/setup`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (circleId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-text-muted">Redirecting to setup...</div>
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
            <p className="text-sm text-destructive">{error}</p>
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
