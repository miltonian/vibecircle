import type { NextConfig } from "next";
import path from "node:path";

// `import.meta.dirname` is undefined in some config-load contexts; when that
// happens `path.join(undefined, ...)` throws and Next silently falls back to
// lockfile inference (which, with a stray ~/pnpm-lock.yaml, picks $HOME and makes
// Turbopack watch the entire home folder -> memory + fd exhaustion). next dev/build
// always run from apps/web, so process.cwd() is a reliable fallback anchor.
const appDir = import.meta.dirname || process.cwd();
const repoRoot = path.resolve(appDir, "..", "..");

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this monorepo. Otherwise Next infers it
  // from the nearest lockfile and, with a stray ~/pnpm-lock.yaml present, picks
  // the home directory — making the dev file-watcher recurse the entire home
  // folder and peg the CPU. Watch only the repo.
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
