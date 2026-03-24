import Link from "next/link"

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

      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 border-b border-border-dim bg-bg-base/60 backdrop-blur-[24px]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-heading text-xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
                vibecircle
              </span>
            </span>
          </Link>

          {/* Right side — placeholder for circle badge, presence avatars later */}
          <div className="flex items-center gap-2">
            <Link
              href="/new-circle"
              className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-green/30 hover:text-text-primary"
            >
              + New circle
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
