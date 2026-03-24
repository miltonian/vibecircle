import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  const sql = neon(url)
  return drizzle(sql, { schema })
}

let _db: ReturnType<typeof getDb> | null = null

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    if (!_db) _db = getDb()
    return (_db as any)[prop]
  },
})
