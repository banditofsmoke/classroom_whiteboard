import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "./supabaseAdmin"
import { getEnv } from "./env"

export const SESSION_COOKIE = "tb_session"

export type AuthedUser = {
  id: string
  username: string
  role: "teacher" | "student"
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? null
}

export async function getUserFromSession(sessionId: string | null): Promise<AuthedUser | null> {
  if (!sessionId) return null
  const sb = supabaseAdmin()

  const { data: sessions, error } = await sb
    .from("sessions")
    .select("id, expires_at, users ( id, username, role )")
    .eq("id", sessionId)
    .limit(1)

  if (error) return null
  const row = sessions?.[0] as
    | {
        expires_at: string
        users: { id: string; username: string; role: "teacher" | "student" } | null
      }
    | undefined

  if (!row?.users) return null
  if (Date.parse(row.expires_at) <= Date.now()) return null

  return { id: row.users.id, username: row.users.username, role: row.users.role }
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await getUserFromSession(await getSessionIdFromCookies())
  if (!user) {
    throw new Error("UNAUTHENTICATED")
  }
  return user
}

export function setSessionCookie(res: NextResponse, sessionId: string) {
  const env = getEnv()
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.AUTH_COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export function clearSessionCookie(res: NextResponse) {
  const env = getEnv()
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.AUTH_COOKIE_SECURE,
    path: "/",
    maxAge: 0,
  })
}

export const LoginBodySchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(4).max(128),
})

