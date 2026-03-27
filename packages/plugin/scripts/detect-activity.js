#!/usr/bin/env node
"use strict";

/**
 * Detect coding activity and suggest sharing.
 * Called by Stop hook after Claude finishes a response.
 * Checks: uncommitted changes, recent commits, recent PRs.
 * Always exits 0 — never blocks Claude Code.
 */

const { execFileSync } = require("child_process");
const { getConfig, isConfigured, getCirclesForRepo, getDataDir } = require("./lib/config");
const fs = require("fs");
const path = require("path");

/** Track last suggestion time to avoid spamming */
function getLastSuggestTime() {
  try {
    const file = path.join(getDataDir(), ".last-suggest");
    if (fs.existsSync(file)) {
      return parseInt(fs.readFileSync(file, "utf-8").trim(), 10) || 0;
    }
  } catch {}
  return 0;
}

function setLastSuggestTime() {
  try {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".last-suggest"), Date.now().toString(), "utf-8");
  } catch {}
}

function suggest(message) {
  // Don't suggest more than once every 5 minutes
  const last = getLastSuggestTime();
  if (Date.now() - last < 5 * 60 * 1000) {
    process.exit(0);
  }
  setLastSuggestTime();
  process.stdout.write(message + "\n");
  process.exit(0);
}

function shell(cmd, args, fallback) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return fallback !== undefined ? fallback : "";
  }
}

function main() {
  if (!isConfigured()) process.exit(0);

  const config = getConfig();
  if (config.autoShare === false) process.exit(0);
  if (!config.circles || config.circles.length === 0) process.exit(0);

  // Detect current repo
  const remote = shell("git", ["remote", "get-url", "origin"], "");
  if (!remote) process.exit(0);

  let repo = "";
  const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (match) repo = match[1];

  const matchingCircles = getCirclesForRepo(repo);
  if (matchingCircles.length === 0) process.exit(0);

  const circleNames = matchingCircles.map((c) => c.name).join(", ");

  // 1. Check uncommitted changes
  const status = shell("git", ["status", "--short"], "");
  const statusLines = status ? status.split("\n").filter(Boolean) : [];
  const changedFiles = statusLines.length;

  if (changedFiles >= 2) {
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

    if (!isOnlyConfig) {
      suggest(`You've made changes to ${changedFiles} files. Share with your circles (${circleNames})? Use /share`);
    }
  }

  // 2. Check recent commits (last 15 minutes)
  const recentLog = shell("git", ["log", "--oneline", "--since=15 minutes ago"], "");
  if (recentLog) {
    const commits = recentLog.split("\n").filter(Boolean);
    if (commits.length >= 2) {
      // Get the latest commit message for context
      const latestMsg = commits[0].replace(/^[a-f0-9]+ /, "");
      suggest(`You've committed ${commits.length} times recently (latest: "${latestMsg}"). Share with your circles (${circleNames})? Use /share`);
    }
  }

  // 3. Check for recently created PRs (last 10 minutes)
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
          suggest(`You just opened PR #${pr.number}: "${pr.title}". Share with your circles (${circleNames})? Use /share`);
        }
      }
    }
  } catch {
    // gh CLI not available or not authenticated — skip silently
  }

  process.exit(0);
}

main();
