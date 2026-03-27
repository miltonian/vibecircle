import { TopBarWrapper } from "@/components/presence/top-bar-wrapper"

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Ambient glow blobs */}
      <div className="ambient-glow ambient-glow--green" />
      <div className="ambient-glow ambient-glow--cyan" />
      <div className="ambient-glow ambient-glow--purple" />

      {/* Sticky top bar with presence */}
      <TopBarWrapper />

      {/* Main content — 960px centered for feed readability */}
      <main className="relative z-10 mx-auto px-4 py-8" style={{ maxWidth: 960 }}>
        {children}
      </main>
    </div>
  )
}
