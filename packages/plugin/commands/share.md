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

## 3. Resolve arc context

This is critical — every post should belong to an arc.

**Step 3a: Check local cache**
Read `~/.vibecircle/arc-map.json` if it exists. Look for the current branch name as a key.
- If found and `resolvedAt` is less than 24 hours old → use the cached `arcId` and `arcTitle`. Skip to step 4.

**Step 3b: Parse branch for ticket ID**
Get the current branch: `git branch --show-current`
Look for ticket ID patterns: `PAY-123`, `PROJ-123`, `#123`, `feat/PAY-123-description`, etc.

**Step 3c: Look up ticket → epic**
If a ticket ID is found, try to resolve it:
- **Linear MCP:** Get the issue, find its parent project/cycle
- **GitHub CLI:** `gh issue view <number> --json title,projectItems`
- **Jira MCP:** Get the issue, find its parent epic
- If none are available, skip to step 3e.

**Step 3d: Match or create arc**
Read the API URL from config (`~/.vibecircle/config.json` → `apiUrl`) and the auth token (`authToken`).

Check existing arcs:
```
curl -s -H "Authorization: Bearer <authToken>" <apiUrl>/api/circles/<circleId>/arcs
```

If an arc exists with a matching epicRef (same source and id), use it.

If no match, create one:
```
curl -s -X POST -H "Authorization: Bearer <authToken>" -H "Content-Type: application/json" \
  -d '{"title":"<epic name>","epicRef":{"source":"<linear|jira|github>","id":"<epicId>","url":"<epicUrl>"}}' \
  <apiUrl>/api/circles/<circleId>/arcs
```

Use the returned arc ID.

**Step 3e: Fallback (no ticket found)**
Auto-generate an arc name from git context (repo name, branch name, nature of changes).
Tell the user: "I couldn't find a ticket for this branch. I'm calling this arc **<name>**. Want to attach it to an existing arc instead?"
List active arcs as numbered options. User picks or accepts.

**Step 3f: Determine sequence**
Count posts in this arc (from the arcs list response → `postCount`) and set sequence to `postCount + 1`.

**Step 3g: Update local cache**
Write the branch→arc mapping to `~/.vibecircle/arc-map.json`:
```json
{
  "<branch-name>": {
    "arcId": "<uuid>",
    "arcTitle": "<title>",
    "lastSequence": <n>,
    "resolvedAt": "<ISO timestamp>"
  }
}
```

## 4. Capture a screenshot

Try to capture a screenshot:
a. Check conversation context for dev server URL
b. Detect via `lsof` for this project
c. Use production URL from config `apiUrl`
d. Screenshot with Playwright MCP
e. If nothing works, ask: "Want to attach a screenshot? Drop a file path or say 'skip'."

## 5. Gather ticket metadata (if available)

If you resolved a ticket in step 3c, gather:
- **ticket**: source, id, title, url, status
- **epicProgress**: total tickets in epic, done count, in-progress count

These will be passed as flags to post-to-circle.js.

## 6. Apply filters

For each matching circle, check its `filter`:
- `"everything"` → always qualifies
- `"features-only"` → check if this is feature work. If unsure, include it.
- `"milestones-only"` → check if this was deployed/shipped. If not, skip this circle.

Remove circles that don't qualify.

## 7. Generate per-circle posts

For each qualifying circle, write a headline and body using the circle's `tone`:

- `"casual"` — write like telling a friend. Informal, enthusiastic, short.
- `"technical"` — include frameworks, architecture, tradeoffs. For engineers.
- `"non-technical"` — focus on what it does for users. For PMs/designers.
- `"business-impact"` — focus on outcomes, metrics, who benefits. For leadership.

**Write the body in markdown.** Use bold, bullet lists, `code`, blockquotes. Keep paragraphs short.

Also determine type: "shipped" if deployed, "wip" otherwise.

Use the same arc across all circles.

## 8. Show numbered preview

Show ALL versions with FULL content (no truncation):

```
vibecircle — Ready to share to N circles:

  Arc: <arc title> (Nth update)

  1. Friends (casual)
     [headline]
     [full body]

  2. Eng Team (technical)
     [headline]
     [full body]

  [📸 Screenshot attached (or "No screenshot")]

Post: [all] · [1,2,3] · [skip] · [edit 2] · [📸 add screenshot] · [🚀 ship arc]
```

Wait for user input:
- `all` → post to all circles
- `1,2` or `1,3` → post to specific circles by number
- `skip` → don't post
- `edit 2` → ask what to change for circle 2, update, re-show
- `📸` or `screenshot` → ask for file path
- `ship` or `🚀` → mark this as the final post, set arc to shipped after posting

## 9. Post to selected circles

For each selected circle, run:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
  --circle-id <circleId> \
  --type <type> \
  --body "<body for this circle>" \
  --headline "<headline for this circle>" \
  --arc-id "<arcId>" \
  --arc-title "<arcTitle>" \
  --arc-sequence <arcSequence> \
  --ticket-source "<source>" \
  --ticket-id "<ticketId>" \
  --ticket-title "<ticketTitle>" \
  --ticket-url "<ticketUrl>" \
  --ticket-status "<ticketStatus>" \
  --epic-total <total> \
  --epic-done <done> \
  --epic-in-progress <inProgress>
```

Add `--screenshot <path>` if one was captured. Omit ticket/epic flags if not available.

## 10. Ship arc (if requested)

If user chose "ship":
```
curl -s -X PATCH -H "Authorization: Bearer <authToken>" -H "Content-Type: application/json" \
  -d '{"status":"shipped"}' \
  <apiUrl>/api/circles/<circleId>/arcs/<arcId>
```

## 11. Confirm

Tell user which circles were posted to: "Shared to Friends, Eng Team!"
If arc was shipped: "🚀 Arc '<arc title>' marked as shipped!"

Update the local arc-map cache with the new sequence number.
