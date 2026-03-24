import { auth } from "@/lib/auth"
import { getCircleById } from "@/lib/db/queries"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FeedView } from "@/components/feed/feed-view"

export default async function CircleFeedPage({
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Circle not found
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            This circle doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/new-circle"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Create a circle
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Feed */}
      <FeedView circleId={circleId} userId={session.user.id} />
    </div>
  )
}
