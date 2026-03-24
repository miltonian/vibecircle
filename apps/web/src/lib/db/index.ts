import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

let _db: NeonHttpDatabase<typeof schema> | null = null

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error("DATABASE_URL is not set")
    }
    const sql = neon(url)
    _db = drizzle(sql, { schema })
  }
  return _db
}

// For convenience — most code imports `db` directly
// Auth.js adapter and other libraries that check instanceof need the real object
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    const real = getDb()
    return (real as any)[prop]
  },
  // This makes instanceof checks and typeof work correctly
  getPrototypeOf() {
    return Object.getPrototypeOf(getDb())
  },
})
