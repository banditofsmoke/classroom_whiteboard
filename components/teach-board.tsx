"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<LessonNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [boardName, setBoardName] = useState("My Lesson Board")
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="flex flex-col h-dvh bg-slate-100">
      <Toolbar
        boardName={boardName}
        setBoardName={setBoardName}
        onAdd={addCard}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={onFileChosen}
        className="sr-only"
      />

      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0">
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
        </div>

        <StudentsPanel
          collapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
          students={students}
          setStudents={setStudents}
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
