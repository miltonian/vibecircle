# Multi-Circle Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support multiple circles in the plugin — each with its own tone, content filter, and repo scope. One session can produce different posts for different audiences.

**Architecture:** Config changes from single `circleId` to `circles` array. Config.js gains helpers for multi-circle (migration, repo matching, circle lookup). Post script accepts `--circle-id`. Sentinel and share command iterate over matching circles, generate per-audience content, show numbered preview. All changes are plugin-side — no web/API/DB changes needed.

**Tech Stack:** Node.js (plugin scripts), Claude Code Plugin SDK (prompt-based hooks)

**Spec:** `docs/superpowers/specs/2026-03-25-multi-circle-design.md`

---

## File Structure

### Modified Files
- `packages/plugin/scripts/lib/config.js` — Support `circles` array, backwards compat migration, `getCircles()`, `getCirclesForRepo()`, `addCircle()`, `removeCircle()`
- `packages/plugin/scripts/post-to-circle.js` — Accept `--circle-id` param instead of reading from config
- `packages/plugin/scripts/device-auth.js` — Don't overwrite full config; merge new circle into existing config
- `packages/plugin/hooks/hooks.json` — Stop hook prompt updated for multi-circle sentinel
- `packages/plugin/commands/share.md` — Multi-circle ghost-writer + numbered preview + selection
- `packages/plugin/commands/circle.md` — Add `add`, `list`, `remove` subcommands

---

## Task 1: Update config.js — Multi-Circle Support

**Files:**
- Modify: `packages/plugin/scripts/lib/config.js`

- [ ] **Step 1: Add migration and multi-circle helpers**

Replace the full file. Key changes:
- `getConfig()` auto-migrates old `circleId` format to `circles` array on read
- `getCircles()` returns the circles array
- `getCirclesForRepo(repo)` filters circles by repo match
- `addCircle(circle)` appends to circles array
- `removeCircle(name)` removes by name
- `saveConfig(config)` writes the full config
- CLI `check` command updated to show circle count

```javascript
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

/** Return the path to the config file */
function getConfigPath() {
  return path.join(getDataDir(), "config.json");
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/scripts/lib/config.js
git commit -m "feat: multi-circle config support with migration, repo matching, CRUD helpers"
```

---

## Task 2: Update device-auth.js — Merge Instead of Overwrite

**Files:**
- Modify: `packages/plugin/scripts/device-auth.js`

- [ ] **Step 1: Change writeConfig to merge**

The current `writeConfig` function (lines 27-35) overwrites the entire config file. Change it to merge the new circle into the existing config:

Import config helpers at the top of the file (after the existing requires):

```javascript
const { getConfig, saveConfig, addCircle, getConfigPath } = require("./lib/config");
```

Remove the existing `writeConfig` function entirely (lines 27-35).

Then in the success handler (around line 98), replace:
```javascript
        const config = {
          apiUrl: data.apiUrl,
          authToken: data.token,
          circleId: data.circleId,
          autoShare: true,
        };

        const configPath = writeConfig(config);
        process.stdout.write(`\n✓ vibecircle configured! Config saved to ${configPath}\n`);
        process.stdout.write("Use /share to post to your circle.\n");
```

With:
```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/scripts/device-auth.js
git commit -m "feat: device-auth merges new circle into existing config instead of overwriting"
```

---

## Task 3: Update post-to-circle.js — Accept --circle-id

**Files:**
- Modify: `packages/plugin/scripts/post-to-circle.js`

- [ ] **Step 1: Add --circle-id argument**

In `parseArgs`, add `circleId: ""` to defaults and the parser:

```javascript
function parseArgs(argv) {
  const args = {
    type: "wip",
    body: "",
    screenshot: "",
    headline: "",
    arcId: "",
    arcTitle: "",
    arcSequence: "",
    circleId: "",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--type" && argv[i + 1]) {
      args.type = argv[++i];
    } else if (argv[i] === "--body" && argv[i + 1]) {
      args.body = argv[++i];
    } else if (argv[i] === "--screenshot" && argv[i + 1]) {
      args.screenshot = argv[++i];
    } else if (argv[i] === "--headline" && argv[i + 1]) {
      args.headline = argv[++i];
    } else if (argv[i] === "--arc-id" && argv[i + 1]) {
      args.arcId = argv[++i];
    } else if (argv[i] === "--arc-title" && argv[i + 1]) {
      args.arcTitle = argv[++i];
    } else if (argv[i] === "--arc-sequence" && argv[i + 1]) {
      args.arcSequence = argv[++i];
    } else if (argv[i] === "--circle-id" && argv[i + 1]) {
      args.circleId = argv[++i];
    }
  }
  return args;
}
```

- [ ] **Step 2: Use --circle-id if provided, otherwise fall back to first circle**

In `main()`, change the circle ID resolution (currently `config.circleId`):

```javascript
  // Determine which circle to post to
  let circleId = args.circleId;
  if (!circleId) {
    // Fall back to first circle in config (backwards compat)
    const circles = config.circles || [];
    if (circles.length > 0) {
      circleId = circles[0].id;
    } else if (config.circleId) {
      circleId = config.circleId;  // Legacy format
    }
  }

  if (!circleId) {
    process.stderr.write("[vibecircle] No circleId configured or provided.\n");
    process.exit(0);
  }
```

Then update the POST URL (currently line 96) from:
```javascript
  const result = await post(`/api/circles/${config.circleId}/posts`, payload);
```
To:
```javascript
  const result = await post(`/api/circles/${circleId}/posts`, payload);
```

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/scripts/post-to-circle.js
git commit -m "feat: post-to-circle accepts --circle-id for multi-circle posting"
```

---

## Task 4: Update circle.md — Add, List, Remove Subcommands

**Files:**
- Modify: `packages/plugin/commands/circle.md`

- [ ] **Step 1: Rewrite circle command with new subcommands**

The command already handles `setup` and `invite`. Add `add`, `list`, `remove`. Read the existing file first, then replace it:

```markdown
---
name: circle
description: Manage your vibecircle circles — see who's online, add/remove circles, configure
allowed-tools: Bash, Read, Write
user-invocable: true
---

# /circle — Manage your circles

## Determine the subcommand

Check the argument the user provided:
- `/circle` (no args) or `/circle status` → Section 1: Show circle status
- `/circle setup` → Section 2: First-time setup
- `/circle add` → Section 3: Add another circle
- `/circle list` → Section 4: List all circles
- `/circle remove <name>` → Section 5: Remove a circle
- `/circle invite` → Section 6: Invite info

## 1. Show circle status (default)

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If not configured, tell user to run `/circle setup`.

If configured, show circles and try to fetch presence for the first circle:

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles`

Show the output formatted nicely.

## 2. First-time setup

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If already configured with circles, say "You already have circles configured. Use `/circle add` to connect another."

If not configured:

a. Run device auth: `node ${CLAUDE_PLUGIN_ROOT}/scripts/device-auth.js`
b. After auth completes, ask: "What should we call this circle?" (user types a name)
c. Ask: "What tone for posts to this circle? (casual / technical / non-technical / business-impact)"
d. Ask: "What repos should post here? (type 'all' for everything, or list repos like owner/repo separated by commas)"
e. Ask: "What filter? (everything / features-only / milestones-only)"
f. Read the config, find the circle that was just added (the one with empty name), update it with the answers:

```bash
node -e "
const { getConfig, saveConfig } = require('${CLAUDE_PLUGIN_ROOT}/scripts/lib/config');
const config = getConfig();
const circle = config.circles.find(c => !c.name || c.name === '');
if (circle) {
  circle.name = '<name from user>';
  circle.tone = '<tone from user>';
  circle.filter = '<filter from user>';
  circle.repos = '<repos from user — either \"*\" or array>';
  saveConfig(config);
  console.log('Circle configured!');
}
"
```

g. Confirm: "You're connected to <name>!"

## 3. Add another circle

a. Run device auth: `node ${CLAUDE_PLUGIN_ROOT}/scripts/device-auth.js`
b. Same questions as setup (name, tone, repos, filter)
c. Same config update
d. Confirm: "Added <name> to your circles!"

## 4. List all circles

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles`

Format nicely:
```
Your circles:
  1. Friends (casual) — all repos, everything
  2. Eng Team (technical) — vibecircle, singlefile — everything
  3. Product (non-technical) — singlefile — features only
```

## 5. Remove a circle

The user provides a name: `/circle remove Friends`

```bash
node -e "
const { removeCircle } = require('${CLAUDE_PLUGIN_ROOT}/scripts/lib/config');
removeCircle('<name>');
console.log('Removed <name>');
"
```

## 6. Invite info

"To invite someone to a circle, use the Invite button in the top bar of the vibecircle web app, or share your circle's invite link from vibecircle.dev."
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/commands/circle.md
git commit -m "feat: add circle add/list/remove subcommands for multi-circle management"
```

---

## Task 5: Update share.md — Multi-Circle Preview + Selection

**Files:**
- Modify: `packages/plugin/commands/share.md`

- [ ] **Step 1: Rewrite share command for multi-circle**

```markdown
---
name: share
description: Share what you're building with your vibecircles
allowed-tools: Bash, Read, Write, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot
user-invocable: true
---

# /share — Share what you're building

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If not configured, tell user to run `/circle setup`.

## 2. Determine matching circles

Detect current repo: run `git remote get-url origin` and parse out the `owner/repo` part.

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles-for-repo <owner/repo>`

This returns the circles whose repo scope includes this repo. If no circles match, ask: "This repo isn't mapped to any circle. Which circles should it post to?" Show numbered list of all circles, let user pick, and ask "Remember this for next time?" If yes, update the circle's repos in config.

## 3. Read session context

Read `~/.vibecircle/session.json` if it exists.

## 4. Capture a screenshot

Try to capture a screenshot (same strategy as before):
a. Check conversation context for dev server URL
b. Detect via `lsof` for this project
c. Use production URL from config `apiUrl`
d. Screenshot with Playwright MCP
e. If nothing works, ask: "Want to attach a screenshot? Drop a file path or say 'skip'."

## 5. Apply filters

For each matching circle, check its `filter`:
- `"everything"` → always qualifies
- `"features-only"` → check if this is feature work (new UI, new functionality). Ask yourself: is this a feature or just a fix/refactor? If unsure, include it.
- `"milestones-only"` → check if this was deployed/shipped. If not, skip this circle.

Remove circles that don't qualify.

## 6. Generate per-circle posts

For each qualifying circle, write a headline and body using the circle's `tone`:

- `"casual"` — write like telling a friend. Informal, enthusiastic, short.
- `"technical"` — include frameworks, architecture, tradeoffs. For engineers.
- `"non-technical"` — focus on what it does for users. For PMs/designers.
- `"business-impact"` — focus on outcomes, metrics, who benefits. For leadership.

Also determine type: "shipped" if deployed, "wip" otherwise.

Read session context for arc info. Use the same arc across all circles.

## 7. Show numbered preview

Show ALL versions with FULL content (no truncation):

```
vibecircle — Ready to share to N circles:

  1. Friends (casual)
     [headline]
     [full body]

  2. Eng Team (technical)
     [headline]
     [full body]

  3. Product (non-technical)
     [headline]
     [full body]

  [📸 Screenshot attached (or "No screenshot")]

Post: [all] · [1,2,3] · [skip] · [edit 2] · [📸 add screenshot]
```

Wait for user input:
- `all` → post to all circles
- `1,2` or `1,3` → post to specific circles by number
- `skip` → don't post
- `edit 2` → ask what to change for circle 2, update, re-show
- `📸` or `screenshot` → ask for file path

## 8. Post to selected circles

For each selected circle, run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
  --circle-id <circleId> \
  --type <type> \
  --body "<body for this circle>" \
  --headline "<headline for this circle>" \
  --arc-id "<arcId>" \
  --arc-title "<arcTitle>" \
  --arc-sequence <arcSequence>
```

Add `--screenshot <path>` if one was captured (same screenshot for all circles).

## 9. Confirm

Tell user which circles were posted to: "Shared to Friends, Eng Team!"

Update `~/.vibecircle/session.json` milestones.
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/commands/share.md
git commit -m "feat: multi-circle /share with per-audience ghost-writer and numbered preview"
```

---

## Task 6: Update Stop Hook — Multi-Circle Sentinel

**Files:**
- Modify: `packages/plugin/hooks/hooks.json`

- [ ] **Step 1: Update the Stop hook prompt**

Replace the Stop hook prompt in hooks.json. The prompt needs to:
1. Check config, detect repo, filter circles by repo
2. Score shareability
3. Apply per-circle filters
4. Generate per-circle content with tone
5. Show numbered preview
6. Post to selected circles

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js building"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js away"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "You are the vibecircle sentinel. Run: node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check\n\nIf not configured, return 'approve'.\nIf autoShare is false, return 'approve'.\n\nDetect current repo: git remote get-url origin (parse owner/repo).\nGet matching circles: node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles-for-repo <owner/repo>\n\nIf no matching circles, return 'approve'.\n\nEvaluate shareability: run git diff --stat && git status --short. Also consider conversation context.\n\nSuggest sharing if: new files created, 2+ files modified, feature/component/page built, deploy happened, or conversation involved substantial building.\nStay quiet if: only config/deps/lockfile, only reading/researching, Q&A with no code.\n\nIf not share-worthy, return 'approve'.\n\nFor each matching circle, apply its filter: 'everything' always qualifies, 'features-only' skips refactors/fixes, 'milestones-only' only shipped/deployed.\n\nFor each qualifying circle, write a headline and body using the circle's tone: casual (informal, short), technical (architecture, frameworks), non-technical (user-facing, no jargon), business-impact (outcomes, metrics).\n\nShow numbered preview with FULL content. Ask: Post: [all] [1,2,3] [skip] [edit N] [screenshot]\n\nFor selected circles, post via: node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js --circle-id <id> --type <type> --body \"<body>\" --headline \"<headline>\" --arc-id \"<id>\" --arc-title \"<title>\" --arc-sequence <n>\n\nAdd --screenshot <path> if captured.",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Note: timeout increased to 60s since multi-circle generation takes longer.

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/hooks/hooks.json
git commit -m "feat: multi-circle sentinel — per-audience tone, repo filtering, numbered preview"
```

---

## Task 7: Push and Test

- [ ] **Step 1: Push all changes**

```bash
cd /Users/alexanderhamilton/Coding/experiments/vibecircle
git push origin HEAD
```

- [ ] **Step 2: Test config migration**

If you have an existing `~/.vibecircle/config.json` with old format, run:
```bash
node packages/plugin/scripts/lib/config.js check
```
Should show the migrated circles array.

- [ ] **Step 3: Test /circle list**

Reload plugin and run `/circle list`. Should show your circles.

- [ ] **Step 4: Test /share with multiple circles**

Add a second circle via `/circle add`, then run `/share`. Should show numbered preview with different tones.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: multi-circle polish"
```
