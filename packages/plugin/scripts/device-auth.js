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

        // Add the circle (name will be set by /circle setup prompt)
        addCircle({ id: data.circleId, name: "", tone: "casual", filter: "everything", repos: "*" });

        const configPath = getConfigPath();
        process.stdout.write(`\n✓ vibecircle configured! Config saved to ${configPath}\n`);
        process.stdout.write(`circleId:${data.circleId}\n`);
        process.stdout.write("Use /share to post to your circle.\n");
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
