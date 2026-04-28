import { supabaseAdmin } from "./supabaseAdmin"
import type { AuthedUser } from "./auth"

// Simple default-class resolution for MVP.
export async function getDefaultClassId(user: AuthedUser): Promise<string> {
  const sb = supabaseAdmin()

  if (user.role === "teacher") {
    const { data, error } = await sb
      .from("classes")
      .select("id")
      .eq("created_by_user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
    if (!error && data?.[0]?.id) return data[0].id as string
  }

  const { data, error } = await sb.from("classes").select("id").order("created_at", { ascending: true }).limit(1)
  if (error || !data?.[0]?.id) throw new Error("No class found. Run the seed script first.")
  return data[0].id as string
}

