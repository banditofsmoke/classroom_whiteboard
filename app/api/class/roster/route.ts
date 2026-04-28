import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"
import { getDefaultClassId } from "@/lib/server/class"

export async function GET() {
  const user = await requireUser().catch(() => null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const classId = await getDefaultClassId(user)
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from("students")
    .select("id, display_name, archived, created_at")
    .eq("class_id", classId)
    .eq("archived", false)
    .order("display_name", { ascending: true })

  if (error) return NextResponse.json({ error: "Failed to load roster." }, { status: 500 })

  const students = (data ?? []).map((s: any) => ({ id: s.id, name: s.display_name }))
  return NextResponse.json({ students })
}

