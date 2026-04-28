"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type OnSelectionChangeParams,
  MarkerType,
  Panel,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { LessonNode } from "@/components/nodes/lesson-node"
import { Toolbar } from "@/components/toolbar"
import { StudentsPanel } from "@/components/students-panel"
import { loadBoard, saveBoard, exportBoard } from "@/lib/storage"
import type { BoardSnapshot, CardKind, LessonNodeData, Student } from "@/lib/types"

const nodeTypes = { lesson: LessonNode }

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: true,
  style: { stroke: "#4f46e5", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#4f46e5" },
}

const connectionLineStyle = { stroke: "#4f46e5", strokeWidth: 2, strokeDasharray: "4 4" }

function BoardInner() {
  const rf = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<LessonNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isTeacher, setIsTeacher] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [boardName, setBoardName] = useState("My Lesson Board")
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)

  // Load from storage on mount
  useEffect(() => {
    const saved = loadBoard()
    if (saved) {
      setNodes((saved.nodes as Node<LessonNodeData>[]) ?? [])
      setEdges((saved.edges as Edge[]) ?? [])
      setStudents(saved.students ?? [])
      setBoardName(saved.name ?? "My Lesson Board")
    }
    setHydrated(true)
  }, [setNodes, setEdges])

  // If logged in as teacher, use Supabase roster for the students panel.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" })
        const meBody = await meRes.json().catch(() => ({}))
        const role = meBody?.user?.role as string | undefined
        if (cancelled) return
        const teacher = role === "teacher"
        setIsTeacher(teacher)
        if (teacher) {
          const rosterRes = await fetch("/api/teacher/roster", { cache: "no-store" })
          const rosterBody = await rosterRes.json().catch(() => ({}))
          if (!cancelled && rosterRes.ok) {
            setStudents(rosterBody?.students ?? [])
          }
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on changes
  useEffect(() => {
    if (!hydrated) return
    const snap: BoardSnapshot = {
      name: boardName,
      nodes,
      edges,
      students,
      updatedAt: Date.now(),
    }
    saveBoard(snap)
  }, [nodes, edges, students, boardName, hydrated])

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            ...defaultEdgeOptions,
            id: `e-${params.source}-${params.target}-${params.sourceHandle ?? ""}-${params.targetHandle ?? ""}-${Date.now()}`,
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const first = params.nodes[0]
    setSelectedNodeId(first ? first.id : null)
  }, [])

  const addCard = useCallback(
    (kind: CardKind) => {
      const id = `n-${Date.now()}`
      const position = {
        x: 200 + Math.random() * 200,
        y: 150 + Math.random() * 200,
      }
      const base: LessonNodeData = {
        kind,
        title: "",
        body: kind === "text" ? "" : undefined,
        src: kind === "image" ? "" : kind === "youtube" ? "" : undefined,
        color: kind === "text" ? "slate" : kind === "image" ? "sky" : "rose",
      }
      setNodes((ns) => [
        ...ns,
        {
          id,
          type: "lesson",
          position,
          data: base,
          width: 288,
          height: kind === "text" ? 220 : 260,
          style: { width: 288, height: kind === "text" ? 220 : 260 },
        },
      ])
    },
    [setNodes],
  )

  const addTextCardAt = useCallback(
    (body: string, position: { x: number; y: number }) => {
      const id = `n-${Date.now()}`
      const trimmed = body.trim()
      const title =
        trimmed.split(/\r?\n/).find((l) => l.trim())?.slice(0, 60) || "Summary"

      const base: LessonNodeData = {
        kind: "text",
        title,
        body: trimmed,
        color: "slate",
      }

      setNodes((ns) => [
        ...ns,
        {
          id,
          type: "lesson",
          position,
          data: base,
          width: 320,
          height: 260,
          style: { width: 320, height: 260 },
        },
      ])
      setSelectedNodeId(id)
    },
    [setNodes],
  )

  const pasteToCanvas = useCallback(
    async (opts?: { clientX?: number; clientY?: number }) => {
      // Try images first (works in some browsers with permissions).
      try {
        // @ts-ignore - ClipboardItem types vary by lib DOM version
        const items = await navigator.clipboard.read?.()
        if (items && Array.isArray(items)) {
          for (const item of items) {
            const imgType = item.types?.find((t: string) => t.startsWith("image/"))
            if (imgType) {
              const blob = await item.getType(imgType)
              const file = new File([blob], "pasted", { type: imgType })
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const r = new FileReader()
                r.onload = () => resolve(String(r.result))
                r.onerror = reject
                r.readAsDataURL(file)
              })
              const clientX = opts?.clientX ?? lastMouseRef.current?.x ?? window.innerWidth / 2
              const clientY = opts?.clientY ?? lastMouseRef.current?.y ?? window.innerHeight / 2
              const pos = rf.screenToFlowPosition({ x: clientX, y: clientY })
              const id = `n-${Date.now()}`
              const base: LessonNodeData = {
                kind: "image",
                title: "Image",
                src: dataUrl,
                color: "sky",
              }
              setNodes((ns) => [
                ...ns,
                {
                  id,
                  type: "lesson",
                  position: pos,
                  data: base,
                  width: 320,
                  height: 260,
                  style: { width: 320, height: 260 },
                },
              ])
              setSelectedNodeId(id)
              return
            }
          }
        }
      } catch {
        // ignore and try text
      }

      let text = ""
      try {
        // Prefer clipboard API (right-click menu gesture). Falls back to prompt if blocked.
        text = await navigator.clipboard.readText()
      } catch {
        const manual = prompt("Paste text")
        if (manual === null) return
        text = manual
      }
      const content = text.trim()
      if (!content) return

      const clientX = opts?.clientX ?? lastMouseRef.current?.x ?? window.innerWidth / 2
      const clientY = opts?.clientY ?? lastMouseRef.current?.y ?? window.innerHeight / 2
      const pos = rf.screenToFlowPosition({ x: clientX, y: clientY })
      addTextCardAt(content, pos)
    },
    [addTextCardAt, rf],
  )

  const onPaneMouseMove = useCallback((evt: React.MouseEvent) => {
    lastMouseRef.current = { x: evt.clientX, y: evt.clientY }
  }, [])

  const onPaneContextMenu = useCallback(
    (evt: React.MouseEvent) => {
      evt.preventDefault()
      const flow = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY })
      setMenu({ x: evt.clientX, y: evt.clientY, flowX: flow.x, flowY: flow.y })
    },
    [rf],
  )

  // Ctrl/Cmd+V creates a card if we're not focused in an input/textarea.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || (target as any)?.isContentEditable) return

      e.preventDefault()
      const clientX = lastMouseRef.current?.x ?? window.innerWidth / 2
      const clientY = lastMouseRef.current?.y ?? window.innerHeight / 2
      const pos = rf.screenToFlowPosition({ x: clientX, y: clientY })

      // Image paste
      const items = e.clipboardData?.items
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (!file) break
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = String(reader.result)
              const id = `n-${Date.now()}`
              const base: LessonNodeData = { kind: "image", title: "Image", src: dataUrl, color: "sky" }
              setNodes((ns) => [
                ...ns,
                {
                  id,
                  type: "lesson",
                  position: pos,
                  data: base,
                  width: 320,
                  height: 260,
                  style: { width: 320, height: 260 },
                },
              ])
              setSelectedNodeId(id)
            }
            reader.readAsDataURL(file)
            return
          }
        }
      }

      // Text paste
      const text = e.clipboardData?.getData("text/plain") ?? ""
      if (!text.trim()) return
      addTextCardAt(text, pos)
    }
    window.addEventListener("paste", onPaste as any)
    return () => window.removeEventListener("paste", onPaste as any)
  }, [addTextCardAt, rf])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleExport = () => {
    const snap: BoardSnapshot = {
      name: boardName,
      nodes,
      edges,
      students,
      updatedAt: Date.now(),
    }
    exportBoard(snap)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const snap = JSON.parse(String(reader.result)) as BoardSnapshot
        setNodes((snap.nodes as Node<LessonNodeData>[]) ?? [])
        setEdges((snap.edges as Edge[]) ?? [])
        setStudents(snap.students ?? [])
        setBoardName(snap.name ?? "Imported board")
      } catch {
        alert("Could not parse that file.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleClear = () => {
    if (!confirm("Clear all cards and connections? Students will be kept.")) return
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null)
    window.location.href = "/login"
  }

  const handlePasteSummary = async (student: Student) => {
    const text = prompt(`Paste ${student.name}'s summary (4 sentences)`)
    if (text === null) return
    const content = text.trim()
    if (!content) return

    // 1) Always create a card on the canvas (what you asked for).
    const pos = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    addTextCardAt(`${student.name}\n\n${content}`, pos)

    // 2) If teacher, also save to Supabase as "submitted" so it appears in review/analytics.
    if (isTeacher) {
      const res = await fetch("/api/teacher/summaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: student.id, content }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(body?.error || "Saved to canvas, but failed to save to database.")
        return
      }
    }

    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, summaryCount: s.summaryCount + 1 } : s)))
  }

  const handleArchiveStudent = async (student: Student) => {
    if (!confirm(`Archive ${student.name}?`)) return
    const res = await fetch("/api/teacher/students", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId: student.id, archived: true }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(body?.error || "Failed to archive student.")
      return
    }
    setStudents((prev) => prev.filter((s) => s.id !== student.id))
  }

  const menuStyle = useMemo(() => {
    if (!menu) return {}
    return { left: menu.x, top: menu.y }
  }, [menu])

  return (
    <div className="flex flex-col h-dvh bg-slate-100">
      <Toolbar
        boardName={boardName}
        setBoardName={setBoardName}
        onAdd={addCard}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        onLogout={handleLogout}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={onFileChosen}
        className="sr-only"
      />

      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0" onMouseDown={() => setMenu(null)}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineStyle={connectionLineStyle}
            onPaneMouseMove={onPaneMouseMove}
            onPaneContextMenu={onPaneContextMenu}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Backspace", "Delete"]}
            style={{ backgroundColor: "#f1f5f9" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1.8}
              color="#94a3b8"
            />
            <Controls className="!bg-white !border !border-slate-200 !shadow-sm !rounded-lg overflow-hidden" />
            <MiniMap
              pannable
              zoomable
              className="!bg-white !border !border-slate-200 !rounded-lg overflow-hidden"
              nodeColor={(n) => {
                const c = (n.data as LessonNodeData)?.color
                if (c === "amber") return "#f59e0b"
                if (c === "emerald") return "#059669"
                if (c === "sky") return "#0284c7"
                if (c === "rose") return "#f43f5e"
                return "#1e293b"
              }}
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-24 rounded-xl border border-slate-200 bg-white/90 px-5 py-4 text-center shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">Empty board</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click <span className="font-medium text-slate-700">Add → Text / Image / YouTube</span> above to
                    create your first lesson.
                  </p>
                </div>
              </Panel>
            )}
            <Panel position="bottom-center">
              <div className="rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm px-3 py-1.5 text-xs text-slate-600">
                Drag from the circles on a card to connect. Drag any card corner to resize it.
              </div>
            </Panel>
          </ReactFlow>

          {menu && (
            <div
              className="fixed z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
              style={menuStyle as any}
              role="menu"
              onMouseDown={(e) => {
                // Prevent the pane from closing the menu before button clicks fire.
                e.stopPropagation()
              }}
            >
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={async () => {
                  const x = menu.x
                  const y = menu.y
                  setMenu(null)
                  await pasteToCanvas({ clientX: x, clientY: y })
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                Paste
              </button>
            </div>
          )}
        </div>

        <StudentsPanel
          collapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
          students={students}
          setStudents={setStudents}
          managedRoster={isTeacher}
          onPasteSummary={isTeacher ? handlePasteSummary : undefined}
          onArchiveStudent={isTeacher ? handleArchiveStudent : undefined}
        />
      </div>
    </div>
  )
}

export function TeachBoard() {
  return (
    <ReactFlowProvider>
      <BoardInner />
    </ReactFlowProvider>
  )
}
