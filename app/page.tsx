import { TeachBoard } from "@/components/teach-board"
import { redirect } from "next/navigation"
import { getSessionIdFromCookies, getUserFromSession } from "@/lib/server/auth"

export default async function Page() {
  const user = await getUserFromSession(await getSessionIdFromCookies())
  if (!user) redirect("/login")
  return <TeachBoard />
}
