#!/usr/bin/env node
"use strict";

/**
 * Update presence status in Vibecircle.
 * Called by hooks on SessionStart and SessionEnd.
 * Usage: node update-presence.js building|away
 * Always exits 0 — never blocks Claude Code.
 */

const { getConfig } = require("./lib/config");
const { put } = require("./lib/api-client");

async function main() {
  const status = process.argv[2];
  if (!status || !["building", "online", "away"].includes(status)) {
    process.stderr.write("[vibecircle] Usage: update-presence.js building|online|away\n");
    process.exit(0);
  }

  const config = getConfig();
  if (!config.apiUrl || !config.authToken) {
    process.exit(0);
  }

  const circles = config.circles || [];
  if (circles.length === 0) {
    process.exit(0);
  }

  await Promise.allSettled(
    circles.map((c) =>
      put("/api/presence", { circleId: c.id, status })
    )
  );

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[vibecircle] update-presence error: ${err.message}\n`);
  process.exit(0);
});
