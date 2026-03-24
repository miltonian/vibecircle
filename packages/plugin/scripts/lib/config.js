#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Config management for the Vibecircle Claude Code plugin.
 * Reads/writes config from ${CLAUDE_PLUGIN_DATA}/config.json
 * Config shape: { apiUrl, authToken, circleId, autoShare }
 */

const DEFAULTS = {
  apiUrl: "",
  authToken: "",
  circleId: "",
  autoShare: true,
};

/** Return the directory where config is stored */
function getDataDir() {
  if (process.env.CLAUDE_PLUGIN_DATA) {
    return process.env.CLAUDE_PLUGIN_DATA;
  }
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, ".vibecircle");
}

/** Return the path to the config file */
function getConfigPath() {
  return path.join(getDataDir(), "config.json");
}

/** Read config, returns parsed JSON (or defaults) */
function getConfig() {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULTS };
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Update a single key in the config */
function setConfig(key, value) {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const config = getConfig();
    config[key] = value;
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
    return config;
  } catch (err) {
    process.stderr.write(`[vibecircle] Failed to write config: ${err.message}\n`);
    return null;
  }
}

/** Returns true if apiUrl and authToken are set */
function isConfigured() {
  const config = getConfig();
  return Boolean(config.apiUrl && config.authToken);
}

// CLI usage: node config.js check
// Outputs "configured" or "not-configured" and relevant info
if (require.main === module) {
  const command = process.argv[2];

  if (command === "check") {
    const config = getConfig();
    if (isConfigured()) {
      process.stdout.write("configured\n");
      process.stdout.write(`apiUrl: ${config.apiUrl}\n`);
      process.stdout.write(`circleId: ${config.circleId || "(not set)"}\n`);
      process.stdout.write(`autoShare: ${config.autoShare}\n`);
    } else {
      process.stdout.write("not-configured\n");
      process.stdout.write(
        "Run: node config.js set apiUrl <url> && node config.js set authToken <token>\n"
      );
    }
  } else if (command === "set" && process.argv[3]) {
    const key = process.argv[3];
    let value = process.argv[4];
    // Parse booleans
    if (value === "true") value = true;
    if (value === "false") value = false;
    const result = setConfig(key, value);
    if (result) {
      process.stdout.write(`Set ${key} = ${JSON.stringify(value)}\n`);
    }
  } else if (command === "get") {
    const config = getConfig();
    const key = process.argv[3];
    if (key) {
      process.stdout.write(`${config[key] ?? ""}\n`);
    } else {
      process.stdout.write(JSON.stringify(config, null, 2) + "\n");
    }
  } else {
    process.stdout.write("Usage: node config.js <check|get [key]|set key value>\n");
  }

  process.exit(0);
}

module.exports = { getConfig, setConfig, isConfigured, getDataDir, getConfigPath };
