# Multi-Circle Plugin Support

**Status:** Not started
**Date:** 2026-03-27

## Problem

The database and web app already support users belonging to multiple circles (via `circleMembers` composite key). But the Claude Code plugin only works with one circle at a time — it stores a single `circleId` in `~/.vibecircle/config.json`. To share to a different circle, users must re-run `/circle setup`, which overwrites the config.

## Goal

Let users share to any circle they belong to without reconfiguring the plugin.

## Current State

- **Config** (`packages/plugin/scripts/lib/config.js`): stores `{ apiUrl, authToken, circleId, autoShare }` — single circleId
- **`/share` command** (`packages/plugin/commands/share.md`): posts to `config.circleId` via `scripts/post-to-circle.js` — no circle selection
- **`/circle` command** (`packages/plugin/commands/circle.md`): shows presence for `config.circleId` only
- **Device auth** (`apps/web/src/app/(auth)/setup/device/device-authorize.tsx`): user picks one circle during setup, stored in deviceCode table
- **Backend**: `getUserCircles(userId)` in `apps/web/src/lib/db/queries.ts` already returns all circles for a user

## Desired Behavior

### Per-repo circle config
- The circle should be set per-repo, not globally. This way each project automatically shares to the right circle without specifying it each time.
- Store `circleId` in the local `.claude` plugin settings for the repo (e.g., `.claude/plugins/vibecircle/settings.json` or equivalent local plugin config)
- Global `~/.vibecircle/config.json` keeps auth credentials only (`apiUrl`, `authToken`)
- `/circle setup` sets the circle for the current repo

### `/share`
- Default: share to the circle configured for this repo
- If no repo-level circle is set: prompt user to pick one (and save it)
- Optional `--circle "Circle Name"` flag to override for a single share

### `/circle`
- Show all circles the user belongs to, not just the configured one
- `/circle` with no args: list circles with member counts and presence summary, highlight the one configured for this repo
- `/circle set "Circle Name"`: set the circle for the current repo

### Auth
- Auth token should work across all circles the user belongs to (it already does — the API checks membership per-request)
- Device auth flow should return all user circles so the plugin can offer a picker

## Key Files to Modify

| File | Change |
|---|---|
| `packages/plugin/scripts/lib/config.js` | Split into global auth config + per-repo circle config |
| `packages/plugin/commands/share.md` | Read circle from repo config, add `--circle` override |
| `packages/plugin/commands/circle.md` | Show all circles, add `set` subcommand for repo config |
| `packages/plugin/scripts/post-to-circle.js` | Accept circleId parameter instead of always using global config |
| `apps/web/src/app/api/auth/device-code/[code]/route.ts` | Return all user circles on auth, not just selected one |

## Out of Scope

- Web app changes (already supports multi-circle)
- New API endpoints (existing ones are sufficient)
- Circle creation from the plugin
