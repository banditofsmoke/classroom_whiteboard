"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

export default function TeacherPage() {
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newPin, setNewPin] = useState("")
  const [assessDraft, setAssessDraft] = useState<Record<string, any>>({})
  const [newStudentUsername, setNewStudentUsername] = useState("")
  const [newStudentPassword, setNewStudentPassword] = useState("")

  const sorted = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students],
  )

  const loadQueue = async () => {
    const res = await fetch("/api/teacher/review-queue", { cache: "no-store" })
    const body = await res.json().catch(() => ({}))
    if (res.ok) setQueue(body?.items ?? [])
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/class/roster", { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Failed to load roster.")
      setStudents(body?.students ?? [])
      await loadQueue()
    } catch (e: any) {
      setError(e?.message || "Failed to load.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const addStudent = async () => {
    setError(null)
    const displayName = newName.trim()
    const pin = newPin.trim()
    if (!displayName || !pin) {
      setError("Name and PIN are required.")
      return
    }
    const res = await fetch("/api/teacher/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, pin }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Failed to add student.")
      return
    }
    setNewName("")
    setNewPin("")
    await load()
  }

  const resetPin = async (studentId: string) => {
    setError(null)
    const pin = prompt("Set a new PIN for this student")
    if (pin === null) return
    const res = await fetch("/api/teacher/students", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, pin }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) setError(body?.error || "Failed to reset PIN.")
  }

  const archiveStudent = async (studentId: string) => {
    setError(null)
    if (!confirm("Archive this student?")) return
    const res = await fetch("/api/teacher/students", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, archived: true }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Failed to archive.")
      return
    }
    await load()
  }

  const saveAssessment = async (summaryId: string, framework: "frameworkA" | "frameworkB") => {
    setError(null)
    const key = `${summaryId}:${framework}`
    const draft = assessDraft[key] ?? {}
    const res = await fetch("/api/teacher/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        summaryId,
        framework,
        scores: draft.scores ?? {},
        teacherNotes: draft.teacherNotes ?? "",
        markReviewed: true,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Failed to save assessment.")
      return
    }
    await loadQueue()
  }

  const createStudentLogin = async () => {
    setError(null)
    const username = newStudentUsername.trim()
    const password = newStudentPassword
    if (!username || !password) {
      setError("Student username and password are required.")
      return
    }
    const res = await fetch("/api/teacher/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Failed to create student login.")
      return
    }
    setNewStudentUsername("")
    setNewStudentPassword("")
    alert(`Student login created: ${username}`)
  }

  return (
    <main className="min-h-dvh bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Teacher</h1>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="text-slate-600 hover:text-slate-900" href="/">
              Board
            </Link>
            <Link className="text-slate-600 hover:text-slate-900" href="/student">
              Student
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="text-slate-600 hover:text-slate-900" type="submit">
                Logout
              </button>
            </form>
          </nav>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Roster</p>
              <p className="text-xs text-slate-500">Add students and set/reset their PINs.</p>
            </div>
            <button
              onClick={load}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Student name"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="PIN (2–16 chars)"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <button
              onClick={addStudent}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add student
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 text-xs text-slate-600">{students.length} students</div>
            <div className="divide-y divide-slate-200">
              {loading ? (
                <div className="px-3 py-3 text-sm text-slate-600">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-600">No students yet.</div>
              ) : (
                sorted.map((s) => (
                  <div key={s.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => resetPin(s.id)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Reset PIN
                      </button>
                      <button
                        onClick={() => archiveStudent(s.id)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">Student logins</p>
          <p className="mt-1 text-xs text-slate-500">
            Optional. Create a student username/password so they can sign in (no email/phone).
          </p>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={newStudentUsername}
              onChange={(e) => setNewStudentUsername(e.target.value)}
              placeholder="Student username"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <input
              value={newStudentPassword}
              onChange={(e) => setNewStudentPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <button
              onClick={createStudentLogin}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create login
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">Review queue</p>
          <p className="mt-1 text-xs text-slate-500">Submitted summaries waiting for review.</p>

          <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 text-xs text-slate-600">{queue.length} submitted</div>
            <div className="divide-y divide-slate-200">
              {queue.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-600">Nothing to review right now.</div>
              ) : (
                queue.slice(0, 25).map((q) => {
                  const summaryId = q.id as string
                  const keyA = `${summaryId}:frameworkA`
                  const keyB = `${summaryId}:frameworkB`
                  return (
                    <div key={q.id} className="px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {q.student?.name ?? "Unknown"} · {q.date}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">{q.wordCount} words</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(["frameworkA", "frameworkB"] as const).map((fw) => {
                          const key = fw === "frameworkA" ? keyA : keyB
                          const draft = assessDraft[key] ?? { scores: {}, teacherNotes: "" }
                          return (
                            <div key={fw} className="rounded-lg border border-slate-200 p-3">
                              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                {fw}
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {["mainIdea", "details", "organization", "accuracy"].map((metric) => (
                                  <label key={metric} className="block">
                                    <span className="text-[10px] font-medium text-slate-500">{metric}</span>
                                    <input
                                      value={draft.scores?.[metric] ?? ""}
                                      onChange={(e) =>
                                        setAssessDraft((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...draft,
                                            scores: { ...(draft.scores ?? {}), [metric]: e.target.value },
                                          },
                                        }))
                                      }
                                      placeholder="1-4"
                                      className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-900"
                                    />
                                  </label>
                                ))}
                              </div>
                              <label className="mt-2 block">
                                <span className="text-[10px] font-medium text-slate-500">Notes</span>
                                <textarea
                                  value={draft.teacherNotes ?? ""}
                                  onChange={(e) =>
                                    setAssessDraft((prev) => ({
                                      ...prev,
                                      [key]: { ...draft, teacherNotes: e.target.value },
                                    }))
                                  }
                                  className="mt-1 w-full min-h-16 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-900"
                                />
                              </label>
                              <button
                                onClick={() => saveAssessment(summaryId, fw)}
                                className="mt-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                              >
                                Save & mark reviewed
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

