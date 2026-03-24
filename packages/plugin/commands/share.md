---
name: share
description: Share what you're building with your vibecircle
allowed-tools: Bash, Read
user-invocable: true
---

# /share — Share what you're building

When the user invokes `/share`, follow these steps:

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

- If output starts with "not-configured", tell the user:
  "Vibecircle isn't configured yet. Set it up with:
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js set apiUrl <your-vibecircle-url>`
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js set authToken <your-token>`
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js set circleId <your-circle-id>`"
  Then stop.

## 2. Try to capture a screenshot

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/capture-screenshot.js`

Save the output (a file path or empty string) for later. Don't worry if it's empty — screenshots are optional.

## 3. Ask the user what to share

Ask: "What are you sharing? (type: **shipped** or **wip**) And add a note about what you're building:"

Wait for the user to respond with:
- A type (shipped or wip, default to wip if not specified)
- A message/note about what they built

## 4. Post to the circle

Build the command based on the user's response:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js --type <type> --body "<user's message>"
```

If a screenshot was captured (non-empty path from step 2), add: `--screenshot <path>`

Run the command.

## 5. Confirm

If the command output includes a checkmark, tell the user: "Shared to your circle!"

If it failed, show the error and suggest checking their config with `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`.
