# Feed + Live Sidebar Redesign — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Problem

The feed is boring. Every post looks the same regardless of type. There's no visual hierarchy, no sense of who's building right now, and no way to navigate by feature arc. It feels like reading a log.

## Goal

Redesign the feed layout with a main column + live sidebar. Shipped posts get hero treatment, WIP posts are compact, and the sidebar shows real-time presence, arc navigation, and members.

## Design

### Layout: Feed + Sidebar

The `(feed)` layout changes from a single centered 620px column to a two-column layout:

- **Main feed**: flexible width, left side
- **Sidebar**: 220px fixed width, right side, sticky
- **Max width**: 960px total, centered
- **Mobile**: sidebar collapses below feed (or hidden behind a toggle)

### Card Variants by Post Type

Three card sizes based on content:

**1. Hero Card (shipped posts with media)**
- Full-width screenshot/embed at the top of the card (240px height)
- "SHIPPED" badge overlaid on the hero image
- "Try it live" button overlaid bottom-right (for posts with deploy_url)
- Author, headline, description, reactions below the hero
- Used when: `type === "shipped"` and `media` is not empty

**2. Standard Card (shipped without media, or posts with thumbnails)**
- No hero image
- Side thumbnail (140px x 100px) on the right if media exists
- Author, headline, description, reactions
- Used when: `type === "shipped"` without media, or any post with media that isn't the latest shipped

**3. Compact Card (WIP, ambient)**
- Smaller avatar (26px vs 32px)
- No headline — just the body text inline
- No reaction bar (or minimal)
- Used when: `type === "wip"` or `type === "ambient"`

### Sidebar Sections

**1. Building Now (presence)**
- List of circle members with status dot (copper = building, dim = away)
- Name + "Xm ago" timestamp
- Sorted: building first, then away

**2. Arcs (feature navigation)**
- "All posts" default filter (highlighted)
- List of arcs with name + post count
- Clicking an arc filters the feed to only posts with that arcId
- Data from existing `GET /api/circles/{id}/arcs` endpoint

**3. Members**
- Compact member chips with avatar, name, plugin status dot
- Already built — move from above the feed into the sidebar

### Top Bar Changes

The top bar stays mostly the same but the max-width changes from 620px to 960px to match the new layout width.

### Activity Ticker

Already exists — just needs to match the new 960px max-width.

### Entrance Animations

Cards animate in with a staggered `fadeInUp` (opacity 0→1, translateY 12px→0, 400ms ease-out, 60ms stagger per card).

## What Changes

### Modified Files
- `apps/web/src/app/(feed)/layout.tsx` — change max-width from 620px to 960px
- `apps/web/src/app/(feed)/[circleId]/page.tsx` — add sidebar component, remove MembersPanel from main column
- `apps/web/src/components/feed/feed-view.tsx` — no structural changes, but cards get new variants
- `apps/web/src/components/feed/post-card.tsx` — three card variants (hero, standard, compact) based on post type/media
- `apps/web/src/components/feed/post-body.tsx` — may need adjustments for compact variant
- `apps/web/src/components/presence/top-bar.tsx` — update max-width to 960px

### New Files
- `apps/web/src/components/feed/feed-sidebar.tsx` — sidebar with presence, arcs, members sections
- `apps/web/src/hooks/use-arcs.ts` — SWR hook for fetching arcs from `/api/circles/{id}/arcs`

### Removed
- `apps/web/src/components/feed/members-panel.tsx` — functionality moves into sidebar

## What Doesn't Change

- Database schema
- API endpoints (all data already available)
- Plugin (no changes)
- Post creation flow
- Reactions / comments
- Auth / middleware

## Mobile Considerations

On screens < 768px, the sidebar hides and the feed goes full-width (back to current behavior). Presence and arcs can be accessed via a slide-out panel or small toggle button. For v1, just hiding the sidebar on mobile is fine.
