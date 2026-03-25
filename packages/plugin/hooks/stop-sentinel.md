---
name: stop-sentinel
description: Detect share-worthy moments and draft posts for vibecircle
allowed-tools: Bash, Read, Write, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot
---

# Vibecircle Sentinel

After Claude finishes responding, silently evaluate whether something share-worthy happened. Do NOT output anything to the user unless you decide to propose sharing.

## 1. Check configuration

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`

If output starts with "not-configured", stop immediately.

## 2. Check if autoShare is enabled

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js get autoShare`

If output is "false", stop.

## 3. Read session context

Read `~/.vibecircle/session.json` if it exists. If it doesn't exist, stop.

## 4. Analyze recent activity

Run `git diff --stat HEAD~3` and `git log --oneline -5` to see what changed recently.

Score the shareability:
- **High**: New files in `components/`, `pages/`, `app/` directories (UI work), OR `vercel deploy` or deploy-related activity, OR a significant new feature (5+ files across multiple directories)
- **Medium**: Several files changed but mostly in one area, OR test files added
- **Low**: Config changes, dependency updates, small fixes
- **Skip**: No git changes, or only `.lock` files / `.env` changes

If score is Low or Skip, silently update the session context (step 5) and stop.

## 5. Update session context

Read the current `~/.vibecircle/session.json`. Update:
- `currentWork`: Brief description of what's being built based on recent git activity and conversation context
- `activeArc`: If the work is a continuation of the same feature, keep the existing arc. If it's clearly new work, create a new arc with a new UUID and descriptive title.
- Increment `activeArc.sequence` if continuing an arc.

Write the updated file back.

If score was Low or Skip, stop here.

## 6. Ghost-Writer — draft the post

Based on the git diff, session context, and conversation context, write:

1. **headline**: One line, plain English, no jargon. A PM should understand it.
   - Good: "Built a settings page with dark mode toggle"
   - Bad: "Refactored SettingsProvider component tree"

2. **body**: 2-3 sentences describing what was built and why it matters. Write for a non-technical audience.
   - Good: "Users can now customize their experience — toggle dark mode, set notification frequency, and manage connected accounts. Includes automatic system preference detection."
   - Bad: "Added DarkModeContext with useMediaQuery hook for prefers-color-scheme detection."

3. **type**: "shipped" if a deploy happened, "wip" otherwise

4. **media**: If UI work was detected (files changed in components/, pages/, app/ directories), capture a screenshot:

   **Screenshot strategy** (try in order):
   a. Check if a dev server is running by trying `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` (also try ports 3001, 5173, 8080). If any returns 200, use that URL.
   b. If no dev server, check for a Vercel deploy URL by running `vercel ls --json 2>/dev/null | head -1` and extracting the URL.
   c. If you found a URL, use Playwright MCP to screenshot it:
      - Call `mcp__plugin_playwright_playwright__browser_navigate` with the URL
      - Call `mcp__plugin_playwright_playwright__browser_take_screenshot` with `type: "jpeg"` and `filename: "/tmp/vibecircle-screenshot-{timestamp}.jpeg"`
      - Save the output file path
   d. If no URL found or Playwright fails, skip the screenshot — it's optional.

## 7. Show preview and ask for approval

Show the user a preview:

```
vibecircle — Ready to share:

  **[headline]**
  [body]

  [📸 Screenshot attached · Part of "[arcTitle]"]

Share this? [Y]es · [E]dit · [S]kip
```

Wait for the user's response:
- **Y/yes**: Post it (step 8)
- **E/edit**: Ask what they'd like to change, update the headline/body, then post
- **S/skip/no**: Add to milestones as "skipped", stop

## 8. Post to circle

Run:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
  --type <type> \
  --body "<body>" \
  --headline "<headline>" \
  --arc-id "<arcId>" \
  --arc-title "<arcTitle>" \
  --arc-sequence <arcSequence>
```

If a screenshot was captured, add: `--screenshot <path>`

If successful, add the headline to `milestones` in session.json.

Tell the user: "Shared to your circle!"
