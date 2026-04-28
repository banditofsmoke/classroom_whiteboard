import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionIdFromCookies, requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

const CreateSchema = z.object({
  date: z.string().min(4), // YYYY-MM-DD
  status: z.enum(["draft", "submitted", "reviewed"]).optional(),
  content: z.string().max(20000).optional(),
  externalText: z.string().max(20000).optional(),
  readingSessionId: z.string().uuid().optional(),
})

function countWords(s: string) {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

export async function GET() {
  const user = await requireUser().catch(() => null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = await getSessionIdFromCookies()
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sb = supabaseAdmin()
  const { data: sessions } = await sb.from("sessions").select("active_student_id").eq("id", sessionId).limit(1)
  const studentId = (sessions?.[0] as any)?.active_student_id as string | null | undefined
  if (!studentId) return NextResponse.json({ error: "No active student selected." }, { status: 400 })

  const { data, error } = await sb
    .from("summaries")
    .select("id, date, status, content, external_text, word_count, reading_session_id, created_at")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: "Failed to load summaries." }, { status: 500 })

  const items = (data ?? []).map((r: any) => ({
    id: r.id,
    date: r.date,
    status: r.status,
    content: r.content,
    externalText: r.external_text,
    wordCount: r.word_count,
    readingSessionId: r.reading_session_id,
  }))
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = await getSessionIdFromCookies()
  if (!sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const sb = supabaseAdmin()
  const { data: sessions } = await sb.from("sessions").select("active_student_id").eq("id", sessionId).limit(1)
  const studentId = (sessions?.[0] as any)?.active_student_id as string | null | undefined
  if (!studentId) return NextResponse.json({ error: "No active student selected." }, { status: 400 })

  const { date, status, content, externalText, readingSessionId } = parsed.data
  const textForCount = content ?? externalText ?? ""
  const wordCount = countWords(textForCount)

  const { data, error } = await sb
    .from("summaries")
    .insert({
      student_id: studentId,
      date,
      status: status ?? "draft",
      content: content ?? null,
      external_text: externalText ?? null,
      word_count: wordCount,
      reading_session_id: readingSessionId ?? null,
    })
    .select("id")
    .limit(1)

  if (error) return NextResponse.json({ error: "Failed to create summary." }, { status: 500 })
  return NextResponse.json({ ok: true, id: (data?.[0] as any)?.id })
}

