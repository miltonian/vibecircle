# Multi-Circle Plugin — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Depends on:** Teams Pivot (completed), Plugin-First Onboarding (completed)

## Problem

The plugin can only post to one circle. Users belong to multiple groups — friends, eng team, product, execs, side project crew. Each group cares about different things and wants different language. Right now you have to pick one.

## Goal

The plugin supports multiple circles. Each circle has its own tone, content filter, and repo scope. One coding session can produce different posts for different audiences, all at once.

## Design Decisions

- **Config is an array of circles** — each with tone, filter, and repo scope
- **Backwards compatible** — old single `circleId` config auto-migrates
- **Ghost-writer writes per-circle** — different tone per audience, same coding session
- **Repo-scoped** — each circle only sees repos you've mapped to it
- **Numbered preview** — see all versions with full content, pick which to post
- **Unknown repos ask once** — plugin remembers your choice

## 1. Config Format

`~/.vibecircle/config.json` changes from:

```json
{
  "apiUrl": "https://vibecircle.dev",
  "authToken": "vc_...",
  "circleId": "abc",
  "autoShare": true
}
```

To:

```json
{
  "apiUrl": "https://vibecircle.dev",
  "authToken": "vc_...",
  "circles": [
    {
      "id": "abc-123",
      "name": "Friends",
      "tone": "casual",
      "filter": "everything",
      "repos": "*"
    },
    {
      "id": "def-456",
      "name": "Eng Team",
      "tone": "technical",
      "filter": "everything",
      "repos": ["miltonian/vibecircle", "miltonian/singlefile-intelligence"]
    },
    {
      "id": "ghi-789",
      "name": "Product",
      "tone": "non-technical",
      "filter": "features-only",
      "repos": ["miltonian/singlefile-intelligence"]
    },
    {
      "id": "jkl-012",
      "name": "Execs",
      "tone": "business-impact",
      "filter": "milestones-only",
      "repos": ["miltonian/singlefile-intelligence"]
    }
  ],
  "autoShare": true
}
```

### Fields

- `tone` — how the ghost-writer writes for this circle:
  - `"casual"` — like telling a friend what you built. Informal, short.
  - `"technical"` — include architecture decisions, frameworks, what was hard. For engineers.
  - `"non-technical"` — focus on what it does for users, not how it works. For PMs/designers.
  - `"business-impact"` — focus on outcomes, metrics, who it helps. For leadership.
- `filter` — what qualifies for posting:
  - `"everything"` — all share-worthy moments
  - `"features-only"` — skip refactors, bug fixes, config changes
  - `"milestones-only"` — only shipped/deployed things
- `repos` — which repos post to this circle:
  - `"*"` — all repos
  - `["owner/repo", ...]` — only matching repos

### Backwards Compatibility

If the config has a `circleId` string (old format), auto-migrate on first run:
- Move `circleId` into `circles` array with `name: "My Circle"`, `tone: "casual"`, `filter: "everything"`, `repos: "*"`
- Remove old `circleId` key
- Write back to config file

## 2. Sentinel Flow

1. Check config, check `autoShare`
2. Detect current repo: `git remote get-url origin` → parse `owner/repo`
3. Filter `circles` to those whose `repos` matches this repo (or is `"*"`)
4. If no matching circles → stop silently
5. Score shareability (same criteria as current sentinel)
6. For each matching circle, apply its `filter`:
   - `"everything"` → always qualifies
   - `"features-only"` → only if new files in components/pages/app, or significant feature work
   - `"milestones-only"` → only if a deploy happened or something was explicitly shipped
7. Remove circles that don't qualify after filtering
8. If no circles remain → stop silently
9. For each qualifying circle, ghost-writer generates a version with that circle's `tone`
10. Show numbered preview (see section 4)
11. User picks which to post
12. Post to each selected circle

## 3. Ghost-Writer Tone Prompts

The ghost-writer receives a tone instruction per circle. It writes the same underlying content but adapts language and focus:

- **casual**: "Write like you're telling a friend what you built. Informal, enthusiastic, use natural language. Keep it short."
- **technical**: "Include technical details — frameworks, architecture decisions, tradeoffs, what was challenging. Written for engineers who understand code."
- **non-technical**: "Write so a product manager or designer understands it. Focus on what it does for users, not how it's implemented. No jargon."
- **business-impact**: "Focus on business outcomes — what problem this solves, who benefits, what metrics it could improve. Written for leadership who care about impact, not implementation."

The headline and body are both adapted. The same coding session that produces "Refactored auth middleware for better session handling" (technical) also produces "Login is now faster and more reliable" (non-technical) and "Improved security posture and reduced authentication latency" (business-impact).

## 4. Approval Flow

Show all versions numbered with full content (no truncation):

```
vibecircle — Ready to share to 4 circles:

  1. Friends (casual)
     Built vibecircle's multi-circle support
     You can now post to different groups with different vibes. Each circle
     gets its own version of what you built, written in a tone that fits.

  2. Eng Team (technical)
     Multi-circle plugin with per-audience ghost-writer and repo filtering
     Plugin config now supports N circles, each with tone/filter/repo scope.
     Sentinel evaluates shareability per circle. Ghost-writer adapts output
     per audience. Posts in parallel to selected circles.

  3. Product (non-technical)
     Teams can now follow work across different groups
     Each team or friend group gets updates written specifically for them.
     Engineering sees technical details, product sees features, leadership
     sees business impact. Same work, different perspectives.

  4. Execs (business impact)
     Audience-specific project visibility across teams
     Teams get tailored progress updates without manual status reporting.
     Reduces standup overhead and improves cross-functional awareness.

Post: [all] · [1,2,3] · [skip] · [edit 2]
```

- `all` — post to all circles
- `1,2,3` — post to specific circles by number
- `skip` — don't post to any
- `edit 2` — revise circle 2's headline/description, then re-show

## 5. Setup Commands

### `/circle setup` (existing, updated)

If no circles configured:
1. Run device auth (same as now)
2. After auth, ask: "What's this circle called?" (user types name)
3. Ask: "What tone? (casual / technical / non-technical / business-impact)"
4. Ask: "What repos should post here? (all, or list like owner/repo, owner/repo)"
5. Ask: "What filter? (everything / features-only / milestones-only)"
6. Save to config as first circle

If circles already configured:
- Show current circles and say "Use `/circle add` to connect another circle"

### `/circle add` (new)

1. Run device auth for the new circle
2. Same questions as setup (name, tone, repos, filter)
3. Append to `circles` array

### `/circle list` (new)

Show all connected circles:
```
Your circles:
  1. Friends (casual) — all repos, everything
  2. Eng Team (technical) — vibecircle, singlefile — everything
  3. Product (non-technical) — singlefile — features only
  4. Execs (business-impact) — singlefile — milestones only
```

### `/circle remove <name>` (new)

Remove a circle by name from the config.

## 6. Unknown Repo Handling

If the sentinel fires in a repo not mapped to any circle:
1. Show: "This repo ({owner/repo}) isn't mapped to any circle yet."
2. Show numbered list of circles: "Post to: [1. Friends] [2. Eng Team] ... [none]"
3. If user picks circles, ask: "Remember this for next time? (Y/n)"
4. If yes, add the repo to those circles' `repos` arrays in config

## 7. What Changes

### Plugin files:
- `scripts/lib/config.js` — support `circles` array, backwards compat migration, `getCirclesForRepo()` helper
- `scripts/post-to-circle.js` — accept `--circle-id` parameter (called once per selected circle)
- `hooks/hooks.json` — Stop hook prompt updated for multi-circle sentinel
- `commands/share.md` — multi-circle ghost-writer + numbered preview
- `commands/circle.md` — add `add`, `list`, `remove` subcommands
- `scripts/device-auth.js` — after auth, return to caller so setup can ask follow-up questions (name, tone, repos, filter)

### Web (nothing):
- No schema changes
- No API changes
- No UI changes
- Posts already have `circleId` — each post just goes to a different circle
- Device auth already works for joining any circle

## 8. What Doesn't Change

- Database schema
- Feed UI (each circle shows its own posts)
- API endpoints (post creation already accepts circleId)
- Auth system (one token works for all circles)
- Session context / arc tracking (arcs are per-session, not per-circle)
- Presence system
