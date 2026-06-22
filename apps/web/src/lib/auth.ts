import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import { getDb } from "./db"
import { users, accounts, sessions, verificationTokens } from "./db/schema"

// Dev-only password-less login, off unless explicitly enabled. Lets local
// tooling (and automated verification) sign in as an existing user by email
// without going through the GitHub OAuth redirect. NEVER enable in production.
const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "1"

const devLoginProvider = Credentials({
  id: "dev-login",
  name: "Dev Login",
  credentials: { email: { label: "Email", type: "text" } },
  async authorize(credentials) {
    if (!devLoginEnabled) return null
    const email = typeof credentials?.email === "string" ? credentials.email : null
    if (!email) return null
    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      image: user.image ?? user.avatarUrl ?? undefined,
    }
  },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Use the Drizzle adapter when DATABASE_URL is available,
  // otherwise fall back to pure JWT (no DB needed for local dev)
  ...(process.env.DATABASE_URL
    ? {
        adapter: DrizzleAdapter(getDb(), {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
        }),
      }
    : {}),

  session: {
    strategy: "jwt",
  },

  providers: devLoginEnabled ? [GitHub, devLoginProvider] : [GitHub],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
