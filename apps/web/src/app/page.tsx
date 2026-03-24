import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LandingHero } from "@/components/landing/hero"
import { getUserCircles } from "@/lib/db/queries"

export default async function Home() {
  const session = await auth()

  if (session?.user?.id) {
    const circles = await getUserCircles(session.user.id)
    if (circles.length > 0) {
      redirect(`/${circles[0].id}`)
    } else {
      redirect("/new-circle")
    }
  }

  return <LandingHero />
}
