import { NextResponse } from "next/server"
import { clearSessionCookie, getSessionIdFromCookies } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/server/supabaseAdmin"

export async function POST() {
  const sessionId = await getSessionIdFromCookies()
  if (sessionId) {
    const sb = supabaseAdmin()
    await sb.from("sessions").delete().eq("id", sessionId)
  }

  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}

