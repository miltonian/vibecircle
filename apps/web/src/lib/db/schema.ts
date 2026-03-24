import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core"

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ── Circles ────────────────────────────────────────────────────────────────
export const circles = pgTable("circles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  inviteCode: text("invite_code").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export type Circle = typeof circles.$inferSelect
export type NewCircle = typeof circles.$inferInsert

// ── Circle Members ─────────────────────────────────────────────────────────
export const circleMembers = pgTable(
  "circle_members",
  {
    circleId: uuid("circle_id")
      .references(() => circles.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role").notNull(), // 'owner' | 'member'
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.circleId, table.userId] })]
)

export type CircleMember = typeof circleMembers.$inferSelect
export type NewCircleMember = typeof circleMembers.$inferInsert

// ── Posts ──────────────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id")
    .references(() => circles.id)
    .notNull(),
  authorId: uuid("author_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // 'shipped' | 'wip' | 'video' | 'live' | 'ambient'
  body: text("body"),
  media: jsonb("media"), // array of {type, url, caption}
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
})

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert

// ── Reactions ──────────────────────────────────────────────────────────────
export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .references(() => posts.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("reactions_post_user_emoji_idx").on(
      table.postId,
      table.userId,
      table.emoji
    ),
  ]
)

export type Reaction = typeof reactions.$inferSelect
export type NewReaction = typeof reactions.$inferInsert

// ── Comments ──────────────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .references(() => posts.id)
    .notNull(),
  authorId: uuid("author_id")
    .references(() => users.id)
    .notNull(),
  body: text("body").notNull(),
  isAi: boolean("is_ai").default(false),
  createdAt: timestamp("created_at").defaultNow(),
})

export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert

// ── Presence ──────────────────────────────────────────────────────────────
export const presence = pgTable(
  "presence",
  {
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    circleId: uuid("circle_id")
      .references(() => circles.id)
      .notNull(),
    status: text("status").notNull(), // 'building' | 'online' | 'away'
    activity: text("activity"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.circleId] })]
)

export type Presence = typeof presence.$inferSelect
export type NewPresence = typeof presence.$inferInsert
