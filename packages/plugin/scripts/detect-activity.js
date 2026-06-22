#!/usr/bin/env node
"use strict";

/**
 * Detect coding activity and surface a PASSIVE share nudge.
 * Called by the Stop hook after Claude finishes a response.
 * Checks: uncommitted changes, recent commits, recent PRs.
 *
 * IMPORTANT: this must never block the stop or inject imperative instructions.
 * A Stop hook that returns `decision: "block"` (or dumps a "now go do X" message)
 * hijacks the turn and makes Claude keep working instead of handing control back
 * to the user. We only print a one-line, user-facing `systemMessage` and exit 0.
 * The actual draft/preview/post flow lives in the user-invoked `/share` command.
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

function suggest(trigger, circleNames) {
  const last = getLastSuggestTime();
  if (Date.now() - last < 5 * 60 * 1000) {
    process.exit(0);
  }
  setLastSuggestTime();

  // Passive, non-blocking nudge ONLY. No `decision` (that would block the stop);
  // `systemMessage` is shown to the user, not fed to Claude as an instruction.
  const output = JSON.stringify({
    systemMessage: `vibecircle — ${trigger} Looks worth sharing to ${circleNames}. Run /share when you want to post it.`,
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
      suggest(`${changedFiles} uncommitted file changes in this session.`, circleNames);
    }
  }

  // 2. Check recent commits (last 15 minutes)
  const recentLog = shell("git", ["log", "--oneline", "--since=15 minutes ago"], "");
  if (recentLog) {
    const commits = recentLog.split("\n").filter(Boolean);
    if (commits.length >= 2) {
      // Get the latest commit message for context
      const latestMsg = commits[0].replace(/^[a-f0-9]+ /, "");
      suggest(`${commits.length} commits in the last 15 minutes (latest: "${latestMsg}").`, circleNames);
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
          suggest(`You just opened PR #${pr.number}: "${pr.title}".`, circleNames);
        }
      }
    }
  } catch {
    // gh CLI not available or not authenticated — skip silently
  }

  process.exit(0);
}

main();
