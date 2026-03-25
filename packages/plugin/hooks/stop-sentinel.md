---
name: stop-sentinel
description: Detect share-worthy moments and draft posts for vibecircle
allowed-tools: Bash, Read, Write, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot
---

# Vibecircle Sentinel

After Claude finishes responding, evaluate whether something share-worthy happened. Be GENEROUS — it's better to suggest and let the user skip than to miss interesting moments. The user always has final say.

## 1. Quick checks

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js check`
If "not-configured", stop.

Run: `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/config.js get autoShare`
If "false", stop.

## 2. Should we suggest sharing?

Consider BOTH git activity AND conversation context. You don't need commits to share — if Claude just helped build something substantial, that's share-worthy.

**Suggest sharing if ANY of these are true:**
- New files were created (check `git status` for untracked files)
- 2+ files were modified (check `git diff --stat`)
- A feature, component, or page was built or significantly changed
- Something was deployed
- A meaningful bug was fixed
- The conversation involved building something the user would want to show others

**Stay quiet if ALL of these are true:**
- Only config/dependency/lockfile changes
- Only reading files or researching (no code written)
- The conversation was just Q&A with no implementation

Run `git diff --stat` and `git status --short` to check. But also consider what just happened in the conversation — you have that context.

## 3. Update session context

Read `~/.vibecircle/session.json` if it exists. If it doesn't, create it:

```json
{
  "sessionId": "<uuid>",
  "projectName": "<from package.json or git remote>",
  "projectDir": "<cwd>",
  "currentWork": "<what's being built>",
  "activeArc": null,
  "milestones": [],
  "startedAt": "<now>"
}
```

Update `currentWork` based on what just happened. If the work continues a previous arc, keep it. If it's clearly new work, create a new arc with a UUID and descriptive title.

If you decided NOT to suggest sharing, stop here after updating context.

## 4. Ghost-Writer — draft the post

Write:

1. **headline**: One line, plain English. A PM should understand it.
   - Good: "Built a settings page with dark mode toggle"
   - Bad: "Refactored SettingsProvider component tree"

2. **body**: 2-3 sentences about what was built and why it matters. Non-technical audience.

3. **type**: "shipped" if deployed, "wip" otherwise

## 5. Screenshot

Try to capture a screenshot, but don't block on it:

a. **If you know a URL from this session** (dev server, preview URL), use Playwright MCP to screenshot it.
b. **If not, try the production URL** from `~/.vibecircle/config.json` `apiUrl` field.
c. **If Playwright works**, save to `/tmp/vibecircle-screenshot-{timestamp}.jpeg`.
d. **If it fails or there's no good URL**, ask the user: "Want to attach a screenshot? Drop a file path or say 'skip'."

Don't spend more than one attempt on auto-screenshot. If it doesn't work, ask.

## 6. Show preview

```
vibecircle — Ready to share:

  **[headline]**
  [body]

  [📸 Screenshot attached (or "No screenshot") · Part of "[arcTitle]" (if applicable)]

Share? [Y]es · [E]dit · [S]kip · [📸 Add screenshot]
```

- **Y/yes**: Post it
- **E/edit**: Ask what to change, update, then post
- **S/skip/no**: Stop
- **📸/screenshot**: Ask for a file path, attach it, then post

## 7. Post

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/post-to-circle.js \
  --type <type> \
  --body "<body>" \
  --headline "<headline>" \
  --arc-id "<arcId>" \
  --arc-title "<arcTitle>" \
  --arc-sequence <arcSequence>
```

Add `--screenshot <path>` if one was captured.

Update `~/.vibecircle/session.json` milestones. Tell the user: "Shared to your circle!"
