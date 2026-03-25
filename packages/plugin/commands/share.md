---
name: share
description: Share what you're building with your vibecircle
allowed-tools: Bash, Read, Write, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot
user-invocable: true
---

# /share — Share what you're building

When the user invokes `/share`, follow these steps:

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", tell the user how to set up and stop.

## 2. Read session context

Read `~/.vibecircle/session.json` if it exists. This gives you context about the current project, active arc, and what's been shared already.

## 3. Capture a screenshot

Try to capture a screenshot of what the user is building:

a. Check if a dev server is running by trying `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` (also try ports 3001, 5173, 8080). If any returns 200, use that URL.
b. If no dev server, check for a Vercel deploy URL by running `vercel ls --json 2>/dev/null | head -1` and extracting the URL. Or check for a known production URL in the project's package.json homepage field.
c. If you found a URL, use Playwright MCP to screenshot it:
   - Call `mcp__plugin_playwright_playwright__browser_navigate` with the URL
   - Call `mcp__plugin_playwright_playwright__browser_take_screenshot` with `type: "jpeg"` and `filename: "/tmp/vibecircle-share-{timestamp}.jpeg"`
   - Save the output file path for step 6
d. If no URL found or Playwright fails, skip the screenshot — it's optional. Don't worry about it.

## 4. Generate the post draft

Based on the conversation context, recent git activity (`git diff --stat HEAD~3`, `git log --oneline -5`), and session context, write:

- **headline**: One line, plain English, no jargon. Anyone should understand it.
- **body**: 2-3 sentences describing what was built and why it matters. Write for a non-technical audience.
- **type**: Ask the user — "shipped" or "wip" (default wip)

If there's an active arc in session.json that matches the current work, use it. Otherwise, create a new arc with a descriptive title.

## 5. Show preview

Show the user:

```
Ready to share:

  **[headline]**
  [body]

  Type: [shipped/wip] · [📸 Screenshot if captured] · [Arc: "title" if applicable]

Look good? You can edit the headline or description, change the type, or just say "send it".
```

## 6. Post to the circle

After the user approves (or edits), run:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js --type <type> --body "<body>" --headline "<headline>" --arc-id "<arcId>" --arc-title "<arcTitle>" --arc-sequence <arcSequence>
```

Add `--screenshot <path>` if a screenshot was captured.

## 7. Confirm

If successful, tell the user: "Shared to your circle!"

Update `~/.vibecircle/session.json` milestones with the headline.
