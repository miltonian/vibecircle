#!/usr/bin/env node
"use strict";

/**
 * Detect coding activity and suggest sharing.
 * Called by Stop hook after Claude finishes a response.
 * Checks recent git activity and suggests sharing if significant.
 * Always exits 0 — never blocks Claude Code.
 */

const { execFileSync } = require("child_process");
const { getConfig, isConfigured } = require("./lib/config");

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

  // Don't suggest if no circle is set
  if (!config.circleId) {
    process.exit(0);
  }

  try {
    // Check recent git activity (last 10 minutes)
    const log = execFileSync(
      "git",
      ["log", "--oneline", "--since=10 minutes ago"],
      { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!log) {
      process.exit(0);
    }

    const commits = log.split("\n").filter(Boolean);
    const count = commits.length;

    if (count > 3) {
      process.stdout.write(
        `You've made ${count} commits recently. Share with your circle? Use /share\n`
      );
    }
  } catch {
    // git not available or not in a repo — silently exit
  }

  process.exit(0);
}

main();
