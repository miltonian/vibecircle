import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserCircles } from "@/lib/db/queries"
import { PluginSetup } from "./plugin-setup"

export const metadata = {
  title: "Plugin Setup — vibecircle",
  description: "Connect your Claude Code plugin to vibecircle.",
}

export default async function PluginSetupPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/setup/plugin")
  }

  const circles = await getUserCircles(session.user.id)

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      {/* Ambient glow blobs */}
      <div className="ambient-glow ambient-glow--green" />
      <div className="ambient-glow ambient-glow--cyan" />
      <div className="ambient-glow ambient-glow--purple" />

      <PluginSetup
        circles={circles.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  )
}
