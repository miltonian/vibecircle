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

Try to capture a screenshot of what the user is building. Use this priority order to find the right URL:

**a. Check conversation context first.** If a dev server was started earlier in this conversation, you already know the URL and port. Use that. Do NOT blindly scan ports — another project might be running on a common port.

**b. Check the current project's dev server.** If you don't know from context, detect the project's framework and find its process:
   - Run: `lsof -i -P -n | grep LISTEN | grep -E "node|bun|next" | grep "$(pwd)" 2>/dev/null` to find processes in the current directory
   - Or check `.next/` directory existence and read the dev log if available
   - Only use a localhost URL if you can confirm it belongs to THIS project

**c. Use the production URL.** Check `package.json` for a `homepage` field, or read `~/.vibecircle/config.json` for `apiUrl`. For vibecircle specifically, the production URL is `https://vibecircle.dev`. A production screenshot is better than screenshotting the wrong app.

**d. Screenshot with Playwright MCP.** Once you have a URL:
   - Call `mcp__plugin_playwright_playwright__browser_navigate` with the URL
   - Call `mcp__plugin_playwright_playwright__browser_take_screenshot` with `type: "jpeg"` and `filename: "/tmp/vibecircle-share-{timestamp}.jpeg"`
   - Save the output file path for step 6

**e. Skip if nothing works.** Screenshots are optional. Don't worry about it.

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
