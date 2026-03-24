"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await signIn("resend", {
        email,
        callbackUrl: "/",
      })
      setSent(true)
    } catch {
      // Auth.js handles the redirect, so we may not reach here
    } finally {
      setLoading(false)
    }
  }

  async function handleGitHub() {
    await signIn("github", { callbackUrl: "/" })
  }

  if (sent) {
    return (
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-green/10">
            <svg
              className="h-7 w-7 text-accent-green"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="font-heading text-xl font-bold text-text-primary">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            We sent a magic link to{" "}
            <span className="font-medium text-text-primary">{email}</span>
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-sm text-text-muted transition-colors hover:text-text-secondary"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 w-full max-w-sm">
      <div className="rounded-[20px] border border-border-subtle bg-bg-card p-8">
        {/* Logo */}
        <div className="mb-2 text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
              vibecircle
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            See what your friends are building.
          </p>
        </div>

        {/* GitHub sign in */}
        <button
          onClick={handleGitHub}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-4 py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>
      </div>
    </div>
  )
}
