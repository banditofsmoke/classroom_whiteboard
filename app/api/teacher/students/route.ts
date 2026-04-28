import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"
import { getDefaultClassId } from "@/lib/server/class"
import { hashPassword } from "@/lib/server/password"

const CreateSchema = z.object({
  displayName: z.string().min(1).max(64),
  pin: z.string().min(2).max(16),
})

const UpdateSchema = z.object({
  studentId: z.string().uuid(),
  displayName: z.string().min(1).max(64).optional(),
  pin: z.string().min(2).max(16).optional(),
  archived: z.boolean().optional(),
})

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const classId = await getDefaultClassId(user)
  const sb = supabaseAdmin()
  const pinHash = await hashPassword(parsed.data.pin)

  const { data, error } = await sb
    .from("students")
    .insert({ class_id: classId, display_name: parsed.data.displayName.trim(), pin_hash: pinHash })
    .select("id, display_name")
    .limit(1)

  if (error) return NextResponse.json({ error: "Failed to create student." }, { status: 500 })
  const row = data?.[0] as any
  return NextResponse.json({ ok: true, student: { id: row.id, name: row.display_name } })
}

export async function PATCH(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (parsed.data.displayName !== undefined) patch["display_name"] = parsed.data.displayName.trim()
  if (parsed.data.pin !== undefined) patch["pin_hash"] = await hashPassword(parsed.data.pin)
  if (parsed.data.archived !== undefined) patch["archived"] = parsed.data.archived

  const sb = supabaseAdmin()
  const { error } = await sb.from("students").update(patch).eq("id", parsed.data.studentId)
  if (error) return NextResponse.json({ error: "Failed to update student." }, { status: 500 })

  return NextResponse.json({ ok: true })
}

