#!/usr/bin/env node
"use strict";

/**
 * Post content to the user's Vibecircle.
 * Usage: node post-to-circle.js --type shipped|wip --body "message" [--screenshot /path/to/file]
 * Always exits 0 — never blocks Claude Code.
 */

const { execFileSync } = require("child_process");
const { getConfig, isConfigured } = require("./lib/config");
const { post, uploadFile } = require("./lib/api-client");

/** Parse command-line arguments */
function parseArgs(argv) {
  const args = { type: "wip", body: "", screenshot: "", headline: "", arcId: "", arcTitle: "", arcSequence: "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--type" && argv[i + 1]) {
      args.type = argv[++i];
    } else if (argv[i] === "--body" && argv[i + 1]) {
      args.body = argv[++i];
    } else if (argv[i] === "--screenshot" && argv[i + 1]) {
      args.screenshot = argv[++i];
    } else if (argv[i] === "--headline" && argv[i + 1]) {
      args.headline = argv[++i];
    } else if (argv[i] === "--arc-id" && argv[i + 1]) {
      args.arcId = argv[++i];
    } else if (argv[i] === "--arc-title" && argv[i + 1]) {
      args.arcTitle = argv[++i];
    } else if (argv[i] === "--arc-sequence" && argv[i + 1]) {
      args.arcSequence = argv[++i];
    }
  }
  return args;
}

/** Safely run a command with execFileSync and return trimmed output, or fallback */
function shell(cmd, cmdArgs, fallback) {
  try {
    return execFileSync(cmd, cmdArgs, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return fallback !== undefined ? fallback : "";
  }
}

/** Gather git metadata */
function getGitMetadata() {
  const repoUrl = shell("git", ["remote", "get-url", "origin"], "");
  const logOutput = shell("git", ["log", "--oneline", "-20"], "");
  const commitsCount = logOutput ? logOutput.split("\n").filter(Boolean).length.toString() : "0";
  const diffStat = shell("git", ["diff", "--stat", "HEAD~5"], "");

  // Count files changed from diff stat
  const lines = diffStat.split("\n").filter(Boolean);
  // The last line of git diff --stat is a summary, preceding lines are files
  const filesChanged = Math.max(0, lines.length - 1).toString();

  return {
    repo_url: repoUrl,
    commits_count: commitsCount,
    files_changed: filesChanged,
    deploy_url: "",
  };
}

async function main() {
  if (!isConfigured()) {
    process.stderr.write("[vibecircle] Not configured. Run /circle to set up.\n");
    process.exit(0);
  }

  const config = getConfig();
  if (!config.circleId) {
    process.stderr.write("[vibecircle] No circleId configured.\n");
    process.exit(0);
  }

  const args = parseArgs(process.argv);
  const metadata = getGitMetadata();

  // Build media array
  const media = [];

  // Upload screenshot if provided
  if (args.screenshot) {
    const uploadResult = await uploadFile("/api/upload", args.screenshot);
    if (uploadResult && uploadResult.url) {
      media.push({ type: "image", url: uploadResult.url });
    }
  }

  // Build the post payload
  const payload = {
    type: args.type,
    body: args.body || null,
    media: media.length > 0 ? media : null,
    metadata: metadata,
    headline: args.headline || null,
    arcId: args.arcId || null,
    arcTitle: args.arcTitle || null,
    arcSequence: args.arcSequence ? parseInt(args.arcSequence, 10) : null,
  };

  const result = await post(`/api/circles/${config.circleId}/posts`, payload);

  if (result) {
    process.stdout.write("\u2713 Posted to your circle!\n");
  } else {
    process.stderr.write("[vibecircle] Failed to post. Check your config.\n");
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[vibecircle] post-to-circle error: ${err.message}\n`);
  process.exit(0);
});
