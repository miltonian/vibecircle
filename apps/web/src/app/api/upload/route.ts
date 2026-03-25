import { NextResponse } from "next/server"
import { getAuthUserId } from "@/lib/api-auth"
import { put } from "@vercel/blob"

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

/** POST /api/upload — upload media to Vercel Blob */
export async function POST(request: Request) {
  const userId = await getAuthUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const contentType = file.type

  // Validate content type
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return NextResponse.json(
      { error: "Only image and video files are accepted" },
      { status: 400 }
    )
  }

  // Validate file size
  const isVideo = contentType.startsWith("video/")
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  const maxLabel = isVideo ? "100MB" : "10MB"

  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum size for ${isVideo ? "video" : "image"} is ${maxLabel}` },
      { status: 400 }
    )
  }

  try {
    const blob = await put(file.name, file, {
      access: "public",
      contentType,
    })

    return NextResponse.json({
      url: blob.url,
      type: isVideo ? "video" : "image",
      size: file.size,
    })
  } catch (error) {
    console.error("[api/upload] Failed to upload file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
