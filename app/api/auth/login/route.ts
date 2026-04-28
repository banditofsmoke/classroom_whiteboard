import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"
import { LoginBodySchema, setSessionCookie } from "@/lib/server/auth"
import { verifyPassword } from "@/lib/server/password"

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = LoginBodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { username, password } = parsed.data
  const sb = supabaseAdmin()

  const { data: users, error } = await sb
    .from("users")
    .select("id, username, role, password_hash")
    .eq("username", username)
    .limit(1)

  if (error) return NextResponse.json({ error: "Login failed." }, { status: 500 })
  const user = users?.[0] as
    | { id: string; username: string; role: "teacher" | "student"; password_hash: string }
    | undefined
  if (!user) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  const { data: sessions, error: sessErr } = await sb
    .from("sessions")
    .insert({ user_id: user.id, expires_at: expiresAt })
    .select("id")
    .limit(1)

  if (sessErr) return NextResponse.json({ error: "Login failed." }, { status: 500 })

  const sessionId = (sessions?.[0] as { id: string } | undefined)?.id
  if (!sessionId) return NextResponse.json({ error: "Login failed." }, { status: 500 })

  const res = NextResponse.json({ ok: true, role: user.role })
  setSessionCookie(res, sessionId)
  return res
}

