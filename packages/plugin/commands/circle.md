---
name: circle
description: Manage your vibecircle circles — setup, status, add more
allowed-tools: Bash, Read, Write
user-invocable: true
---

# /circle — Manage your circles

## Determine the subcommand

- `/circle` or `/circle status` → Section 1
- `/circle setup` → Section 2
- `/circle add` → Section 3
- `/circle list` → Section 4
- `/circle remove <name>` → Section 5
- `/circle invite` → Section 6
- `/circle config <name>` → Section 7

## 1. Status (default)

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If not configured, say "Not set up yet. Run `/circle setup` — takes 10 seconds."

If configured, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles` and show the output nicely.

## 2. First-time setup

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If already configured, say "Already connected. Use `/circle add` to connect another circle."

If not configured:

a. Say: "Opening your browser to authorize..."
b. Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/device-auth.js`
c. That's it. The script handles everything — auth, circle name detection, config with defaults (casual tone, all repos, everything filter). It also syncs all circles you belong to automatically.
d. After it completes, say: "You're all set! Connected to all your circles. The plugin will suggest sharing as you build. Use `/share` anytime to share manually."

**Do NOT ask any questions.** No name, no tone, no repos, no filter. Defaults are fine. Users can customize later with `/circle config`.

After setup, suggest: "Tip: Each circle can have its own tone and filter — try `/circle config <name>` to set a technical tone for your eng team or milestones-only for execs."

## 3. Re-sync circles

Use this when you've joined new circles on the web and want the plugin to pick them up.

a. Say: "Re-syncing your circles..."
b. Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/device-auth.js`
c. After it completes, say: "Synced! Your existing circle settings (tone, filter, repos) are preserved. Any new circles were added with defaults — use `/circle config <name>` to customize."

**Do NOT ask questions during sync.** Defaults are applied to new circles. Existing circle customizations are preserved.

## 4. List circles

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js circles`

Format nicely:
```
Your circles:
  1. Mindshare (casual) — all repos, everything
  2. Eng Team (technical) — vibecircle, singlefile — everything
```

## 5. Remove a circle

```bash
node -e "
const { removeCircle } = require('${CLAUDE_PLUGIN_ROOT}/scripts/lib/config');
removeCircle('<name from args>');
console.log('Removed.');
"
```

## 6. Invite info

"Use the **Invite** button in the top bar on vibecircle.dev, or share your circle's invite link."

## 7. Configure a circle

The user ran `/circle config <name>`. Ask what they want to change:

- **Tone**: casual / technical / non-technical / business-impact
- **Filter**: everything / features-only / milestones-only
- **Repos**: all, or specific repos (owner/repo, comma-separated)

Only ask about the thing they want to change. Example: "What tone? (casual / technical / non-technical / business-impact)"

Then update:
```bash
node -e "
const { getConfig, saveConfig } = require('${CLAUDE_PLUGIN_ROOT}/scripts/lib/config');
const config = getConfig();
const circle = config.circles.find(c => c.name.toLowerCase() === '<name>'.toLowerCase());
if (circle) {
  circle.<field> = '<value>';
  saveConfig(config);
  console.log('Updated!');
} else {
  console.log('Circle not found. Run /circle list to see your circles.');
}
"
```
