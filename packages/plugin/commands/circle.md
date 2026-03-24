---
name: circle
description: See who's online in your vibecircle
allowed-tools: Bash
user-invocable: true
---

# /circle — See who's online

When the user invokes `/circle`, follow these steps:

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", tell the user how to set up:
  "Vibecircle isn't configured yet. Set it up with:
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js set apiUrl <your-vibecircle-url>`
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js set authToken <your-token>`
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js set circleId <your-circle-id>`"
Then stop.

## 2. Get the circle ID

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js get circleId`

Save the output as CIRCLE_ID.

## 3. Fetch presence data

Run: `node -e "
const api = require('${CLAUDE_PLUGIN_ROOT}/scripts/lib/api-client');
api.get('/api/circles/${CIRCLE_ID}/presence').then(data => {
  if (data) process.stdout.write(JSON.stringify(data, null, 2));
  else process.stdout.write('null');
}).catch(() => process.stdout.write('null'));
"`

Note: Replace ${CIRCLE_ID} with the actual value from step 2.

## 4. Display the results

Parse the JSON response and display it nicely:

**Format:**

```
Your Circle
===========

Building:
  - Alice (2 min ago)
  - Bob (5 min ago)

Online:
  - Charlie (12 min ago)

Away:
  - Dave (1 hour ago)

Recent Activity:
  - Alice shipped "New landing page" (10 min ago)
  - Bob is working on "Auth flow fixes"
```

Group members by status: building, online, away. Show recent activity if available.

If no members are found or the response is null, say: "Couldn't fetch circle data. Check your config with `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`"

## 5. Handle "invite" argument

If the user ran `/circle invite`, instead of the above, explain:

"To invite someone to your circle, share your circle's invite link. You can find it in the Vibecircle web app under your circle's settings, or ask a circle admin to generate one."
