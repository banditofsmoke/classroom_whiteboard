import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"
import { hashPassword } from "@/lib/server/password"

const CreateSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(4).max(128),
})

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const sb = supabaseAdmin()
  const passwordHash = await hashPassword(parsed.data.password)

  const { data, error } = await sb
    .from("users")
    .insert({ username: parsed.data.username.trim(), password_hash: passwordHash, role: "student" })
    .select("id, username, role")
    .limit(1)

  if (error) return NextResponse.json({ error: "Failed to create user." }, { status: 500 })
  return NextResponse.json({ ok: true, user: data?.[0] ?? null })
}

