import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getComments, addComment } from "@/lib/db/queries"

/** GET /api/posts/[id]/comments — list comments for a post */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: postId } = await params
  const comments = await getComments(postId)

  return NextResponse.json({ comments })
}

/** POST /api/posts/[id]/comments — add a comment to a post */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: postId } = await params
  const body = await request.json()

  if (!body.body || typeof body.body !== "string" || body.body.trim() === "") {
    return NextResponse.json(
      { error: "Comment body is required" },
      { status: 400 }
    )
  }

  const comment = await addComment(
    postId,
    session.user.id,
    body.body.trim()
  )

  return NextResponse.json(comment, { status: 201 })
}
