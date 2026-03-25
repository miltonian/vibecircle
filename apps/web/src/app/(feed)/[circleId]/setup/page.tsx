import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCircleById } from "@/lib/db/queries"
import { db } from "@/lib/db"
import { apiTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { PluginSetupFlow } from "@/components/onboarding/plugin-setup"

export default async function SetupPage({
  params,
}: {
  params: Promise<{ circleId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { circleId } = await params
  const circle = await getCircleById(circleId)

  if (!circle) {
    redirect("/new-circle")
  }

  // If user already has a token, skip to feed
  const [existingToken] = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.userId, session.user.id))
    .limit(1)

  if (existingToken) {
    redirect(`/${circleId}`)
  }

  return (
    <PluginSetupFlow
      circleId={circleId}
      inviteCode={circle.inviteCode}
    />
  )
}
