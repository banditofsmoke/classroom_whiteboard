import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

const BodySchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().min(4).optional(), // YYYY-MM-DD
  content: z.string().min(1).max(20000),
})

function countWords(s: string) {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10)
  const wordCount = countWords(parsed.data.content)

  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from("summaries")
    .insert({
      student_id: parsed.data.studentId,
      date,
      status: "submitted",
      content: parsed.data.content,
      external_text: null,
      word_count: wordCount,
      reading_session_id: null,
    })
    .select("id, word_count, date")
    .limit(1)

  if (error) return NextResponse.json({ error: "Failed to save summary." }, { status: 500 })
  return NextResponse.json({ ok: true, summary: data?.[0] ?? null })
}

