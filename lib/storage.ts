import type { BoardSnapshot, Student } from "./types"

const KEY = "teachboard:v3"

// Migrate any older student shape into { id, name, summaryCount }.
function migrateStudents(input: unknown): Student[] {
  if (!Array.isArray(input)) return []
  return input.map((s) => {
    const anyS = s as Record<string, unknown>
    const id = String(anyS["id"] ?? crypto.randomUUID())
    const name = String(anyS["name"] ?? "Student")
    if (typeof anyS["summaryCount"] === "number") {
      return { id, name, summaryCount: anyS["summaryCount"] as number }
    }
    // Old v2 shape: { summaries: Record<string, number> }
    if (anyS["summaries"] && typeof anyS["summaries"] === "object") {
      const totals = Object.values(anyS["summaries"] as Record<string, number>)
      const sum = totals.reduce((a, b) => a + (Number(b) || 0), 0)
      return { id, name, summaryCount: sum }
    }
    return { id, name, summaryCount: 0 }
  })
}

export function loadBoard(): BoardSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    // Try current key, then fall back to older versions for one-time migration.
    const raw =
      localStorage.getItem(KEY) ??
      localStorage.getItem("teachboard:v2") ??
      localStorage.getItem("teachboard:v1")
    if (!raw) return null
    const parsed = JSON.parse(raw) as BoardSnapshot
    return { ...parsed, students: migrateStudents(parsed.students) }
  } catch {
    return null
  }
}

export function saveBoard(snap: BoardSnapshot) {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(snap))
}

export function exportBoard(snap: BoardSnapshot) {
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${snap.name || "teachboard"}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseYouTubeId(input: string): string | null {
  if (!input) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1) || null
    }
    if (url.searchParams.get("v")) return url.searchParams.get("v")
    const parts = url.pathname.split("/").filter(Boolean)
    const idx = parts.findIndex((p) => p === "embed" || p === "shorts")
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]
  } catch {
    return null
  }
  return null
}
