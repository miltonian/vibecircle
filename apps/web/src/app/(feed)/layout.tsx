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

      {/* Sticky top bar with presence */}
      <TopBarWrapper />

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
