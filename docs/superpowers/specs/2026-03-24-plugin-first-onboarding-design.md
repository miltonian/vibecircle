# Plugin-First Onboarding — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Depends on:** Teams Pivot (completed)

## Problem

After signing up, users land on an empty feed with no guidance on how to populate it. The Claude Code plugin is the engine that drives all content, but it's not mentioned during onboarding. Users have to discover the plugin setup on their own.

## Goal

Make plugin installation the centerpiece of onboarding. Every new user should arrive at "plugin installed and running" as fast as possible. The empty feed should never be the first thing someone sees.

## Design Decisions

- **Two onboarding paths** — circle creators get a full-screen plugin setup flow; invited members get the feed with a prominent install banner
- **Plugin detection** — check if user has an `api_tokens` row. No token = show setup. Token exists = plugin installed.
- **3-step guided flow** for creators: Circle created → Install plugin → Invite team
- **All users are Claude Code users** — no need to explain what a plugin is

## 1. Circle Creator Path: Full-Screen Plugin Setup

When a user creates a circle and would normally land on an empty feed, they instead see a full-screen plugin setup page.

### Flow

1. User creates circle (existing `/new-circle` page)
2. Instead of redirecting to `/${circleId}` (empty feed), redirect to `/${circleId}/setup`
3. Full-screen setup with 3-step progress bar:
   - ✓ Circle created
   - **Install plugin** (current step)
   - Invite team
4. Two copy-paste command blocks:
   - Step 1: `/plugin marketplace add miltonian/vibecircle` then `/plugin install vibecircle`
   - Step 2: `/circle setup` (runs device code auth, opens browser, auto-configures)
5. Pulsing "Waiting for plugin to connect..." indicator
6. The page polls `GET /api/settings/token` to detect when a token is created
7. When token detected → auto-transitions to Step 3 (Invite team)
8. Invite step shows the circle invite link with copy button
9. "Go to your feed →" button
10. "Skip for now" link at the bottom (goes to empty feed)

### Detection Endpoint

`GET /api/settings/token` already exists and returns the user's tokens. The setup page polls this every 3 seconds. When the response includes at least one token, the plugin is connected.

## 2. Invited Member Path: Feed + Banner

When a user joins via invite link and lands on the circle feed, they see a banner above the feed.

### Banner Design

- Prominent but not blocking — sits above the feed posts
- Headline: "Start sharing what you build"
- Subtext: "Install the Claude Code plugin and your coding sessions auto-generate updates for the team."
- Shows the install command: `/plugin marketplace add miltonian/vibecircle`
- Copy button
- Dismiss (×) button — but banner returns on next visit until plugin is detected
- Banner disappears permanently once user has an `api_tokens` row

### Detection

Same as creator path — check `api_tokens` existence. The feed page fetches this on load to determine whether to show the banner.

## 3. Empty Feed State Update

The current empty state says "No posts yet — Start building and share with `/share`". This should change based on plugin status:

- **No plugin installed**: "Install the Claude Code plugin to start sharing" with install commands
- **Plugin installed, no posts**: "You're all set! Start building something and the plugin will suggest sharing."

## 4. New API Endpoint

### `GET /api/settings/token/check`

Lightweight endpoint that returns `{ hasToken: boolean }` for the current authenticated user. Used by the setup page polling and the feed banner. Avoids returning full token data when we just need a boolean.

## 5. Changes to Existing Pages

### `/new-circle` page
After successful circle creation, redirect to `/${circleId}/setup` instead of `/${circleId}`.

### `/${circleId}` (feed page)
- On load, check if user has a plugin token
- If no token and user joined via invite (not creator): show install banner
- If no token and user is creator: redirect to `/${circleId}/setup` (in case they skipped)
- If token exists: normal feed, no banner

### Feed empty state
Update based on plugin detection (see section 3).

## 6. New Pages

### `/${circleId}/setup`
Full-screen plugin setup page. Only shown to users without a plugin token. If user already has a token, redirect to `/${circleId}`.

Three steps:
1. Circle created (checkmark)
2. Install plugin (commands + polling)
3. Invite team (invite link)

## 7. Plugin Install Commands (Verified)

The correct commands, in order:
```
/plugin marketplace add miltonian/vibecircle
/plugin install vibecircle
/circle setup
```

Step 1-2 install the plugin. Step 3 runs device code auth (opens browser, user authorizes, plugin auto-configures `~/.vibecircle/config.json`).

## 8. What's NOT Changing

- Plugin code (hooks, scripts, commands) — already built
- Device code auth flow — already works
- Login page — unchanged
- Landing page — unchanged
- Circle creation form — unchanged (just the redirect after)
- API token generation — already exists
