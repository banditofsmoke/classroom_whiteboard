import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

// Prefer .env.local (Next.js style), fall back to .env
dotenv.config({ path: ".env.local" })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.")
  process.exit(1)
}

const username = process.env.SEED_TEACHER_USERNAME || "teacher"
const password = process.env.SEED_TEACHER_PASSWORD || "change-me"
const className = process.env.SEED_CLASS_NAME || "My Class"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const passwordHash = await bcrypt.hash(password, 10)

  // Upsert teacher user
  const { data: userRows, error: userErr } = await supabase
    .from("users")
    .upsert(
      { username, password_hash: passwordHash, role: "teacher" },
      { onConflict: "username" },
    )
    .select("id, username, role")
    .limit(1)

  if (userErr) throw userErr
  const user = userRows?.[0]
  if (!user) throw new Error("Failed to upsert teacher user.")

  // Create a class if none exist for this teacher with same name
  const { data: classes, error: classErr } = await supabase
    .from("classes")
    .select("id,name")
    .eq("created_by_user_id", user.id)
    .eq("name", className)
    .limit(1)

  if (classErr) throw classErr
  let classRow = classes?.[0]

  if (!classRow) {
    const { data: inserted, error: insertErr } = await supabase
      .from("classes")
      .insert({ name: className, created_by_user_id: user.id })
      .select("id,name")
      .limit(1)
    if (insertErr) throw insertErr
    classRow = inserted?.[0]
  }

  console.log("Seed complete:")
  console.log(`- Teacher username: ${username}`)
  console.log(`- Teacher password: ${password}`)
  console.log(`- Class: ${classRow?.name} (${classRow?.id})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

