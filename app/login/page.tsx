"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const body = (await res.json().catch(() => ({}))) as any
      if (!res.ok) {
        setError(body?.error || "Login failed.")
        return
      }
      if (body?.role === "teacher") router.push("/teacher")
      else router.push("/student")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">TeachBoard</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Teacher: run <span className="font-mono">pnpm seed</span> after setting Supabase env vars to create the first
          account.
        </p>
      </div>
    </main>
  )
}

