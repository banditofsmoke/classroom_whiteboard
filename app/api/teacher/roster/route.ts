import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"
import { getDefaultClassId } from "@/lib/server/class"

export async function GET() {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const classId = await getDefaultClassId(user)
  const sb = supabaseAdmin()

  const { data: roster, error: rosterErr } = await sb
    .from("students")
    .select("id, display_name")
    .eq("class_id", classId)
    .eq("archived", false)
    .order("display_name", { ascending: true })

  if (rosterErr) return NextResponse.json({ error: "Failed to load roster." }, { status: 500 })

  const ids = (roster ?? []).map((s: any) => s.id as string)

  let countsById: Record<string, number> = {}
  if (ids.length) {
    const { data: sums } = await sb.from("summaries").select("student_id").in("student_id", ids).limit(100000)
    countsById = (sums ?? []).reduce((acc: Record<string, number>, r: any) => {
      const sid = String(r.student_id)
      acc[sid] = (acc[sid] ?? 0) + 1
      return acc
    }, {})
  }

  const students = (roster ?? []).map((s: any) => ({
    id: s.id,
    name: s.display_name,
    summaryCount: countsById[String(s.id)] ?? 0,
  }))

  return NextResponse.json({ students })
}

