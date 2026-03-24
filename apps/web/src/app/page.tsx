import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LandingHero } from "@/components/landing/hero"

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect("/new-circle")
  }

  return <LandingHero />
}
