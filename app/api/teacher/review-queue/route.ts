import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

export async function GET() {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from("summaries")
    .select("id, date, status, word_count, students ( id, display_name )")
    .in("status", ["submitted"])
    .order("date", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: "Failed to load review queue." }, { status: 500 })

  const items = (data ?? []).map((r: any) => ({
    id: r.id,
    date: r.date,
    status: r.status,
    wordCount: r.word_count,
    student: r.students ? { id: r.students.id, name: r.students.display_name } : null,
  }))
  return NextResponse.json({ items })
}

