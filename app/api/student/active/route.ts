import { NextResponse } from "next/server"
import { getSessionIdFromCookies, requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

export async function GET() {
  const user = await requireUser().catch(() => null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessionId = await getSessionIdFromCookies()
  if (!sessionId) return NextResponse.json({ activeStudent: null })

  const sb = supabaseAdmin()
  const { data: sessions, error } = await sb
    .from("sessions")
    .select("active_student_id")
    .eq("id", sessionId)
    .limit(1)

  if (error) return NextResponse.json({ activeStudent: null })
  const activeId = (sessions?.[0] as any)?.active_student_id as string | null | undefined
  if (!activeId) return NextResponse.json({ activeStudent: null })

  const { data: students, error: sErr } = await sb
    .from("students")
    .select("id, display_name, archived")
    .eq("id", activeId)
    .limit(1)

  if (sErr) return NextResponse.json({ activeStudent: null })
  const st = students?.[0] as any
  if (!st || st.archived) return NextResponse.json({ activeStudent: null })

  return NextResponse.json({ activeStudent: { id: st.id, name: st.display_name } })
}

