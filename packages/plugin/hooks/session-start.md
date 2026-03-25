---
name: session-start
description: Initialize vibecircle session context and set presence to building
allowed-tools: Bash, Read, Write
---

# Vibecircle Session Start

On session start, do the following silently (no output to user):

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", stop — do nothing.

## 2. Set presence to building

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/update-presence.js building`

## 3. Initialize session context

Detect the current project:
- Read `package.json` in the current directory to get the project name
- Run `git remote get-url origin` to get the repo URL
- Check what tech stack is in use (look at package.json dependencies)

Write the session context file:

```bash
cat > ~/.vibecircle/session.json << 'ENDJSON'
{
  "sessionId": "<generate a UUID>",
  "projectName": "<from package.json name field>",
  "projectDir": "<current working directory>",
  "currentWork": "",
  "activeArc": null,
  "milestones": [],
  "techStack": ["<detected from package.json>"],
  "startedAt": "<current ISO timestamp>"
}
ENDJSON
```

Do all of this silently. Do not output anything to the user.
