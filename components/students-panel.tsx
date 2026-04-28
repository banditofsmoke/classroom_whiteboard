"use client"

import { useMemo, useState } from "react"
import {
  ChevronRight,
  ChevronLeft,
  Minus,
  Plus,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react"
import type { Student } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  collapsed: boolean
  onToggleCollapsed: () => void
  students: Student[]
  setStudents: (s: Student[]) => void
  onPasteSummary?: (student: Student) => void
  onArchiveStudent?: (student: Student) => void
  managedRoster?: boolean
}

export function StudentsPanel({
  collapsed,
  onToggleCollapsed,
  students,
  setStudents,
  onPasteSummary,
  onArchiveStudent,
  managedRoster = false,
}: Props) {
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const max = Math.max(1, ...students.map((s) => s.summaryCount))
    return students
      .map((s) => ({
        student: s,
        pct: Math.round((s.summaryCount / max) * 100),
      }))
      .sort((a, b) => b.student.summaryCount - a.student.summaryCount)
  }, [students])

  const addStudent = () => {
    const name = newName.trim()
    if (!name) return
    const s: Student = { id: crypto.randomUUID(), name, summaryCount: 0 }
    setStudents([...students, s])
    setNewName("")
  }

  const addMany = () => {
    const input = prompt(
      "Paste student names, one per line. Existing students keep their counts.",
      students.map((s) => s.name).join("\n"),
    )
    if (input === null) return
    const names = input
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean)
    const existing = new Map(students.map((s) => [s.name, s]))
    const merged: Student[] = names.map(
      (n) => existing.get(n) ?? { id: crypto.randomUUID(), name: n, summaryCount: 0 },
    )
    setStudents(merged)
  }

  const removeStudent = (id: string) => {
    setStudents(students.filter((s) => s.id !== id))
  }

  const renameStudent = (id: string, name: string) => {
    setStudents(
      students.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)),
    )
  }

  const bump = (id: string, delta: number) => {
    setStudents(
      students.map((s) =>
        s.id === id ? { ...s, summaryCount: Math.max(0, s.summaryCount + delta) } : s,
      ),
    )
  }

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-3 border-l border-slate-200 bg-white py-3">
        <button
          onClick={onToggleCollapsed}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Expand students panel"
          title="Expand"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex flex-col items-center gap-1">
          <Users className="size-4 text-slate-500" />
          <span className="text-[10px] font-medium text-slate-500">{students.length}</span>
        </div>
      </aside>
    )
  }

  const classTotal = students.reduce((acc, s) => acc + s.summaryCount, 0)

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Class Leaderboard</h2>
        </div>
        <button
          onClick={onToggleCollapsed}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Collapse"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span>{students.length} students</span>
          <span className="tabular-nums">
            <span className="font-semibold text-slate-900">{classTotal}</span> summaries total
          </span>
        </div>
      </div>

      {/* Add student (local-only) */}
      {!managedRoster && (
        <div className="flex items-center gap-1.5 border-b border-slate-200 p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStudent()}
            placeholder="Add student…"
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-900"
          />
          <button
            onClick={addStudent}
            className="flex items-center justify-center rounded-md bg-slate-900 text-white size-8 hover:bg-slate-800"
            aria-label="Add student"
            title="Add student"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={addMany}
            className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Bulk add or edit the roster"
          >
            Bulk
          </button>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="flex-1 overflow-y-auto">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
            <Users className="size-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No students yet</p>
            <p className="text-xs text-slate-500">
              Add students one at a time or use{" "}
              <button onClick={addMany} className="underline underline-offset-2 hover:text-slate-900">
                Bulk
              </button>{" "}
              to paste a full roster.
            </p>
          </div>
        ) : (
          <ol className="py-1">
            {ranked.map(({ student, pct }, idx) => {
              const isEditing = editingId === student.id
              const metric = student.summaryCount
              return (
                <li
                  key={student.id}
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                >
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-bold shrink-0",
                      idx === 0 && metric > 0 && "bg-amber-100 text-amber-700",
                      idx === 1 && metric > 0 && "bg-slate-200 text-slate-700",
                      idx === 2 && metric > 0 && "bg-orange-100 text-orange-700",
                      (idx > 2 || metric === 0) && "bg-slate-100 text-slate-500",
                    )}
                    title={`Rank ${idx + 1}`}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={student.name}
                          onBlur={(e) => {
                            renameStudent(student.id, e.target.value)
                            setEditingId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameStudent(student.id, (e.target as HTMLInputElement).value)
                              setEditingId(null)
                            } else if (e.key === "Escape") {
                              setEditingId(null)
                            }
                          }}
                          className="w-full rounded border border-slate-300 px-1 py-0.5 text-sm outline-none focus:border-slate-900"
                        />
                      ) : (
                        <button
                          onDoubleClick={() => setEditingId(student.id)}
                          title="Double-click to rename"
                          className="flex min-w-0 items-center gap-1.5 text-left"
                        >
                          <UserRound className="size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-sm font-medium text-slate-900">
                            {student.name}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(pct, metric > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Always-visible counter */}
                  <div className="flex items-center rounded-md border border-slate-200 bg-white shrink-0">
                    <button
                      onClick={() => bump(student.id, -1)}
                      disabled={metric === 0}
                      className="flex size-7 items-center justify-center rounded-l-md text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Decrease ${student.name}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-slate-900 px-1">
                      {metric}
                    </span>
                    <button
                      onClick={() => bump(student.id, 1)}
                      className="flex size-7 items-center justify-center rounded-r-md text-emerald-700 hover:bg-emerald-50"
                      aria-label={`Increase ${student.name}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {onPasteSummary && (
                    <button
                      onClick={() => onPasteSummary(student)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                      title="Paste a new summary for this student"
                    >
                      Paste
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (managedRoster) onArchiveStudent?.(student)
                      else removeStudent(student.id)
                    }}
                    className="rounded p-1 text-slate-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 shrink-0"
                    aria-label={managedRoster ? "Archive student" : "Remove student"}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </aside>
  )
}
