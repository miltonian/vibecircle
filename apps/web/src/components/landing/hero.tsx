"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

// Simulated friend activity for the floating cards
const FRIENDS = [
  { name: "Marcus", emoji: "🔥", status: "building", project: "Recipe AI", desc: "Snap ingredients, get recipes", type: "shipped", tech: "Next.js", timeAgo: "12m" },
  { name: "Priya", emoji: "🌊", status: "building", project: "Shader Lab", desc: "WebGL transitions that slap", type: "wip", tech: "Three.js", timeAgo: "38m" },
  { name: "Alex", emoji: "⚡", status: "online", project: "Drawspace", desc: "Multiplayer drawing — 2 friends in", type: "live", tech: "Canvas API", timeAgo: "1h" },
  { name: "Jordan", emoji: "💎", status: "online", project: "CLI Dashboard", desc: "All Vercel projects in one view", type: "wip", tech: "Ink", timeAgo: "3h" },
  { name: "Sam", emoji: "🌈", status: "away", project: "Mood Radio", desc: "AI picks music from your vibe", type: "shipped", tech: "Spotify API", timeAgo: "5h" },
]

const REACTIONS = ["🔥", "😍", "🚀", "💎", "🤯", "⚡"]

function FloatingCard({ friend, index, total }: { friend: typeof FRIENDS[0]; index: number; total: number }) {
  // Position cards in a loose organic scatter
  const positions = [
    { top: "8%", left: "58%", rotate: "2deg", scale: 1 },
    { top: "28%", left: "52%", rotate: "-1.5deg", scale: 0.92 },
    { top: "48%", left: "60%", rotate: "1deg", scale: 0.88 },
    { top: "16%", left: "78%", rotate: "-2deg", scale: 0.85 },
    { top: "55%", left: "74%", rotate: "2.5deg", scale: 0.82 },
  ]
  const pos = positions[index % positions.length]

  const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
    shipped: { bg: "rgba(160,68,58,0.12)", text: "#a0443a", border: "rgba(160,68,58,0.25)" },
    wip: { bg: "rgba(196,149,106,0.1)", text: "#c4956a", border: "rgba(196,149,106,0.2)" },
    live: { bg: "linear-gradient(135deg,#c4956a,#8b6f4e)", text: "#1a1816", border: "transparent" },
  }
  const badge = badgeColors[friend.type] || badgeColors.wip

  return (
    <div
      className="absolute hidden lg:block pointer-events-none select-none"
      style={{
        top: pos.top,
        left: pos.left,
        transform: `rotate(${pos.rotate}) scale(${pos.scale})`,
        animation: `float-card-${index} ${18 + index * 3}s ease-in-out infinite`,
        animationDelay: `${index * -3}s`,
        zIndex: total - index,
      }}
    >
      <div
        className="w-[300px] rounded-[18px] overflow-hidden border"
        style={{
          background: "rgba(34,31,27,0.85)",
          borderColor: friend.type === "live" ? "rgba(196,149,106,0.15)" : "rgba(255,240,220,0.06)",
          backdropFilter: "blur(20px)",
          boxShadow: friend.type === "live"
            ? "0 8px 40px rgba(196,149,106,0.06), 0 0 0 1px rgba(196,149,106,0.05)"
            : "0 8px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
            style={{
              background: friend.status === "building"
                ? "linear-gradient(135deg, #c4956a, #8b6f4e)"
                : "linear-gradient(135deg, #a0443a, #c4956a)",
              padding: "2px",
            }}
          >
            <div className="w-full h-full rounded-full bg-bg-card flex items-center justify-center">
              {friend.emoji}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text-primary" style={{ fontFamily: "var(--font-display-family)" }}>
              {friend.name}
            </div>
            <div className="text-[10px] text-text-dim">
              {friend.timeAgo} ago
            </div>
          </div>
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded"
            style={{
              background: friend.type === "live" ? badge.bg : badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
              ...(friend.type === "live" ? { background: badge.bg, WebkitBackgroundClip: undefined } : {}),
            }}
          >
            {friend.type}
          </span>
        </div>

        {/* Preview area */}
        <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,240,220,0.05)" }}>
          <div
            className="h-[120px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${
                friend.type === "shipped" ? "#1f1c19, #2a2622"
                : friend.type === "live" ? "#1f1c19, #2a2622"
                : "#1a1816, #221f1b"
              })`,
            }}
          >
            <div className="text-center">
              <div className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display-family)" }}>
                {friend.project}
              </div>
              <div className="text-[10px] text-text-secondary mt-1 px-4">{friend.desc}</div>
            </div>
          </div>
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          {REACTIONS.slice(0, 2 + (index % 2)).map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{
                background: "rgba(255,240,220,0.03)",
                border: "1px solid rgba(255,240,220,0.05)",
              }}
            >
              <span>{r}</span>
              <span className="text-[10px] text-text-dim">{Math.floor(Math.random() * 5) + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PresenceRow() {
  return (
    <div className="flex items-center gap-1">
      {FRIENDS.slice(0, 4).map((f, i) => (
        <div
          key={i}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
          style={{
            padding: "1.5px",
            background: f.status === "building"
              ? "linear-gradient(135deg, #c4956a, #8b6f4e)"
              : f.status === "online"
              ? "linear-gradient(135deg, #a0443a, #c4956a)"
              : "rgba(255,240,220,0.08)",
            marginLeft: i > 0 ? "-4px" : 0,
            animation: f.status === "building" ? "ring-breathe 3s ease-in-out infinite" : undefined,
            animationDelay: `${i * 0.5}s`,
          }}
        >
          <div className="w-full h-full rounded-full bg-bg-card flex items-center justify-center">
            {f.emoji}
          </div>
        </div>
      ))}
      <span className="text-[11px] text-text-dim ml-1.5 font-medium">
        <span className="text-accent-green">3</span> building
      </span>
    </div>
  )
}

export function LandingHero() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#1a1816" }}>
      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{ backgroundImage: "url(/noise.svg)", backgroundRepeat: "repeat" }}
      />

      {/* Ambient glow blobs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(196,149,106,0.06) 0%, transparent 70%)",
          top: "-200px",
          left: "-200px",
          filter: "blur(80px)",
          animation: "glow-drift 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139,111,78,0.04) 0%, transparent 70%)",
          top: "30%",
          right: "-150px",
          filter: "blur(100px)",
          animation: "glow-drift 30s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(160,68,58,0.04) 0%, transparent 70%)",
          bottom: "-100px",
          left: "20%",
          filter: "blur(90px)",
          animation: "glow-drift 22s ease-in-out infinite",
          animationDelay: "-8s",
        }}
      />

      {/* Floating post cards (right side, desktop only) */}
      {mounted && FRIENDS.map((f, i) => (
        <FloatingCard key={f.name} friend={f} index={i} total={FRIENDS.length} />
      ))}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-4">
            <span
              className="text-lg font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-display-family)",
                background: "linear-gradient(135deg, #c4956a, #8b6f4e)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              vibecircle
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:block">
              <PresenceRow />
            </div>
            <Link
              href="/login"
              className="text-[13px] font-medium px-5 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: "rgba(255,240,220,0.05)",
                border: "1px solid rgba(255,240,220,0.08)",
                color: "#9a8e7d",
              }}
            >
              Sign in
            </Link>
          </div>
        </nav>

        {/* Hero section */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 max-w-[640px] pb-20">
          {/* Eyebrow */}
          <div
            className={`flex items-center gap-2 mb-6 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "#c4956a",
                boxShadow: "0 0 8px rgba(196,149,106,0.4)",
                animation: "pulse-dot 2.5s ease-in-out infinite",
              }}
            />
            <span className="text-[13px] font-medium tracking-wide" style={{ color: "#7a6f60" }}>
              Your friends are building right now
            </span>
          </div>

          {/* Headline */}
          <h1
            className={`transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{
              fontFamily: "var(--font-display-family)",
              fontSize: "clamp(2.8rem, 6vw, 4.2rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#e8e0d4",
            }}
          >
            See what your
            <br />
            friends are{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c4956a 0%, #8b6f4e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              building.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className={`mt-5 max-w-[440px] transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{
              fontFamily: "var(--font-body-family)",
              fontSize: "1.1rem",
              lineHeight: 1.6,
              color: "#9a8e7d",
              fontWeight: 300,
            }}
          >
            A social feed for your vibe coding crew. Share what you&apos;re building, play with each other&apos;s apps, and feel the energy of friends creating together.
          </p>

          {/* CTA */}
          <div
            className={`flex items-center gap-4 mt-10 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <Link
              href="/login"
              className="group relative px-7 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #c4956a, #8b6f4e)",
                color: "#1a1816",
                boxShadow: "0 4px 24px rgba(196,149,106,0.2), 0 0 0 1px rgba(196,149,106,0.1)",
              }}
            >
              <span className="relative z-10">Start your circle</span>
            </Link>
            <span className="text-[13px]" style={{ color: "#4a4238" }}>
              Free &middot; Open source
            </span>
          </div>

          {/* Feature pills */}
          <div
            className={`flex flex-wrap gap-2.5 mt-12 transition-all duration-700 delay-[400ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            {[
              { icon: "📸", text: "Auto-capture screenshots" },
              { icon: "🎮", text: "Play with live apps" },
              { icon: "✨", text: "AI explains how it's built" },
              { icon: "👥", text: "See who's coding" },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px]"
                style={{
                  background: "rgba(255,240,220,0.02)",
                  border: "1px solid rgba(255,240,220,0.05)",
                  color: "#7a6f60",
                }}
              >
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Tech badge */}
          <div
            className={`mt-16 transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px]"
                style={{
                  fontFamily: "var(--font-mono-family)",
                  background: "rgba(196,149,106,0.04)",
                  border: "1px solid rgba(196,149,106,0.08)",
                  color: "#c4956a",
                }}
              >
                <span style={{ opacity: 0.5 }}>$</span> claude /share
              </div>
              <span className="text-[11px]" style={{ color: "#4a4238" }}>
                Share from Claude Code with one command
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="px-6 sm:px-10 py-4 flex items-center justify-between text-[11px]"
          style={{ borderTop: "1px solid rgba(255,240,220,0.04)", color: "#4a4238" }}
        >
          <span>Open source &middot; MIT License</span>
          <a
            href="https://github.com/miltonian/vibecircle"
            className="hover:text-text-secondary transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes glow-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes ring-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196, 149, 106, 0.2); }
          50% { box-shadow: 0 0 0 3px rgba(196, 149, 106, 0); }
        }
        @keyframes float-card-0 {
          0%, 100% { transform: rotate(2deg) scale(1) translateY(0); }
          50% { transform: rotate(2deg) scale(1) translateY(-12px); }
        }
        @keyframes float-card-1 {
          0%, 100% { transform: rotate(-1.5deg) scale(0.92) translateY(0); }
          50% { transform: rotate(-1.5deg) scale(0.92) translateY(10px); }
        }
        @keyframes float-card-2 {
          0%, 100% { transform: rotate(1deg) scale(0.88) translateY(0); }
          50% { transform: rotate(1deg) scale(0.88) translateY(-14px); }
        }
        @keyframes float-card-3 {
          0%, 100% { transform: rotate(-2deg) scale(0.85) translateY(0); }
          50% { transform: rotate(-2deg) scale(0.85) translateY(8px); }
        }
        @keyframes float-card-4 {
          0%, 100% { transform: rotate(2.5deg) scale(0.82) translateY(0); }
          50% { transform: rotate(2.5deg) scale(0.82) translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
