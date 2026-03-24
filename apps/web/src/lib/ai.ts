import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"

/** Parse a GitHub URL into owner/repo. Supports various formats. */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("github.com")) return null
    const parts = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/")
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1] }
  } catch {
    return null
  }
}

/** Fetch a file from a public GitHub repo. Returns decoded text or null. */
async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.encoding === "base64" && data.content) {
      return atob(data.content.replace(/\n/g, ""))
    }
    return null
  } catch {
    return null
  }
}

/** Fetch the file tree of a public GitHub repo (recursive). */
async function fetchFileTree(
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    // Try main first, then master
    for (const branch of ["main", "master"]) {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const tree = (data.tree ?? []) as Array<{ path: string; type: string }>
        // Filter to just files (blobs), limit to 200 entries for prompt size
        const files = tree
          .filter((item) => item.type === "blob")
          .map((item) => item.path)
          .slice(0, 200)
        return files.join("\n")
      }
    }
    return null
  } catch {
    return null
  }
}

export async function explainProject(
  repoUrl: string,
  apiKey: string,
  provider: "openai" | "anthropic"
) {
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) {
    throw new Error("Invalid GitHub URL")
  }

  const { owner, repo } = parsed

  // Fetch key files from the public GitHub repo in parallel
  const [fileTree, packageJson, readme] = await Promise.all([
    fetchFileTree(owner, repo),
    fetchGitHubFile(owner, repo, "package.json"),
    fetchGitHubFile(owner, repo, "README.md"),
  ])

  if (!fileTree && !packageJson && !readme) {
    throw new Error(
      "Could not fetch any data from this repo. Is it public?"
    )
  }

  // Build prompt with gathered context
  const contextParts: string[] = [`Repo: ${repoUrl}`]

  if (fileTree) {
    contextParts.push(`\nFile tree:\n${fileTree}`)
  }
  if (packageJson) {
    contextParts.push(`\npackage.json:\n${packageJson}`)
  }
  if (readme) {
    // Truncate long READMEs to keep prompt manageable
    const truncated = readme.length > 3000 ? readme.slice(0, 3000) + "\n..." : readme
    contextParts.push(`\nREADME:\n${truncated}`)
  }

  const model =
    provider === "openai"
      ? createOpenAI({ apiKey })("gpt-4o")
      : createAnthropic({ apiKey })("claude-sonnet-4-20250514")

  return streamText({
    model,
    system:
      "You are analyzing a coding project to explain how it was built. Be concise (aim for 150-250 words). Highlight interesting architectural patterns, key dependencies, and note what's novel or clever. Format with markdown. Start with a one-line summary, then use bullet points for details.",
    prompt: `Analyze this project and explain how it was built:\n\n${contextParts.join("\n")}`,
  })
}
