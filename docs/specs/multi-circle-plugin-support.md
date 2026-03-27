# Multi-Circle Plugin Support

**Status:** Complete
**Date:** 2026-03-27

## Summary

The plugin supports sharing to multiple circles with per-circle tone, filter, and repo settings. Each circle in `~/.vibecircle/config.json` has its own configuration, and `/share` generates tailored content for each matching circle.

## What was fixed

### Presence updates (bug)
`update-presence.js` referenced the legacy `config.circleId` field which no longer exists after migration to `circles[]`. Fixed to iterate all circles and update presence for each via `Promise.allSettled`.

### Device auth circle sync
`device-auth.js` only added the single circle selected during browser auth. Now syncs all circles the user belongs to after authorization, without overwriting existing circle customizations.

### API auth for circle list
`GET /api/circles` only supported session auth (browser). Added Bearer token auth via `getAuthUserId()` so the plugin can fetch the user's circle list.

## Architecture

Config stores an array of circles, each scoped to repos:

```json
{
  "apiUrl": "https://vibecircle.dev",
  "authToken": "vc_...",
  "circles": [
    { "id": "uuid", "name": "Friends", "tone": "casual", "filter": "everything", "repos": "*" },
    { "id": "uuid", "name": "Eng Team", "tone": "technical", "filter": "features-only", "repos": ["org/repo"] }
  ]
}
```

`/share` matches circles to the current repo, generates per-circle content with appropriate tone, and lets the user pick which circles to post to.
