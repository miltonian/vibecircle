import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getComments,
  addComment,
  getPostCircleId,
  isCircleMember,
} from "@/lib/db/queries"

/**
 * Authorize the session user against the circle that owns `postId`.
 * Returns the userId on success, or a NextResponse (401/403/404) to return.
 */
async function authorizePostAccess(postId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const circleId = await getPostCircleId(postId)
  if (!circleId) {
    return { error: NextResponse.json({ error: "Post not found" }, { status: 404 }) }
  }
  if (!(await isCircleMember(circleId, session.user.id))) {
    return { error: NextResponse.json({ error: "You are not a member of this circle" }, { status: 403 }) }
  }
  return { userId: session.user.id }
}

/** GET /api/posts/[id]/comments — list comments for a post */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const access = await authorizePostAccess(postId)
  if (access.error) return access.error

  const comments = await getComments(postId)
  return NextResponse.json({ comments })
}

/** POST /api/posts/[id]/comments — add a comment to a post */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const access = await authorizePostAccess(postId)
  if (access.error) return access.error

  const body = await request.json()

  if (!body.body || typeof body.body !== "string" || body.body.trim() === "") {
    return NextResponse.json(
      { error: "Comment body is required" },
      { status: 400 }
    )
  }

  const comment = await addComment(postId, access.userId, body.body.trim())

  return NextResponse.json(comment, { status: 201 })
}
