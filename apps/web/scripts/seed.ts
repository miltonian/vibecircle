/**
 * Seed script — populates the database with demo data.
 * Run with: bun run apps/web/scripts/seed.ts
 */

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { randomUUID } from "crypto"
import {
  users,
  circles,
  circleMembers,
  posts,
  reactions,
  comments,
} from "../src/lib/db/schema"

// ── Preflight ────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error(`
┌─────────────────────────────────────────────────┐
│  DATABASE_URL is not set.                       │
│                                                 │
│  1. Copy the env template:                      │
│     cp apps/web/.env.example apps/web/.env.local│
│                                                 │
│  2. Add your Neon Postgres connection string.   │
│                                                 │
│  3. Run again:                                  │
│     bun run seed                                │
└─────────────────────────────────────────────────┘
`)
  process.exit(1)
}

const sql = neon(DATABASE_URL)
const db = drizzle(sql)

// ── IDs (pre-generated so we can wire up relationships) ──────────────────────
const userIds = {
  alice: randomUUID(),
  bob: randomUUID(),
  carol: randomUUID(),
  dave: randomUUID(),
}

const circleId = randomUUID()

const postIds = {
  shipped1: randomUUID(),
  wip1: randomUUID(),
  video1: randomUUID(),
  live1: randomUUID(),
  ambient1: randomUUID(),
  shipped2: randomUUID(),
}

// ── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding database...")

  // Users
  await db.insert(users).values([
    {
      id: userIds.alice,
      email: "alice@example.com",
      name: "Alice",
      avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=alice",
    },
    {
      id: userIds.bob,
      email: "bob@example.com",
      name: "Bob",
      avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=bob",
    },
    {
      id: userIds.carol,
      email: "carol@example.com",
      name: "Carol",
      avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=carol",
    },
    {
      id: userIds.dave,
      email: "dave@example.com",
      name: "Dave",
      avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=dave",
    },
  ])
  console.log("  ✓ Created 4 users")

  // Circle
  await db.insert(circles).values({
    id: circleId,
    name: "Vibe Crew",
    createdBy: userIds.alice,
    inviteCode: "VIBECREW",
  })
  console.log("  ✓ Created circle: Vibe Crew")

  // Memberships
  await db.insert(circleMembers).values([
    { circleId, userId: userIds.alice, role: "owner" },
    { circleId, userId: userIds.bob, role: "member" },
    { circleId, userId: userIds.carol, role: "member" },
    { circleId, userId: userIds.dave, role: "member" },
  ])
  console.log("  ✓ Added all users to circle")

  // Posts
  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000)

  await db.insert(posts).values([
    {
      id: postIds.shipped1,
      circleId,
      authorId: userIds.alice,
      type: "shipped",
      body: "Just deployed my recipe app! It uses AI to suggest meals based on what's in your fridge. Try it out 🧑‍🍳",
      metadata: {
        deployUrl: "https://fridge-chef.vercel.app",
        projectName: "fridge-chef",
      },
      createdAt: hoursAgo(2),
    },
    {
      id: postIds.wip1,
      circleId,
      authorId: userIds.bob,
      type: "wip",
      body: "Working on a multiplayer drawing game. Canvas sync is surprisingly hard but I think I cracked it with CRDTs.",
      media: [
        {
          type: "image",
          url: "https://placehold.co/800x450/1a1a2e/e0e0e0?text=Canvas+Sync+WIP",
          caption: "Two canvases syncing in real time",
        },
      ],
      createdAt: hoursAgo(5),
    },
    {
      id: postIds.video1,
      circleId,
      authorId: userIds.carol,
      type: "video",
      body: "Quick demo of the voice memo app I've been building. It transcribes and summarizes your notes in real time.",
      media: [
        {
          type: "video",
          url: "https://placehold.co/800x450/1a1a2e/e0e0e0?text=Voice+Memo+Demo",
          caption: "Live transcription demo",
        },
      ],
      createdAt: hoursAgo(8),
    },
    {
      id: postIds.live1,
      circleId,
      authorId: userIds.dave,
      type: "live",
      body: "My pixel art editor is live! Draw something and share it. Built this whole thing in one evening.",
      metadata: {
        deployUrl: "https://pixel-vibes.vercel.app",
        projectName: "pixel-vibes",
      },
      createdAt: hoursAgo(12),
    },
    {
      id: postIds.ambient1,
      circleId,
      authorId: userIds.alice,
      type: "ambient",
      body: "Deep in a refactor — moving everything to server components. Wish me luck.",
      createdAt: hoursAgo(18),
    },
    {
      id: postIds.shipped2,
      circleId,
      authorId: userIds.carol,
      type: "shipped",
      body: "Shipped v2 of my habit tracker! Now with streaks, charts, and a widget. This one's for the daily grinders.",
      metadata: {
        deployUrl: "https://streakly.vercel.app",
        projectName: "streakly",
      },
      createdAt: hoursAgo(24),
    },
  ])
  console.log("  ✓ Created 6 posts")

  // Reactions
  await db.insert(reactions).values([
    { postId: postIds.shipped1, userId: userIds.bob, emoji: "🔥" },
    { postId: postIds.shipped1, userId: userIds.carol, emoji: "🚀" },
    { postId: postIds.shipped1, userId: userIds.dave, emoji: "🔥" },
    { postId: postIds.wip1, userId: userIds.alice, emoji: "👀" },
    { postId: postIds.wip1, userId: userIds.carol, emoji: "🧠" },
    { postId: postIds.video1, userId: userIds.alice, emoji: "🔥" },
    { postId: postIds.video1, userId: userIds.dave, emoji: "🎉" },
    { postId: postIds.live1, userId: userIds.bob, emoji: "🎨" },
    { postId: postIds.live1, userId: userIds.alice, emoji: "🚀" },
    { postId: postIds.shipped2, userId: userIds.alice, emoji: "💪" },
    { postId: postIds.shipped2, userId: userIds.bob, emoji: "🔥" },
    { postId: postIds.shipped2, userId: userIds.dave, emoji: "🚀" },
  ])
  console.log("  ✓ Created 12 reactions")

  // Comments
  await db.insert(comments).values([
    {
      postId: postIds.shipped1,
      authorId: userIds.bob,
      body: "This is so cool! Does it handle dietary restrictions?",
      createdAt: hoursAgo(1.5),
    },
    {
      postId: postIds.shipped1,
      authorId: userIds.alice,
      body: "Not yet but that's next on the list!",
      createdAt: hoursAgo(1),
    },
    {
      postId: postIds.wip1,
      authorId: userIds.dave,
      body: "CRDTs are the way. Have you looked at Yjs?",
      createdAt: hoursAgo(4),
    },
    {
      postId: postIds.live1,
      authorId: userIds.carol,
      body: "I just drew a tiny cat. This is delightful.",
      createdAt: hoursAgo(11),
    },
    {
      postId: postIds.shipped2,
      authorId: userIds.dave,
      body: "I've been using this for a week and the streak feature is genuinely motivating.",
      createdAt: hoursAgo(20),
    },
  ])
  console.log("  ✓ Created 5 comments")

  console.log("\nDone! Your database is seeded with demo data.")
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
