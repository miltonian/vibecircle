"use client"

import { useState, useRef, useCallback } from "react"

interface CreatePostDialogProps {
  circleId: string
  onPostCreated?: () => void
}

type PostType = "shipped" | "wip" | "video" | "live" | "ambient"
type UploadState = "idle" | "uploading" | "done" | "error"

interface UploadedFile {
  url: string
  type: "image" | "video"
  name: string
}

const postTypes: { value: PostType; label: string; emoji: string }[] = [
  { value: "shipped", label: "Shipped", emoji: "\u{1F680}" },
  { value: "wip", label: "WIP", emoji: "\u{1F6A7}" },
  { value: "video", label: "Video", emoji: "\u{1F3AC}" },
  { value: "live", label: "Live", emoji: "\u{1F7E2}" },
  { value: "ambient", label: "Update", emoji: "\u{1F4AC}" },
]

export function CreatePostDialog({
  circleId,
  onPostCreated,
}: CreatePostDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<PostType>("shipped")
  const [body, setBody] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [deployUrl, setDeployUrl] = useState("")
  const [commitsCount, setCommitsCount] = useState("")
  const [filesChanged, setFilesChanged] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setType("shipped")
    setBody("")
    setRepoUrl("")
    setDeployUrl("")
    setCommitsCount("")
    setFilesChanged("")
    setUploadedFiles([])
    setUploadState("idle")
    setError(null)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    resetForm()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadState("uploading")
    setError(null)

    const newUploads: UploadedFile[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Upload failed")
        }
        const data = await res.json()
        newUploads.push({ url: data.url, type: data.type, name: file.name })
      } catch (err) {
        setUploadState("error")
        setError(err instanceof Error ? err.message : "Upload failed")
        return
      }
    }

    setUploadedFiles((prev) => [...prev, ...newUploads])
    setUploadState("done")

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    // Build metadata
    const metadata: Record<string, unknown> = {}
    if (repoUrl) metadata.repo_url = repoUrl
    if (deployUrl) metadata.deploy_url = deployUrl
    if (commitsCount) metadata.commits_count = parseInt(commitsCount, 10) || 0
    if (filesChanged) metadata.files_changed = parseInt(filesChanged, 10) || 0

    // Build media array
    const media = uploadedFiles.map((f) => ({
      type: f.type,
      url: f.url,
    }))

    try {
      const res = await fetch(`/api/circles/${circleId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          body: body || null,
          media: media.length > 0 ? media : null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to create post")
      }

      handleClose()
      onPostCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsRepoUrl = type === "shipped" || type === "wip" || type === "ambient"
  const needsDeployUrl = type === "shipped" || type === "live"
  const needsCommitInfo = type === "shipped" || type === "ambient"

  return (
    <>
      {/* FAB - Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-[16px] bg-gradient-to-r from-accent-green to-accent-cyan text-black shadow-[0_4px_24px_rgba(0,255,136,0.3)] transition-all duration-200 hover:scale-105 hover:shadow-[0_8px_32px_rgba(0,255,136,0.4)] active:scale-95"
        aria-label="Create post"
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Dialog backdrop + modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            style={{ animation: "fade-in 0.15s ease-out" }}
          />

          {/* Dialog */}
          <div
            className="relative z-10 w-full max-w-lg rounded-[20px] border border-border-subtle bg-bg-card p-6 shadow-2xl"
            style={{ animation: "dialog-enter 0.2s ease-out" }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="font-display text-lg font-bold text-text-primary">
              Share what you&apos;re building
            </h2>

            {/* Post type selector */}
            <div className="mt-4 flex flex-wrap gap-2">
              {postTypes.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setType(pt.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    type === pt.value
                      ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                      : "border-border-dim bg-bg-elevated text-text-secondary hover:border-border-subtle"
                  }`}
                >
                  <span>{pt.emoji}</span>
                  <span>{pt.label}</span>
                </button>
              ))}
            </div>

            {/* Body text */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you build? What's the vibe?"
              rows={3}
              className="mt-4 w-full resize-none rounded-xl border border-border-dim bg-bg-base/50 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-green/30 focus:outline-none focus:ring-1 focus:ring-accent-green/20"
            />

            {/* Metadata fields */}
            <div className="mt-3 space-y-2">
              {needsRepoUrl && (
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="Repo URL (https://github.com/...)"
                  className="w-full rounded-xl border border-border-dim bg-bg-base/50 px-3 py-2 font-code text-xs text-text-primary placeholder:text-text-muted focus:border-accent-cyan/30 focus:outline-none focus:ring-1 focus:ring-accent-cyan/20"
                />
              )}
              {needsDeployUrl && (
                <input
                  type="url"
                  value={deployUrl}
                  onChange={(e) => setDeployUrl(e.target.value)}
                  placeholder="Deploy URL (https://your-app.vercel.app)"
                  className="w-full rounded-xl border border-border-dim bg-bg-base/50 px-3 py-2 font-code text-xs text-text-primary placeholder:text-text-muted focus:border-accent-cyan/30 focus:outline-none focus:ring-1 focus:ring-accent-cyan/20"
                />
              )}
              {needsCommitInfo && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={commitsCount}
                    onChange={(e) => setCommitsCount(e.target.value)}
                    placeholder="Commits"
                    min="0"
                    className="w-full rounded-xl border border-border-dim bg-bg-base/50 px-3 py-2 font-code text-xs text-text-primary placeholder:text-text-muted focus:border-accent-green/30 focus:outline-none focus:ring-1 focus:ring-accent-green/20"
                  />
                  <input
                    type="number"
                    value={filesChanged}
                    onChange={(e) => setFilesChanged(e.target.value)}
                    placeholder="Files changed"
                    min="0"
                    className="w-full rounded-xl border border-border-dim bg-bg-base/50 px-3 py-2 font-code text-xs text-text-primary placeholder:text-text-muted focus:border-accent-green/30 focus:outline-none focus:ring-1 focus:ring-accent-green/20"
                  />
                </div>
              )}
            </div>

            {/* File upload area */}
            <div className="mt-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-dim bg-bg-base/30 py-6 transition-colors hover:border-border-subtle hover:bg-bg-base/50"
              >
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
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <span className="text-xs text-text-muted">
                  {uploadState === "uploading"
                    ? "Uploading..."
                    : "Click to upload screenshots or videos"}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-bg-elevated px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs">
                          {file.type === "image" ? "\u{1F5BC}\u{FE0F}" : "\u{1F3AC}"}
                        </span>
                        <span className="truncate text-xs text-text-secondary">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="ml-2 shrink-0 text-text-muted transition-colors hover:text-accent-pink"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-3 text-xs text-accent-pink">{error}</p>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="rounded-xl px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || uploadState === "uploading"}
                className="rounded-xl bg-gradient-to-r from-accent-green to-accent-cyan px-5 py-2 text-sm font-bold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
