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
  const last = getLastSuggestTime();
  if (Date.now() - last < 5 * 60 * 1000) {
    process.exit(0);
  }
  setLastSuggestTime();

  const circles = config.circles || [];
  const circleInfo = circles.map(c => `${c.name} (id: ${c.id}, tone: ${c.tone}, filter: ${c.filter})`).join(", ");
  const apiUrl = config.apiUrl || "https://vibecircle.dev";

  const output = JSON.stringify({
    decision: "approve",
    systemMessage: `[vibecircle auto-share] ${trigger}

This looks like a good moment to share with the user's circles: ${circleInfo}.

**Arc Resolution — do this first:**
1. Check if ~/.vibecircle/arc-map.json exists. If so, read it and look for the current branch name as a key.
   - If found and "resolvedAt" is less than 24 hours old, use the cached arcId and arcTitle.
   - If not found or stale, continue to step 2.
2. Get the current branch: git branch --show-current
3. Parse the branch name for a ticket ID pattern (e.g., PAY-123, PROJ-123, #123, feat/PAY-123-description).
4. If a ticket ID is found, try to look it up:
   - If Linear MCP tools are available, use them to get the issue and its parent project/epic.
   - If GitHub CLI is available, try: gh issue view <number> --json title,projectItems
   - If Jira MCP tools are available, use them.
5. If you found a parent epic/project:
   - Check existing arcs: GET ${apiUrl}/api/circles/<circleId>/arcs (use Bearer token from ~/.vibecircle/config.json authToken)
   - If an arc exists with matching epicRef, use it. Note its ID.
   - If no match, create a new arc: POST ${apiUrl}/api/circles/<circleId>/arcs with {"title": "<epic/project name>", "epicRef": {"source": "linear|jira|github", "id": "<epicId>", "url": "<epicUrl>"}}
   - Save the new arc ID.
6. If you could NOT find a ticket or epic:
   - Auto-generate an arc name from the repo name, branch, and nature of the changes.
   - Tell the user: "I couldn't find a ticket for this branch. I'm calling this arc '<name>'. Want to attach it to an existing arc instead?" Then list active arcs as numbered options.
7. Determine the arc sequence: count existing posts in this arc + 1.
8. Save the branch→arc mapping to ~/.vibecircle/arc-map.json for next time.

**If you found ticket info, also gather:**
- ticket source, ID, title, URL, status
- epic/project progress (total tickets, done, in-progress)

**Then draft and share:**
1. Based on what was just built, draft a post for each matching circle. Write a headline (one line, plain English) and a body (2-3 sentences, markdown). Adapt tone per circle.
2. Try to capture a screenshot if UI work was done.
3. Show the user a numbered preview with full content. Ask: Post: [all] · [1,2] · [skip] · [edit N]
4. If they approve, post each via: node ${process.env.CLAUDE_PLUGIN_ROOT || "PLUGIN_ROOT"}/scripts/post-to-circle.js --circle-id <id> --type <shipped|wip> --headline "<headline>" --body "<body>" --arc-id "<arcId>" --arc-title "<arcTitle>" --arc-sequence <n>
   Add ticket flags if available: --ticket-source <source> --ticket-id <id> --ticket-title "<title>" --ticket-url "<url>" --ticket-status "<status>" --epic-total <n> --epic-done <n> --epic-in-progress <n>
5. Add --screenshot <path> if one was captured.

Be casual — "Looks like you made progress on <arc name> — want to share it?"`
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
