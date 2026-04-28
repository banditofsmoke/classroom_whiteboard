import { NextResponse } from "next/server"
import { z } from "zod"
import { getSessionIdFromCookies, requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

const CreateSchema = z.object({
  date: z.string().min(4), // YYYY-MM-DD
  minutes: z.number().int().min(0).optional(),
  pages: z.number().int().min(0).optional(),
  textTitle: z.string().min(1).max(200),
  keyIdeas: z.string().max(2000).optional(),
  vocab: z.string().max(2000).optional(),
})

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
    .from("reading_sessions")
    .select("id, date, minutes, pages, text_title, notes_key_ideas, vocab, created_at")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: "Failed to load reading sessions." }, { status: 500 })
  const items = (data ?? []).map((r: any) => ({
    id: r.id,
    date: r.date,
    minutes: r.minutes,
    pages: r.pages,
    textTitle: r.text_title,
    keyIdeas: r.notes_key_ideas,
    vocab: r.vocab,
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

  const { date, minutes, pages, textTitle, keyIdeas, vocab } = parsed.data
  const { data, error } = await sb
    .from("reading_sessions")
    .insert({
      student_id: studentId,
      date,
      minutes: minutes ?? null,
      pages: pages ?? null,
      text_title: textTitle,
      notes_key_ideas: keyIdeas ?? null,
      vocab: vocab ?? null,
    })
    .select("id")
    .limit(1)

  if (error) return NextResponse.json({ error: "Failed to create reading session." }, { status: 500 })
  return NextResponse.json({ ok: true, id: (data?.[0] as any)?.id })
}

