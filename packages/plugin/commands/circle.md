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
