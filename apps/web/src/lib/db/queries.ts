import { eq, and } from "drizzle-orm"
import { db } from "."
import { circles, circleMembers, users } from "./schema"

/** Generate a short random alphanumeric invite code (8 chars) */
function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

/** Return all circles a user belongs to, with their role */
export async function getUserCircles(userId: string) {
  const rows = await db
    .select({
      id: circles.id,
      name: circles.name,
      inviteCode: circles.inviteCode,
      createdAt: circles.createdAt,
      role: circleMembers.role,
    })
    .from(circleMembers)
    .innerJoin(circles, eq(circleMembers.circleId, circles.id))
    .where(eq(circleMembers.userId, userId))

  return rows
}

/** Create a circle and add the creator as owner */
export async function createCircle(name: string, userId: string) {
  const inviteCode = generateCode()

  const [circle] = await db
    .insert(circles)
    .values({
      name,
      createdBy: userId,
      inviteCode,
    })
    .returning()

  await db.insert(circleMembers).values({
    circleId: circle.id,
    userId,
    role: "owner",
  })

  return circle
}

/** Generate a new invite code for a circle */
export async function generateInvite(circleId: string) {
  const code = generateCode()

  await db
    .update(circles)
    .set({ inviteCode: code })
    .where(eq(circles.id, circleId))

  return code
}

/** Look up a circle by invite code and add the user as a member */
export async function joinCircle(inviteCode: string, userId: string) {
  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.inviteCode, inviteCode))
    .limit(1)

  if (!circle) {
    return null
  }

  // Check if user is already a member
  const [existing] = await db
    .select()
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circle.id),
        eq(circleMembers.userId, userId)
      )
    )
    .limit(1)

  if (existing) {
    return circle // Already a member, just return the circle
  }

  await db.insert(circleMembers).values({
    circleId: circle.id,
    userId,
    role: "member",
  })

  return circle
}

/** Return all members of a circle with user info */
export async function getCircleMembers(circleId: string) {
  const rows = await db
    .select({
      userId: circleMembers.userId,
      role: circleMembers.role,
      joinedAt: circleMembers.joinedAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      image: users.image,
    })
    .from(circleMembers)
    .innerJoin(users, eq(circleMembers.userId, users.id))
    .where(eq(circleMembers.circleId, circleId))

  return rows
}

/** Get a single circle by ID */
export async function getCircleById(circleId: string) {
  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.id, circleId))
    .limit(1)

  return circle ?? null
}

/** Get a circle by its invite code */
export async function getCircleByInviteCode(inviteCode: string) {
  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.inviteCode, inviteCode))
    .limit(1)

  return circle ?? null
}
