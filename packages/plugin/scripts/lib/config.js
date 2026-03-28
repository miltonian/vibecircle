#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Config management for the Vibecircle Claude Code plugin.
 * Config shape: { apiUrl, authToken, circles: [...], autoShare }
 */

/** Return the directory where config is stored */
function getDataDir() {
  if (process.env.CLAUDE_PLUGIN_DATA) {
    return process.env.CLAUDE_PLUGIN_DATA;
  }
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, ".vibecircle");
}

/** Return the path to the config file (env-aware via VIBECIRCLE_ENV) */
function getConfigPath() {
  const env = process.env.VIBECIRCLE_ENV;
  const filename = env ? `config.${env}.json` : "config.json";
  return path.join(getDataDir(), filename);
}

/** Read config, auto-migrate old format */
function getConfig() {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return { apiUrl: "", authToken: "", circles: [], autoShare: true };
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);

    // Migrate old single-circle format
    if (parsed.circleId && !parsed.circles) {
      parsed.circles = [
        {
          id: parsed.circleId,
          name: "My Circle",
          tone: "casual",
          filter: "everything",
          repos: "*",
        },
      ];
      delete parsed.circleId;
      // Write migrated config back
      saveConfig(parsed);
    }

    if (!parsed.circles) parsed.circles = [];
    if (parsed.autoShare === undefined) parsed.autoShare = true;

    return parsed;
  } catch {
    return { apiUrl: "", authToken: "", circles: [], autoShare: true };
  }
}

/** Write full config to disk */
function saveConfig(config) {
  try {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (err) {
    process.stderr.write(`[vibecircle] Failed to write config: ${err.message}\n`);
    return false;
  }
}

/** Update a single key in the config */
function setConfig(key, value) {
  const config = getConfig();
  config[key] = value;
  saveConfig(config);
  return config;
}

/** Returns true if apiUrl and authToken are set */
function isConfigured() {
  const config = getConfig();
  return Boolean(config.apiUrl && config.authToken);
}

/** Get the circles array */
function getCircles() {
  return getConfig().circles || [];
}

/** Get circles that match a given repo (owner/repo format) */
function getCirclesForRepo(repo) {
  const circles = getCircles();
  if (!repo) return circles;
  return circles.filter((c) => {
    if (c.repos === "*") return true;
    if (Array.isArray(c.repos)) {
      return c.repos.some((r) => repo.includes(r));
    }
    return true;
  });
}

/** Add a circle to the config */
function addCircle(circle) {
  const config = getConfig();
  // Check for duplicate
  const existing = config.circles.find((c) => c.id === circle.id);
  if (existing) {
    // Update existing
    Object.assign(existing, circle);
  } else {
    config.circles.push(circle);
  }
  saveConfig(config);
  return config;
}

/** Remove a circle by name */
function removeCircle(name) {
  const config = getConfig();
  const lower = name.toLowerCase();
  config.circles = config.circles.filter(
    (c) => (c.name || "").toLowerCase() !== lower
  );
  saveConfig(config);
  return config;
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];

  if (command === "check") {
    const config = getConfig();
    if (isConfigured()) {
      process.stdout.write("configured\n");
      process.stdout.write(`apiUrl: ${config.apiUrl}\n`);
      process.stdout.write(`circles: ${config.circles.length}\n`);
      for (const c of config.circles) {
        process.stdout.write(`  - ${c.name} (${c.tone}, ${c.filter}, repos: ${Array.isArray(c.repos) ? c.repos.join(", ") : c.repos})\n`);
      }
      process.stdout.write(`autoShare: ${config.autoShare}\n`);
    } else {
      process.stdout.write("not-configured\n");
      process.stdout.write("Run /circle setup to configure.\n");
    }
  } else if (command === "set" && process.argv[3]) {
    const key = process.argv[3];
    let value = process.argv[4];
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
      const val = config[key];
      process.stdout.write(`${typeof val === "object" ? JSON.stringify(val) : val ?? ""}\n`);
    } else {
      process.stdout.write(JSON.stringify(config, null, 2) + "\n");
    }
  } else if (command === "circles") {
    const circles = getCircles();
    if (circles.length === 0) {
      process.stdout.write("No circles configured.\n");
    } else {
      for (const c of circles) {
        process.stdout.write(`${c.name} (${c.id}) — tone: ${c.tone}, filter: ${c.filter}, repos: ${Array.isArray(c.repos) ? c.repos.join(", ") : c.repos}\n`);
      }
    }
  } else if (command === "circles-for-repo") {
    const repo = process.argv[3] || "";
    const circles = getCirclesForRepo(repo);
    process.stdout.write(JSON.stringify(circles, null, 2) + "\n");
  } else {
    process.stdout.write("Usage: node config.js <check|get [key]|set key value|circles|circles-for-repo owner/repo>\n");
  }

  process.exit(0);
}

module.exports = {
  getConfig,
  setConfig,
  saveConfig,
  isConfigured,
  getCircles,
  getCirclesForRepo,
  addCircle,
  removeCircle,
  getDataDir,
  getConfigPath,
};
