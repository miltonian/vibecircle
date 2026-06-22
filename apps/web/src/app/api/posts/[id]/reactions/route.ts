import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { toggleReaction, getReactions, getPostCircleId, isCircleMember } from "@/lib/db/queries"

/** POST /api/posts/[id]/reactions — toggle a reaction on a post */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: postId } = await params

  // Only members of the post's circle may react.
  const circleId = await getPostCircleId(postId)
  if (!circleId) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }
  if (!(await isCircleMember(circleId, session.user.id))) {
    return NextResponse.json(
      { error: "You are not a member of this circle" },
      { status: 403 }
    )
  }

  const body = await request.json()

  if (!body.emoji || typeof body.emoji !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid emoji" },
      { status: 400 }
    )
  }

  const result = await toggleReaction(postId, session.user.id, body.emoji)

  // Return updated reaction counts for the post
  const reactions = await getReactions(postId)

  return NextResponse.json({ ...result, reactions })
}
