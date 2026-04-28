import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

const BodySchema = z.object({
  summaryId: z.string().uuid(),
  framework: z.enum(["frameworkA", "frameworkB"]),
  scores: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])).default({}),
  teacherNotes: z.string().max(5000).optional(),
  markReviewed: z.boolean().optional(),
})

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null)
  if (!user || user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const sb = supabaseAdmin()
  const { summaryId, framework, scores, teacherNotes, markReviewed } = parsed.data

  const { error } = await sb
    .from("assessments")
    .upsert(
      {
        summary_id: summaryId,
        assessed_by_user_id: user.id,
        framework,
        scores_json: scores,
        teacher_notes: teacherNotes ?? null,
      },
      { onConflict: "summary_id,framework" },
    )

  if (error) return NextResponse.json({ error: "Failed to save assessment." }, { status: 500 })

  if (markReviewed) {
    await sb.from("summaries").update({ status: "reviewed" }).eq("id", summaryId)
  }

  return NextResponse.json({ ok: true })
}

