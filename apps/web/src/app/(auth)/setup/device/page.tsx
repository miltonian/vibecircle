import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCircles } from "@/lib/db/queries"
import { DeviceAuthorize } from "./device-authorize"

export const metadata = {
  title: "Authorize Plugin — vibecircle",
  description: "Authorize the vibecircle Claude Code plugin.",
}

export default async function DeviceAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  const session = await auth()

  if (!session?.user?.id) {
    const callbackUrl = `/setup/device${code ? `?code=${code}` : ""}`
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const circles = await getUserCircles(session.user.id)

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      {/* Ambient glow blobs */}
      <div className="ambient-glow ambient-glow--green" />
      <div className="ambient-glow ambient-glow--cyan" />
      <div className="ambient-glow ambient-glow--purple" />

      <DeviceAuthorize
        code={code ?? null}
        circles={circles.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  )
}
