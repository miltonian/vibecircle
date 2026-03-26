#!/usr/bin/env node
"use strict";

/**
 * Detect coding activity and suggest sharing.
 * Called by Stop hook after Claude finishes a response.
 * Checks recent git activity and config, suggests /share if appropriate.
 * Always exits 0 — never blocks Claude Code.
 */

const { execFileSync } = require("child_process");
const { getConfig, isConfigured, getCirclesForRepo } = require("./lib/config");

function main() {
  // Don't suggest if not configured
  if (!isConfigured()) {
    process.exit(0);
  }

  const config = getConfig();

  // Don't suggest if autoShare is disabled
  if (config.autoShare === false) {
    process.exit(0);
  }

  // Don't suggest if no circles
  if (!config.circles || config.circles.length === 0) {
    process.exit(0);
  }

  // Detect current repo
  let repo = "";
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    // Parse owner/repo from URL
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) repo = match[1];
  } catch {
    // Not in a git repo
    process.exit(0);
  }

  // Check if any circles match this repo
  const matchingCircles = getCirclesForRepo(repo);
  if (matchingCircles.length === 0) {
    process.exit(0);
  }

  try {
    // Check for recent changes
    const status = execFileSync("git", ["status", "--short"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const diffStat = execFileSync("git", ["diff", "--stat"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Count modified/new files
    const statusLines = status ? status.split("\n").filter(Boolean) : [];
    const changedFiles = statusLines.length;

    // Skip if no changes
    if (changedFiles === 0 && !diffStat) {
      process.exit(0);
    }

    // Skip if only config/lock/env files
    const isOnlyConfig = statusLines.every((line) => {
      const file = line.trim().split(/\s+/).pop() || "";
      return (
        file.endsWith(".lock") ||
        file.endsWith(".env") ||
        file.endsWith(".env.local") ||
        file === "package.json" ||
        file === "tsconfig.json"
      );
    });

    if (isOnlyConfig) {
      process.exit(0);
    }

    // Suggest sharing if 2+ meaningful files changed
    if (changedFiles >= 2 || diffStat.includes("files changed")) {
      const circleNames = matchingCircles.map((c) => c.name).join(", ");
      process.stdout.write(
        `You've made changes to ${changedFiles} files. Share with your circles (${circleNames})? Use /share\n`
      );
      process.exit(0);
    }
  } catch {
    // git not available or not in a repo — silently exit
  }

  // Check for recently created PRs (last 10 minutes)
  try {
    const prJson = execFileSync(
      "gh",
      ["pr", "list", "--author", "@me", "--state", "open", "--json", "createdAt,title,number", "--limit", "1"],
      { encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (prJson) {
      const prs = JSON.parse(prJson);
      if (prs.length > 0) {
        const pr = prs[0];
        const createdAt = new Date(pr.createdAt);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        if (createdAt > tenMinutesAgo) {
          const circleNames = matchingCircles.map((c) => c.name).join(", ");
          process.stdout.write(
            `You just opened PR #${pr.number}: "${pr.title}". Share with your circles (${circleNames})? Use /share\n`
          );
        }
      }
    }
  } catch {
    // gh CLI not available or not authenticated — skip silently
  }

  process.exit(0);
}

main();
