"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

export default function StudentPage() {
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [active, setActive] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [readingItems, setReadingItems] = useState<any[]>([])
  const [summaryItems, setSummaryItems] = useState<any[]>([])
  const [newRead, setNewRead] = useState({
    date: "",
    minutes: "",
    pages: "",
    textTitle: "",
    keyIdeas: "",
    vocab: "",
  })
  const [newSummary, setNewSummary] = useState({
    date: "",
    status: "draft",
    content: "",
  })

  const sorted = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students],
  )

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rosterRes, activeRes] = await Promise.all([
        fetch("/api/class/roster", { cache: "no-store" }),
        fetch("/api/student/active", { cache: "no-store" }),
      ])
      const rosterBody = await rosterRes.json().catch(() => ({}))
      const activeBody = await activeRes.json().catch(() => ({}))
      if (!rosterRes.ok) throw new Error(rosterBody?.error || "Failed to load roster.")
      setStudents(rosterBody?.students ?? [])
      setActive(activeBody?.activeStudent ?? null)
    } catch (e: any) {
      setError(e?.message || "Failed to load.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const loadProgress = async () => {
    setError(null)
    const [rRes, sRes] = await Promise.all([
      fetch("/api/student/reading", { cache: "no-store" }),
      fetch("/api/student/summaries", { cache: "no-store" }),
    ])
    const rBody = await rRes.json().catch(() => ({}))
    const sBody = await sRes.json().catch(() => ({}))
    if (rRes.ok) setReadingItems(rBody?.items ?? [])
    if (sRes.ok) setSummaryItems(sBody?.items ?? [])
  }

  const selectStudent = async (studentId: string) => {
    setError(null)
    const pin = prompt("Enter your PIN")
    if (pin === null) return
    const res = await fetch("/api/student/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, pin }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Selection failed.")
      return
    }
    setActive(body?.student ?? null)
    await loadProgress()
  }

  useEffect(() => {
    if (active) void loadProgress()
  }, [active?.id])

  const createReading = async () => {
    setError(null)
    if (!active) {
      setError("Select your name first.")
      return
    }
    const payload = {
      date: newRead.date,
      minutes: newRead.minutes === "" ? undefined : Number(newRead.minutes),
      pages: newRead.pages === "" ? undefined : Number(newRead.pages),
      textTitle: newRead.textTitle,
      keyIdeas: newRead.keyIdeas || undefined,
      vocab: newRead.vocab || undefined,
    }
    const res = await fetch("/api/student/reading", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Failed to add reading session.")
      return
    }
    setNewRead({ date: "", minutes: "", pages: "", textTitle: "", keyIdeas: "", vocab: "" })
    await loadProgress()
  }

  const createSummary = async () => {
    setError(null)
    if (!active) {
      setError("Select your name first.")
      return
    }
    const res = await fetch("/api/student/summaries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: newSummary.date, status: newSummary.status, content: newSummary.content }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body?.error || "Failed to add summary.")
      return
    }
    setNewSummary({ date: "", status: "draft", content: "" })
    await loadProgress()
  }

  const weekStats = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    // Monday start
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    const startIso = start.toISOString().slice(0, 10)

    const readingThisWeek = readingItems.filter((r) => r.date >= startIso)
    const summariesThisWeek = summaryItems.filter((s) => s.date >= startIso)

    const minutes = readingThisWeek.reduce((acc, r) => acc + (Number(r.minutes) || 0), 0)
    const pages = readingThisWeek.reduce((acc, r) => acc + (Number(r.pages) || 0), 0)
    const submitted = summariesThisWeek.filter((s) => s.status === "submitted" || s.status === "reviewed").length

    return { minutes, pages, summaries: summariesThisWeek.length, submitted, startIso }
  }, [readingItems, summaryItems])

  return (
    <main className="min-h-dvh bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Student</h1>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="text-slate-600 hover:text-slate-900" href="/teacher">
              Teacher
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="text-slate-600 hover:text-slate-900" type="submit">
                Logout
              </button>
            </form>
          </nav>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Who are you?</p>
              <p className="text-xs text-slate-500">Select your name, then enter your PIN.</p>
            </div>
            <button
              onClick={load}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Active student:{" "}
              <span className="font-semibold text-slate-900">{active ? active.name : "None selected"}</span>
            </div>
            <div className="divide-y divide-slate-200">
              {loading ? (
                <div className="px-3 py-3 text-sm text-slate-600">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-600">No students yet. Ask your teacher to add you.</div>
              ) : (
                sorted.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStudent(s.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <span className="text-xs text-slate-500">Select</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-900">This week</p>
            <p className="mt-1 text-xs text-slate-500">From {weekStats.startIso}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Minutes read</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{weekStats.minutes}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Pages read</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{weekStats.pages}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Summaries</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{weekStats.summaries}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Submitted</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{weekStats.submitted}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-900">Add reading session</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={newRead.date}
                onChange={(e) => setNewRead((v) => ({ ...v, date: e.target.value }))}
                type="date"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
              <input
                value={newRead.textTitle}
                onChange={(e) => setNewRead((v) => ({ ...v, textTitle: e.target.value }))}
                placeholder="What did you read?"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 sm:col-span-2"
              />
              <input
                value={newRead.minutes}
                onChange={(e) => setNewRead((v) => ({ ...v, minutes: e.target.value }))}
                placeholder="Minutes (optional)"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
              <input
                value={newRead.pages}
                onChange={(e) => setNewRead((v) => ({ ...v, pages: e.target.value }))}
                placeholder="Pages (optional)"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
              <button
                onClick={createReading}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-900">Write a summary</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={newSummary.date}
                  onChange={(e) => setNewSummary((v) => ({ ...v, date: e.target.value }))}
                  type="date"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                />
                <select
                  value={newSummary.status}
                  onChange={(e) => setNewSummary((v) => ({ ...v, status: e.target.value }))}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                </select>
                <button
                  onClick={createSummary}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Add summary
                </button>
              </div>
              <textarea
                value={newSummary.content}
                onChange={(e) => setNewSummary((v) => ({ ...v, content: e.target.value }))}
                placeholder="Write your summary here (or your teacher can paste it later)."
                className="min-h-32 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-900">Recent activity</p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs text-slate-600">Reading sessions</div>
                <div className="divide-y divide-slate-200">
                  {readingItems.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-600">No reading sessions yet.</div>
                  ) : (
                    readingItems.slice(0, 10).map((r) => (
                      <div key={r.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">{r.textTitle}</span>
                          <span className="text-xs text-slate-500">{r.date}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {r.minutes ? `${r.minutes} min` : ""}
                          {r.minutes && r.pages ? " · " : ""}
                          {r.pages ? `${r.pages} pages` : ""}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs text-slate-600">Summaries</div>
                <div className="divide-y divide-slate-200">
                  {summaryItems.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-600">No summaries yet.</div>
                  ) : (
                    summaryItems.slice(0, 10).map((s) => (
                      <div key={s.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {s.status === "submitted" ? "Submitted" : s.status === "reviewed" ? "Reviewed" : "Draft"}
                          </span>
                          <span className="text-xs text-slate-500">{s.date}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{s.wordCount} words</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

