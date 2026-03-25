"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useHasToken } from "@/hooks/use-has-token"

interface PluginSetupFlowProps {
  circleId: string
  inviteCode: string
}

export function PluginSetupFlow({ circleId, inviteCode }: PluginSetupFlowProps) {
  const router = useRouter()
  const { data } = useHasToken(true) // poll every 3s
  const [step, setStep] = useState<2 | 3>(2)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (data?.hasToken && step === 2) {
      setStep(3)
    }
  }, [data?.hasToken, step])

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/invite/${inviteCode}`
    : `https://vibecircle.dev/invite/${inviteCode}`

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-green text-xs font-bold text-black">✓</div>
        <div className="h-0.5 w-10 bg-accent-green" />
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          step >= 2 ? "bg-accent-green text-black" : "border border-border-subtle bg-bg-elevated text-text-muted"
        }`}>{step > 2 ? "✓" : "2"}</div>
        <div className={`h-0.5 w-10 ${step > 2 ? "bg-accent-green" : "bg-border-subtle"}`} />
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          step >= 3 ? "bg-accent-green text-black" : "border border-border-subtle bg-bg-elevated text-text-muted"
        }`}>3</div>
      </div>
      <div className="mb-10 flex gap-12 text-[11px]">
        <span className="text-text-muted">Circle created</span>
        <span className={step === 2 ? "font-semibold text-text-primary" : "text-text-muted"}>Install plugin</span>
        <span className={step === 3 ? "font-semibold text-text-primary" : "text-text-muted"}>Invite team</span>
      </div>

      {step === 2 && (
        <div className="w-full max-w-lg text-center">
          <h2 className="font-display text-2xl font-semibold text-text-primary">Connect Claude Code</h2>
          <p className="mt-2 text-sm text-text-secondary">
            The plugin watches what you build and creates shareable updates for your team. Three commands and you&apos;re done.
          </p>

          <div className="mt-8 space-y-4 text-left">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-green">Step 1 — Install from marketplace</div>
              <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-card px-4 py-3">
                <code className="font-code text-[13px] text-text-primary">/plugin marketplace add miltonian/vibecircle</code>
                <button
                  onClick={() => copyToClipboard("/plugin marketplace add miltonian/vibecircle", "install")}
                  className="shrink-0 rounded-lg bg-accent-green px-3 py-1.5 text-[11px] font-bold text-black"
                >
                  {copied === "install" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-text-dim">Then run: <code className="font-code text-text-muted">/plugin install vibecircle</code></div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-green">Step 2 — Connect to your circle</div>
              <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-card px-4 py-3">
                <code className="font-code text-[13px] text-text-primary">/circle setup</code>
                <button
                  onClick={() => copyToClipboard("/circle setup", "setup")}
                  className="shrink-0 rounded-lg bg-accent-green px-3 py-1.5 text-[11px] font-bold text-black"
                >
                  {copied === "setup" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-text-dim">Opens a browser tab to authorize — takes 10 seconds.</div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-accent-green/15 bg-accent-green/5 px-5 py-2.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent-green" />
            <span className="text-xs text-text-muted">Waiting for plugin to connect...</span>
          </div>

          <button
            onClick={() => router.push(`/${circleId}?skipped=1`)}
            className="mt-6 text-xs text-text-dim hover:text-text-muted"
          >
            Skip for now — go to feed →
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="w-full max-w-lg text-center">
          <div className="mb-2 text-sm font-semibold text-accent-green">Plugin connected ✓</div>
          <h2 className="font-display text-2xl font-semibold text-text-primary">Invite your team</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Share this link — anyone with it can join your circle.
          </p>

          <div className="mt-6 flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-xl border border-border-subtle bg-bg-card px-4 py-3 font-code text-sm text-text-primary outline-none"
            />
            <button
              onClick={() => copyToClipboard(inviteUrl, "invite")}
              className="shrink-0 rounded-xl bg-accent-green px-4 py-3 text-sm font-bold text-black"
            >
              {copied === "invite" ? "Copied!" : "Copy"}
            </button>
          </div>

          <button
            onClick={() => router.push(`/${circleId}`)}
            className="mt-6 inline-block rounded-xl border border-accent-green/30 px-6 py-3 text-sm font-semibold text-accent-green transition-colors hover:bg-accent-green/5"
          >
            Go to your feed →
          </button>
        </div>
      )}
    </div>
  )
}
