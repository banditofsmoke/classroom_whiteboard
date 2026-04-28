import { NextResponse } from "next/server"
import { getSessionIdFromCookies, getUserFromSession } from "@/lib/server/auth"

export async function GET() {
  const user = await getUserFromSession(await getSessionIdFromCookies())
  return NextResponse.json({ user })
}

