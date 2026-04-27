export type CardKind = "text" | "image" | "youtube"

export type CardColor = "slate" | "amber" | "emerald" | "sky" | "rose"

export interface LessonNodeData {
  kind: CardKind
  title: string
  body?: string
  src?: string // image url or youtube url
  color: CardColor
  // Scheduling
  date?: string // YYYY-MM-DD
  time?: string // HH:mm (24h)
  duration?: number // minutes
  [key: string]: unknown
}

export interface Student {
  id: string
  name: string
  // Running total of summaries the student has submitted. Teacher bumps this manually.
  summaryCount: number
}

export interface BoardSnapshot {
  name: string
  nodes: unknown[]
  edges: unknown[]
  students: Student[]
  updatedAt: number
}
