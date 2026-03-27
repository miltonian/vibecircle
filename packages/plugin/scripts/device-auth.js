#!/usr/bin/env node
"use strict";

// Device code auth flow for vibecircle plugin setup
// 1. POST /api/auth/device-code -> get code
// 2. Open browser to authorizeUrl
// 3. Poll /api/auth/device-code/[code] every 2 seconds
// 4. When authorized, write config to ~/.vibecircle/config.json
// 5. Print success message

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { getConfig, saveConfig, addCircle, getConfigPath } = require("./lib/config");

const API_URL = "https://vibecircle.dev";

/** Get the config directory */
function getDataDir() {
  if (process.env.CLAUDE_PLUGIN_DATA) {
    return process.env.CLAUDE_PLUGIN_DATA;
  }
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, ".vibecircle");
}

/** Sleep for ms milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Step 1: Request a device code
  process.stdout.write("Requesting device code...\n");

  let codeData;
  try {
    const res = await fetch(`${API_URL}/api/auth/device-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      process.stderr.write(`Failed to create device code: ${res.status} ${text}\n`);
      process.stdout.write("Try setting up manually: open https://vibecircle.dev/setup/plugin\n");
      process.exit(0);
    }
    codeData = await res.json();
  } catch (err) {
    process.stderr.write(`Network error: ${err.message}\n`);
    process.stdout.write("Try setting up manually: open https://vibecircle.dev/setup/plugin\n");
    process.exit(0);
  }

  const { code, authorizeUrl } = codeData;

  // Step 2: Open browser
  process.stdout.write(`\nYour device code: ${code}\n`);
  process.stdout.write("Opening browser to authorize...\n\n");

  try {
    // Use execFileSync to avoid shell injection (authorizeUrl is from our server, but best practice)
    execFileSync("open", [authorizeUrl], { stdio: "ignore" });
  } catch {
    // If open fails (e.g., not macOS), just print the URL
    process.stdout.write(`Open this URL in your browser:\n${authorizeUrl}\n\n`);
  }

  process.stdout.write("Waiting for authorization...\n");

  // Step 3: Poll for authorization (every 2 seconds, max 5 minutes)
  const maxAttempts = 150; // 5 minutes at 2 seconds each
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await sleep(2000);

    try {
      const res = await fetch(`${API_URL}/api/auth/device-code/${code}`);
      if (!res.ok) {
        // Unexpected error, keep polling
        continue;
      }

      const data = await res.json();

      if (data.status === "authorized") {
        // Step 4: Write config
        // Update shared auth fields
        const config = getConfig();
        config.apiUrl = data.apiUrl;
        config.authToken = data.token;
        saveConfig(config);

        // Fetch all user circles and sync them
        let allCircles = [];
        try {
          const listRes = await fetch(`${API_URL}/api/circles`, {
            headers: { Authorization: `Bearer ${data.token}` },
          });
          if (listRes.ok) {
            allCircles = await listRes.json();
          }
        } catch {
          // Circle fetch failed — we'll still add the selected circle below
        }

        // Find the name of the explicitly-selected circle
        const selectedCircle = allCircles.find((c) => c.id === data.circleId);
        const circleName = selectedCircle?.name || "";

        // Add the explicitly-selected circle first
        addCircle({
          id: data.circleId,
          name: circleName || "My Circle",
          tone: "casual",
          filter: "everything",
          repos: "*",
        });

        // Sync remaining circles (only add new ones — don't overwrite customizations)
        const allCircleNames = [circleName || "My Circle"];
        const currentConfig = getConfig();
        const existingIds = new Set(currentConfig.circles.map((c) => c.id));
        for (const c of allCircles) {
          if (c.id === data.circleId) continue; // Already added above
          if (!existingIds.has(c.id)) {
            addCircle({
              id: c.id,
              name: c.name,
              tone: "casual",
              filter: "everything",
              repos: "*",
            });
          }
          // Collect name for summary (whether new or existing)
          allCircleNames.push(c.name);
        }

        const configPath = getConfigPath();
        if (allCircleNames.length > 1) {
          process.stdout.write(`\n✓ Connected to ${allCircleNames.length} circles: ${allCircleNames.join(", ")}! Config saved to ${configPath}\n`);
        } else {
          process.stdout.write(`\n✓ Connected to ${allCircleNames[0]}! Config saved to ${configPath}\n`);
        }
        process.stdout.write(`circleName:${circleName}\n`);
        process.stdout.write(`circleId:${data.circleId}\n`);
        process.exit(0);
      }

      if (data.status === "expired") {
        process.stdout.write("\nDevice code expired. Please try again.\n");
        process.exit(0);
      }

      // Still pending, continue polling
    } catch {
      // Network error, keep trying
    }
  }

  // Timed out
  process.stdout.write("\nTimed out waiting for authorization. Please try again.\n");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[vibecircle] device-auth error: ${err.message}\n`);
  process.exit(0); // Never block Claude Code
});
