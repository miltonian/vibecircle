import { auth } from "@/lib/auth"
import { getCircleById, getCircleMembers } from "@/lib/db/queries"
import { redirect } from "next/navigation"
import Link from "next/link"

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

  const members = await getCircleMembers(circleId)

  return (
    <div>
      {/* Circle header */}
      <div className="mb-8 rounded-[20px] border border-border-subtle bg-bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              {circle.name}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>

          {/* Member avatars */}
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member) => (
              <div
                key={member.userId}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-card bg-bg-elevated text-xs font-medium text-text-secondary"
                title={member.name || member.email}
              >
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.image}
                    alt={member.name || ""}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (member.name?.[0] || member.email[0]).toUpperCase()
                )}
              </div>
            ))}
            {members.length > 5 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-card bg-bg-elevated text-xs font-medium text-text-muted">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Invite code */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-dim bg-bg-base/50 px-3 py-2">
          <span className="text-xs text-text-muted">Invite link:</span>
          <code className="flex-1 truncate font-code text-xs text-text-secondary">
            /invite/{circle.inviteCode}
          </code>
        </div>
      </div>

      {/* Empty feed state */}
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
            <svg
              className="h-8 w-8 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            No posts yet
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Start building and share with{" "}
            <code className="rounded bg-bg-elevated px-1.5 py-0.5 font-code text-xs text-accent-green">
              /share
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
