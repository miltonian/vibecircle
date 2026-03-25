---
name: session-end
description: Clear vibecircle session and set presence to away
allowed-tools: Bash
---

# Vibecircle Session End

On session end, do the following silently:

## 1. Set presence to away

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js away`

## 2. Clear session context

Run: `rm -f ~/.vibecircle/session.json`

Do not output anything to the user.
