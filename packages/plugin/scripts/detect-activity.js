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

function suggest(trigger, circleNames, config) {
  // Don't suggest more than once every 5 minutes
  const last = getLastSuggestTime();
  if (Date.now() - last < 5 * 60 * 1000) {
    process.exit(0);
  }
  setLastSuggestTime();

  // Read circles config for tone info
  const circles = config.circles || [];
  const circleInfo = circles.map(c => `${c.name} (tone: ${c.tone}, filter: ${c.filter})`).join(", ");

  const output = JSON.stringify({
    decision: "approve",
    systemMessage: `[vibecircle auto-share] ${trigger}

This looks like a good moment to share with the user's circles: ${circleInfo}.

Do this now:
1. Based on what was just built in this conversation, draft a post for each matching circle. Write a headline (one line, plain English, no jargon) and a body (2-3 sentences, markdown OK). Adapt the tone per circle.
2. Try to capture a screenshot if UI work was done — check conversation context for a dev server URL, or use the production URL from ~/.vibecircle/config.json apiUrl field. Use Playwright MCP tools if available.
3. Show the user a preview of all drafts numbered, with full content. Ask: Post: [all] · [1,2] · [skip] · [edit N]
4. If they approve, post each via: node ${process.env.CLAUDE_PLUGIN_ROOT || "PLUGIN_ROOT"}/scripts/post-to-circle.js --circle-id <id> --type <shipped|wip> --headline "<headline>" --body "<body>" --arc-id "<arcId>" --arc-title "<arcTitle>" --arc-sequence <n>
5. Add --screenshot <path> if one was captured.

Be casual about it — don't be robotic. Something like "Looks like you shipped something cool — want to share it?" then show the preview.`
  });
  process.stdout.write(output);
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
      suggest(`User has ${changedFiles} uncommitted file changes in this session.`, circleNames, config);
    }
  }

  // 2. Check recent commits (last 15 minutes)
  const recentLog = shell("git", ["log", "--oneline", "--since=15 minutes ago"], "");
  if (recentLog) {
    const commits = recentLog.split("\n").filter(Boolean);
    if (commits.length >= 2) {
      // Get the latest commit message for context
      const latestMsg = commits[0].replace(/^[a-f0-9]+ /, "");
      suggest(`User made ${commits.length} commits in the last 15 minutes (latest: "${latestMsg}").`, circleNames, config);
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
          suggest(`User just opened PR #${pr.number}: "${pr.title}".`, circleNames, config);
        }
      }
    }
  } catch {
    // gh CLI not available or not authenticated — skip silently
  }

  process.exit(0);
}

main();
