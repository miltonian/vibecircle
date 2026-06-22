import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users, posts } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { explainProject } from "@/lib/ai"
import { addComment, isCircleMember } from "@/lib/db/queries"

/** POST /api/posts/[id]/explain — AI-analyze the post's repo and stream the explanation */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: postId } = await params

  // Fetch the post and authorize FIRST (before revealing anything about API keys).
  const [post] = await db
    .select({
      id: posts.id,
      circleId: posts.circleId,
      metadata: posts.metadata,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Only members of the post's circle may run AI Explain on it.
  if (!(await isCircleMember(post.circleId, session.user.id))) {
    return NextResponse.json(
      { error: "You are not a member of this circle" },
      { status: 403 }
    )
  }

  // Get the caller's API key (AI Explain uses the caller's own key).
  const [user] = await db
    .select({
      apiKey: users.apiKey,
      apiKeyProvider: users.apiKeyProvider,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user?.apiKey || !user?.apiKeyProvider) {
    return NextResponse.json(
      {
        error: "no_api_key",
        message: "Add an API key in settings to use AI Explain",
      },
      { status: 400 }
    )
  }

  const metadata = post.metadata as Record<string, unknown> | null
  const repoUrl = metadata?.repo_url as string | undefined

  if (!repoUrl) {
    return NextResponse.json(
      { error: "no_repo_url", message: "This post has no linked repository" },
      { status: 400 }
    )
  }

  try {
    const result = await explainProject(
      repoUrl,
      user.apiKey,
      user.apiKeyProvider as "openai" | "anthropic"
    )

    // Create a TransformStream to capture the full text while streaming
    const encoder = new TextEncoder()
    let fullText = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const textPart of result.textStream) {
            fullText += textPart
            controller.enqueue(encoder.encode(textPart))
          }
          controller.close()

          // After streaming completes, save the full text as an AI comment
          if (fullText.trim()) {
            await addComment(postId, session.user!.id as string, fullText.trim(), true)
          }
        } catch (err) {
          console.error("[api/posts/explain] streaming error", {
            error: String(err),
          })
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (err) {
    console.error("[api/posts/explain] failed", {
      error: String(err),
      stack: (err as Error).stack,
    })
    return NextResponse.json(
      { error: "ai_error", message: (err as Error).message },
      { status: 500 }
    )
  }
}
