# Arc Persistence & Ticket Integration Design Spec

## Problem

Arcs today are fragile — three fields on the posts table (`arcId`, `arcTitle`, `arcSequence`) with no first-class entity, no lifecycle, and no connection to how teams actually track work. Arc continuity across sessions depends on Claude correctly recognizing "this is the same work as last time." Teams using Linear, Jira, or GitHub Issues have no bridge between their ticket system and the vibecircle feed.

## Goal

Make arcs durable, ticket-aware, and useful as a project dashboard — so the feed tells the story of building a feature from start to ship, with real progress data from the team's ticketing system.

## Key Decisions

- **Arcs = epics/projects**, not individual tickets. An arc like "Payment Integration" spans weeks and covers many tickets.
- **No server-side ticket integration.** The plugin leverages Claude's session context (MCP tools, `gh` CLI, branch names) to resolve ticket/epic data. Zero API keys, zero OAuth flows.
- **Ticket data travels with posts** as metadata snapshots. The server stores but never fetches ticket data itself.
- **Arc lifecycle is user-controlled.** Users mark arcs as "shipped" explicitly — no auto-close from ticket systems.
- **Feed shows rich context** — arc name, linked tickets, epic progress, ticket statuses.

---

## Architecture

### Data Split: Plugin vs Server

| Data | Where | Why |
|------|-------|-----|
| Branch-to-arc mapping | Plugin (local cache `~/.vibecircle/arc-map.json`) | Per-user, speeds up session start |
| Ticket resolution logic | Plugin (Claude figures it out in-session) | Uses whatever tools the session has |
| Arc identity (id, title, status) | Server DB (`arcs` table) | Everyone in the circle needs to see and query arcs |
| Arc lifecycle (active/shipped) | Server DB (`arcs` table) | Visible to the whole circle |
| Epic reference (source, ID, URL) | Server DB (`arcs` table, `epicRef` jsonb) | Feed can link out to Linear/Jira/GitHub |
| Ticket snapshot (progress, statuses) | Post `metadata` jsonb field | Plugin sends it at post time, server stores it |

---

## Database Changes

### New `arcs` Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | text (UUID) | Primary key |
| `circleId` | text | Foreign key to circles |
| `title` | text, not null | Arc name — matches epic/project name when available |
| `status` | text, not null, default `'active'` | `active` or `shipped` |
| `epicRef` | jsonb, nullable | `{source: "linear"\|"jira"\|"github", id: string, url: string}` |
| `createdBy` | text | User ID of the person who created the arc |
| `createdAt` | timestamp, default now | When the arc was created |
| `shippedAt` | timestamp, nullable | When marked shipped |

### Posts Table Changes

- `arcId` becomes a foreign key to `arcs.id` (currently just a text field)
- `arcTitle` is **dropped** — it now lives on the arc entity
- `arcSequence` stays on posts (position within the arc)

### Migration

Existing posts with `arcTitle` are migrated:
1. For each distinct `(circleId, arcTitle)` pair, create an `arcs` row
2. Set each post's `arcId` to the new arc's ID
3. `arcTitle` column is dropped later (step 7 of migration plan) after all code is updated

---

## Post Metadata Enrichment

Each post's existing `metadata` jsonb field gains two optional keys:

```json
{
  "ticket": {
    "source": "linear",
    "id": "PAY-123",
    "title": "Add OAuth flow for Stripe",
    "url": "https://linear.app/team/PAY-123",
    "status": "in_progress"
  },
  "epicProgress": {
    "total": 8,
    "done": 3,
    "inProgress": 2
  }
}
```

- `ticket` — the specific ticket this post's work relates to. Nullable (not every post maps to a ticket).
- `epicProgress` — snapshot of the epic/project progress at post time. Active arcs always have a recent snapshot because new posts refresh it.

The feed displays the `epicProgress` from the most recent post in an arc for the "X of Y tickets done" progress bar.

---

## Plugin Arc Resolution

### Resolution Chain

When Claude prepares a post (via `/share` or auto-suggest from `detect-activity.js`), it resolves the arc:

1. **Check local cache** (`~/.vibecircle/arc-map.json`) for a branch-to-arc mapping. If found and fresh (< 24 hours), use it.
2. **Parse branch name** for ticket ID patterns: `PAY-123`, `PROJ-123`, `#123`, `feature/PAY-123-description`, etc.
3. **Look up the ticket** using whatever's available in the session:
   - Linear MCP server → `linear.getIssue()`
   - Jira MCP server → `jira.getIssue()`
   - GitHub CLI → `gh issue view 123`
   - GitHub MCP server → `github.getIssue()`
4. **Find the parent epic/project** from the ticket response.
5. **Check existing arcs** via `GET /api/circles/{circleId}/arcs` and match by `epicRef` (source + id).
6. **If match found** → use that arc ID, determine next sequence number.
7. **If no match** → create a new arc with the epic/project name as title and the epicRef populated.

### Fallback (No Ticket Found)

When the branch has no ticket reference or no MCP tools are available:

1. Claude auto-generates an arc name from git context (repo name, nature of changes, branch name).
2. Informs the user: "I couldn't find a ticket for this branch. I'm calling this arc **Auth Middleware Refactor**. Want to attach it to an existing arc instead?"
3. Lists active arcs as numbered options:
   ```
   [1] Payment Integration (3 of 8 done)
   [2] Auth Rewrite (6 of 10 done)
   [3] Accept this name
   ```
4. User picks a number or hits enter to accept.

### Local Cache (`~/.vibecircle/arc-map.json`)

```json
{
  "feat/PAY-123-oauth": {
    "arcId": "uuid-abc",
    "arcTitle": "Payment Integration",
    "lastSequence": 3,
    "resolvedAt": "2026-03-27T14:30:00Z"
  },
  "main": null
}
```

- Keyed by branch name.
- `null` value means "this branch has no arc" (avoids re-resolving every session).
- Entries older than 24 hours trigger re-resolution (ticket may have moved to a different epic).
- Updated after each successful resolution.

---

## Arc Lifecycle

### Status: `active` (default)

All new arcs start as active. Active arcs appear in the sidebar under "Building" with progress indicators.

### Status: `shipped`

Triggered by the user in one of two ways:

1. **During `/share`**: User says "we shipped it" or "this feature is done." Claude creates a final `shipped` post and calls `PATCH /api/circles/{circleId}/arcs/{arcId}` with `{status: "shipped"}`.
2. **Via command**: `/circle arc ship <name>` — for cases where the final post was already made.

The API sets `shippedAt` to the current timestamp.

### Shipped Treatment

- Sidebar: shipped arcs move to a "Shipped" section with a checkmark and shipped date.
- Feed: the final post in a shipped arc gets a subtle "Shipped" banner.
- Timelapse: still available — shipped arcs tell the best stories.

### Reopening

If someone posts to a shipped arc (work resumed), the API automatically flips status back to `active` and clears `shippedAt`. No user action needed.

---

## API Changes

### New Endpoints

**`POST /api/circles/{circleId}/arcs`** — Create an arc.
```json
{
  "title": "Payment Integration",
  "epicRef": {"source": "linear", "id": "proj-123", "url": "https://linear.app/team/project/proj-123"}
}
```
Returns the created arc with its ID.

**`PATCH /api/circles/{circleId}/arcs/{arcId}`** — Update arc status or metadata.
```json
{
  "status": "shipped"
}
```

**`GET /api/circles/{circleId}/arcs/{arcId}`** — Get a single arc with enriched data (latest ticket snapshot from most recent post, contributor list, post count).

### Modified Endpoints

**`POST /api/circles/{circleId}/posts`** — Post creation now:
- Accepts `arcId` (required if part of an arc) — must reference an existing arc.
- Accepts `arcSequence` (plugin provides it).
- Accepts `metadata.ticket` and `metadata.epicProgress` (optional enrichment).
- If the referenced arc has `status: "shipped"`, the API flips it back to `active`.

**`GET /api/circles/{circleId}/arcs`** — Enhanced to return:
- All arcs for the circle, ordered by status (active first) then by most recent activity.
- Each arc includes: `id`, `title`, `status`, `epicRef`, `postCount`, `latestAt`, `shippedAt`.
- For active arcs: `epicProgress` from the most recent post in that arc.
- Contributor avatars (distinct authors who posted to the arc).

**`GET /api/circles/{circleId}/feed`** — Enhanced:
- Posts include arc data via join: `arc.title`, `arc.status`, `arc.epicRef`.
- Posts include `arcTotalPosts` (count of posts in that arc).
- For each post with `metadata.ticket`, the ticket info is available for display.

---

## Feed Display

### Post Card — Enhanced Arc Indicator

When a post belongs to an arc, the arc indicator shows:

- **Arc name** (clickable — filters feed to that arc) with a copper dot
- **Epic link** — small icon linking out to Linear/Jira/GitHub
- **Ticket badge** — e.g., `PAY-123` in monospace, linking to the specific ticket
- **Progress bar** — "3 of 8 done" with a visual bar (data from most recent post's `epicProgress`)
- **Dot sequence** — existing update position dots + "5th update" label
- **Timelapse button** — when arc has 2+ posts

### Sidebar — Arcs Section

**Active arcs** show:
- Arc title with copper dot
- Progress bar with fraction (e.g., 3/8)
- Contributor avatar stack
- Last activity time

**Shipped arcs** show:
- Arc title with green checkmark
- Shipped date
- Slightly dimmed (0.7 opacity)

### Arc Detail View

When filtering to a single arc (clicking arc name in sidebar or on a post), a header appears above the filtered posts:

- Arc title (large, serif) + epic link button
- Full progress bar with "X of Y tickets done"
- **Ticket list**: all tickets referenced across posts in this arc, showing:
  - Done tickets: green checkmark, strikethrough title
  - In-progress tickets: copper dot indicator, highlighted background, assignee name
  - Todo tickets: empty circle, dimmed
- Contributor avatars + stats (X contributors, Y updates, started date)
- Timelapse button (prominent)

---

## Plugin Changes Summary

### `detect-activity.js`

The systemMessage now instructs Claude to:
1. Check `~/.vibecircle/arc-map.json` for cached branch-to-arc mapping
2. If not cached, resolve via branch → ticket → epic chain
3. Include arc context and ticket metadata when suggesting a share

### `/share` command

Enhanced flow:
1. Resolve arc (cache → branch → ticket → epic)
2. Fetch ticket metadata (progress, status) if MCP tools available
3. Generate post content per circle (existing multi-circle behavior)
4. Include arc ID, sequence, and ticket metadata in the post payload
5. Update local arc-map cache
6. If user indicates "shipped" → call arc ship endpoint after posting

### `post-to-circle.js`

Accepts additional flags:
- `--ticket-source`, `--ticket-id`, `--ticket-title`, `--ticket-url`, `--ticket-status`
- `--epic-total`, `--epic-done`, `--epic-in-progress`

These get packed into the post's `metadata` field.

### New: `~/.vibecircle/arc-map.json`

Branch-to-arc mapping cache. Managed by the plugin, not synced to server. Speeds up session start by avoiding re-resolution of known branches.

---

## Migration Plan

1. Create `arcs` table with Drizzle migration.
2. Run data migration: for each distinct `(circleId, arcTitle)` in posts, create an arc row. Set all posts' `arcId` to the new arc IDs.
3. Update API routes: post creation validates `arcId` against arcs table, arcs endpoint returns enriched data.
4. Update feed queries: join posts with arcs for title/status/epicRef.
5. Update frontend: enhanced arc indicator, sidebar, arc detail view.
6. Update plugin: arc resolution chain, local cache, enriched post payloads.
7. Drop `arcTitle` from posts table (final cleanup migration after everything is working).
