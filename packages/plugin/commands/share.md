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
