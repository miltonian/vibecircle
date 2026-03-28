#!/usr/bin/env node
"use strict";

// Device code auth flow for vibecircle plugin setup
// 1. POST /api/auth/device-code -> get code
// 2. Open browser to authorizeUrl
// 3. Poll /api/auth/device-code/[code] every 2 seconds
// 4. When authorized, write config to ~/.vibecircle/config.json
// 5. Print success message

const { execFileSync } = require("child_process");
const { getConfig, saveConfig, getConfigPath } = require("./lib/config");
const { get } = require("./lib/api-client");

const API_URL = getConfig().apiUrl || "https://vibecircle.dev";

const CIRCLE_DEFAULTS = { tone: "casual", filter: "everything", repos: "*" };

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
        // Save auth credentials (single read-mutate-write)
        const config = getConfig();
        config.apiUrl = data.apiUrl;
        config.authToken = data.token;
        saveConfig(config);

        // Fetch all user circles (uses saved token via api-client)
        const allCircles = await get("/api/circles") || [];

        // Find the name of the explicitly-selected circle
        const selectedCircle = allCircles.find((c) => c.id === data.circleId);
        const circleName = selectedCircle?.name || "";

        // Batch circle sync — single read, in-memory mutations, single write
        const updatedConfig = getConfig();
        const existingIds = new Set(updatedConfig.circles.map((c) => c.id));

        // Add the explicitly-selected circle first
        if (!existingIds.has(data.circleId)) {
          updatedConfig.circles.push({
            id: data.circleId,
            name: circleName || "My Circle",
            ...CIRCLE_DEFAULTS,
          });
          existingIds.add(data.circleId);
        }

        // Add remaining circles (skip existing to preserve customizations)
        let newCount = existingIds.has(data.circleId) ? 0 : 1;
        for (const c of allCircles) {
          if (c.id === data.circleId) continue;
          if (!existingIds.has(c.id)) {
            updatedConfig.circles.push({ id: c.id, name: c.name, ...CIRCLE_DEFAULTS });
            newCount++;
          }
        }

        saveConfig(updatedConfig);

        const configPath = getConfigPath();
        const totalCircles = updatedConfig.circles.length;
        const circleNames = updatedConfig.circles.map((c) => c.name).join(", ");
        if (totalCircles > 1) {
          const syncMsg = newCount > 0 ? ` (${newCount} new)` : "";
          process.stdout.write(`\n✓ Synced ${totalCircles} circles${syncMsg}: ${circleNames}! Config saved to ${configPath}\n`);
        } else {
          process.stdout.write(`\n✓ Connected to ${updatedConfig.circles[0]?.name || "your circle"}! Config saved to ${configPath}\n`);
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
