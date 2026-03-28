-- Create arcs table
CREATE TABLE IF NOT EXISTS "arcs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "circle_id" uuid NOT NULL REFERENCES "circles"("id"),
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "epic_ref" jsonb,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "shipped_at" timestamp
);

-- Migrate existing arc data: create arc rows from distinct (circleId, arcTitle) pairs
INSERT INTO "arcs" ("id", "circle_id", "title", "created_by", "created_at")
SELECT DISTINCT ON (p."circle_id", p."arc_title")
  gen_random_uuid(),
  p."circle_id",
  p."arc_title",
  p."author_id",
  MIN(p."created_at")
FROM "posts" p
WHERE p."arc_title" IS NOT NULL
GROUP BY p."circle_id", p."arc_title", p."author_id";

-- Update posts to reference the new arcs table
-- First, add a temporary column for the new UUID arc reference
ALTER TABLE "posts" ADD COLUMN "arc_id_new" uuid REFERENCES "arcs"("id");

-- Populate arc_id_new by matching on circle_id + arc_title
UPDATE "posts" p
SET "arc_id_new" = a."id"
FROM "arcs" a
WHERE p."circle_id" = a."circle_id"
  AND p."arc_title" = a."title"
  AND p."arc_title" IS NOT NULL;

-- Drop old arc_id column and rename new one
ALTER TABLE "posts" DROP COLUMN "arc_id";
ALTER TABLE "posts" RENAME COLUMN "arc_id_new" TO "arc_id";

-- Keep arc_title for now (will be dropped in a later migration after all code is updated)
-- It's redundant but prevents breakage during the transition
