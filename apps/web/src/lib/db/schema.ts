import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core"

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  image: text("image"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  apiKey: text("api_key"), // user's AI provider API key (BYOK)
  apiKeyProvider: text("api_key_provider"), // "openai" | "anthropic"
  createdAt: timestamp("created_at").defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ── Accounts (Auth.js) ────────────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ]
)

// ── Sessions (Auth.js) ────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

// ── Verification Tokens (Auth.js) ─────────────────────────────────────────
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
)

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

// ── API Tokens (for plugin auth) ──────────────────────────────────────────
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").unique().notNull(),
  name: text("name").notNull(), // e.g. "Claude Code Plugin"
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
})

export type ApiToken = typeof apiTokens.$inferSelect

// ── Device Codes (for device code auth flow) ─────────────────────────────
export const deviceCodes = pgTable("device_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(), // 8-char human-readable code
  userId: uuid("user_id").references(() => users.id), // null until authorized
  token: text("token"), // null until authorized, set to the api_token value
  circleId: text("circle_id"), // null until authorized, user picks their circle
  status: text("status").notNull().default("pending"), // pending | authorized | expired
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export type DeviceCode = typeof deviceCodes.$inferSelect
