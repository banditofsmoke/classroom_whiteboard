import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { getSessionIdFromCookies, requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

const BodySchema = z.object({
  studentId: z.string().uuid(),
  pin: z.string().min(2).max(16),
})

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = await getSessionIdFromCookies()
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const sb = supabaseAdmin()
  const { data: rows, error } = await sb
    .from("students")
    .select("id, display_name, pin_hash, archived")
    .eq("id", parsed.data.studentId)
    .limit(1)

  if (error) return NextResponse.json({ error: "Selection failed." }, { status: 500 })
  const student = rows?.[0] as any
  if (!student || student.archived) return NextResponse.json({ error: "Student not found." }, { status: 404 })

  const ok = await bcrypt.compare(parsed.data.pin, String(student.pin_hash))
  if (!ok) return NextResponse.json({ error: "Wrong PIN." }, { status: 401 })

  const { error: updErr } = await sb.from("sessions").update({ active_student_id: student.id }).eq("id", sessionId)
  if (updErr) return NextResponse.json({ error: "Selection failed." }, { status: 500 })

  return NextResponse.json({ ok: true, student: { id: student.id, name: student.display_name } })
}

