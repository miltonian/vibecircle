import { LoginForm } from "@/components/auth/login-form"

export const metadata = {
  title: "Sign in — vibecircle",
  description: "Sign in to see what your friends are building.",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      {/* Ambient glow blobs */}
      <div className="ambient-glow ambient-glow--green" />
      <div className="ambient-glow ambient-glow--cyan" />
      <div className="ambient-glow ambient-glow--purple" />

      <LoginForm />
    </main>
  )
}
