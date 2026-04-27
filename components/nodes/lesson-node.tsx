"use client"

import { memo, useRef, useState, type ClipboardEvent, type DragEvent } from "react"
import { Handle, NodeResizer, Position, type NodeProps, useReactFlow } from "@xyflow/react"
import {
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  ImageIcon,
  Youtube,
  Calendar,
  Clock,
  Hourglass,
  ClipboardPaste,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { parseYouTubeId } from "@/lib/storage"
import type { CardColor, LessonNodeData } from "@/lib/types"

const colorMap: Record<CardColor, { ring: string; header: string; accent: string }> = {
  slate: {
    ring: "ring-slate-300",
    header: "bg-slate-900 text-slate-50",
    accent: "text-slate-700",
  },
  amber: {
    ring: "ring-amber-300",
    header: "bg-amber-500 text-amber-950",
    accent: "text-amber-800",
  },
  emerald: {
    ring: "ring-emerald-300",
    header: "bg-emerald-600 text-emerald-50",
    accent: "text-emerald-800",
  },
  sky: {
    ring: "ring-sky-600",
    header: "bg-sky-600 text-sky-50",
    accent: "text-sky-800",
  },
  rose: {
    ring: "ring-rose-300",
    header: "bg-rose-500 text-rose-50",
    accent: "text-rose-800",
  },
}

const handleClass =
  "!w-3 !h-3 !bg-white !border-2 !border-slate-900 hover:!bg-indigo-500 hover:!border-indigo-600 transition-colors"

function formatDateTime(date?: string, time?: string) {
  if (!date && !time) return null
  try {
    if (date) {
      const d = new Date(`${date}T${time || "00:00"}`)
      if (isNaN(d.getTime())) return null
      const datePart = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      if (!time) return datePart
      const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      return `${datePart} · ${timePart}`
    }
    return time ?? null
  } catch {
    return null
  }
}

function LessonNodeInner({ id, data, selected }: NodeProps) {
  const nodeData = data as LessonNodeData
  const { setNodes } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<LessonNodeData>(nodeData)

  const colors = colorMap[nodeData.color] ?? colorMap.slate

  const update = (patch: Partial<LessonNodeData>) => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    )
  }

  const remove = () => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id))
  }

  const save = () => {
    update(draft)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(nodeData)
    setEditing(false)
  }

  const KindIcon =
    nodeData.kind === "image" ? ImageIcon : nodeData.kind === "youtube" ? Youtube : FileText

  const dateLine = formatDateTime(nodeData.date, nodeData.time)

  return (
    <div
      className={cn(
        "group relative flex h-full w-full flex-col rounded-xl bg-white shadow-md ring-1 transition-shadow",
        colors.ring,
        selected && "shadow-2xl ring-2 ring-indigo-500",
      )}
    >
      {/* Corner + edge resize handles. Only visible when selected. */}
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={selected}
        lineClassName="!border-indigo-400"
        handleClassName="!bg-white !border-2 !border-indigo-500 !w-2.5 !h-2.5 !rounded-sm"
      />

      <Handle id="t" type="target" position={Position.Top} className={handleClass} />
      <Handle id="l" type="target" position={Position.Left} className={handleClass} />
      <Handle id="r" type="source" position={Position.Right} className={handleClass} />
      <Handle id="b" type="source" position={Position.Bottom} className={handleClass} />

      {/* Header */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 rounded-t-xl px-3 py-2",
          colors.header,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <KindIcon className="size-4 shrink-0" />
          {editing ? (
            <input
              className="w-full bg-black/10 rounded px-1.5 py-0.5 text-sm outline-none placeholder:text-current/60 focus:bg-black/20"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Lesson title"
            />
          ) : (
            <h3 className="truncate text-sm font-semibold">{nodeData.title || "Untitled lesson"}</h3>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {editing ? (
            <>
              <button
                onClick={save}
                className="rounded p-1 hover:bg-black/20"
                aria-label="Save"
                title="Save"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={cancel}
                className="rounded p-1 hover:bg-black/20"
                aria-label="Cancel"
                title="Cancel"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setDraft(nodeData)
                  setEditing(true)
                }}
                className="rounded p-1 hover:bg-black/20"
                aria-label="Edit"
                title="Edit"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={remove}
                className="rounded p-1 hover:bg-black/20"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Schedule bar (view mode) */}
      {!editing && (dateLine || nodeData.duration) && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2 text-xs text-slate-500">
          {dateLine && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {dateLine}
            </span>
          )}
          {nodeData.duration ? (
            <span className="inline-flex items-center gap-1">
              <Hourglass className="size-3" />
              {nodeData.duration} min
            </span>
          ) : null}
        </div>
      )}

      {/* Body — flex-1 so it fills available height when resized */}
      <div className="nodrag flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        {editing ? (
          <EditBody draft={draft} setDraft={setDraft} />
        ) : (
          <ViewBody data={nodeData} />
        )}

        {editing && (
          <div className="mt-3 flex shrink-0 items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Color</span>
            {(Object.keys(colorMap) as CardColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setDraft({ ...draft, color: c })}
                className={cn(
                  "size-5 rounded-full ring-2 ring-offset-1 transition",
                  draft.color === c ? "ring-slate-900" : "ring-transparent hover:ring-slate-300",
                )}
                style={{
                  background:
                    c === "slate"
                      ? "#1e293b"
                      : c === "amber"
                        ? "#f59e0b"
                        : c === "emerald"
                          ? "#059669"
                          : c === "sky"
                            ? "#0284c7"
                            : "#f43f5e",
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ViewBody({ data }: { data: LessonNodeData }) {
  if (data.kind === "image" && data.src) {
    return (
      <img
        src={data.src || "/placeholder.svg"}
        alt={data.title || "Lesson image"}
        className="h-full min-h-0 w-full flex-1 rounded-md border border-slate-200 object-cover"
        crossOrigin="anonymous"
      />
    )
  }
  if (data.kind === "youtube") {
    const id = parseYouTubeId(data.src || "")
    if (!id) {
      return <p className="text-xs text-slate-400 italic">Paste a YouTube link to embed.</p>
    }
    return (
      <div className="relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-md border border-slate-200 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={data.title || "YouTube video"}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <p className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
      {data.body || <span className="italic text-slate-400">Click edit to add notes…</span>}
    </p>
  )
}

function EditBody({
  draft,
  setDraft,
}: {
  draft: LessonNodeData
  setDraft: (d: LessonNodeData) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex shrink-0 items-center gap-1">
        {(["text", "image", "youtube"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setDraft({ ...draft, kind: k })}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium border transition",
              draft.kind === k
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
            )}
          >
            {k === "text" ? "Text" : k === "image" ? "Image" : "YouTube"}
          </button>
        ))}
      </div>

      {draft.kind === "text" && (
        <textarea
          className="min-h-24 w-full flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-900"
          value={draft.body ?? ""}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          placeholder="Write lesson content..."
        />
      )}

      {draft.kind === "image" && (
        <ImagePasteZone
          src={draft.src}
          onChange={(src) => setDraft({ ...draft, src })}
        />
      )}

      {draft.kind === "youtube" && (
        <input
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-900"
          value={draft.src ?? ""}
          onChange={(e) => setDraft({ ...draft, src: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
      )}

      {/* Schedule inputs */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 pt-1">
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Calendar className="size-3" />
            Date
          </span>
          <input
            type="date"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-900"
            value={draft.date ?? ""}
            onChange={(e) => setDraft({ ...draft, date: e.target.value || undefined })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Clock className="size-3" />
            Time
          </span>
          <input
            type="time"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-900"
            value={draft.time ?? ""}
            onChange={(e) => setDraft({ ...draft, time: e.target.value || undefined })}
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Hourglass className="size-3" />
            Duration (minutes)
          </span>
          <input
            type="number"
            min={0}
            step={5}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-900"
            value={draft.duration ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                duration: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="e.g. 45"
          />
        </label>
      </div>
    </div>
  )
}

export const LessonNode = memo(LessonNodeInner)

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Downscale very large images before storing — localStorage caps at ~5MB.
async function processImageFile(file: File, maxEdge = 1600, quality = 0.85): Promise<string> {
  const raw = await fileToDataUrl(file)
  // Skip resize for SVG/GIF to preserve animation and vectors.
  if (file.type === "image/svg+xml" || file.type === "image/gif") return raw
  const img = new Image()
  img.crossOrigin = "anonymous"
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = raw
  })
  const { width, height } = img
  const longest = Math.max(width, height)
  if (longest <= maxEdge && raw.length < 900_000) return raw
  const scale = Math.min(1, maxEdge / longest)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) return raw
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  try {
    return canvas.toDataURL("image/jpeg", quality)
  } catch {
    return raw
  }
}

function ImagePasteZone({
  src,
  onChange,
}: {
  src?: string
  onChange: (src: string | undefined) => void
}) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = async (file: File | null) => {
    setError(null)
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("That isn't an image file.")
      return
    }
    try {
      const dataUrl = await processImageFile(file)
      onChange(dataUrl)
    } catch {
      setError("Couldn't read that image.")
    }
  }

  const onPaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        await handleFile(file)
        return
      }
    }
  }

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    await handleFile(file ?? null)
  }

  const pasteFromClipboardApi = async () => {
    setError(null)
    try {
      // Requires a user gesture + permissions on supporting browsers (Chromium/Safari).
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith("image/"))
        if (imgType) {
          const blob = await item.getType(imgType)
          const file = new File([blob], "pasted.png", { type: imgType })
          await handleFile(file)
          return
        }
      }
      setError("No image found on the clipboard.")
    } catch {
      setError("Your browser blocked clipboard access. Click the zone and press Ctrl/Cmd+V instead.")
    }
  }

  if (src) {
    return (
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src || "/placeholder.svg"}
          alt="Lesson preview"
          className="max-h-48 w-full rounded-md border border-slate-200 object-contain bg-slate-50"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Replace…
          </button>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        aria-label="Paste image from clipboard"
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => zoneRef.current?.focus()}
        className={cn(
          "flex min-h-28 cursor-text flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-3 py-4 text-center transition outline-none",
          isDragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 focus:border-indigo-500 focus:bg-indigo-50/50",
        )}
      >
        <ClipboardPaste className="size-5 text-slate-500" />
        <p className="text-xs font-medium text-slate-700">Click here, then press Ctrl/Cmd+V</p>
        <p className="text-[11px] text-slate-500">or drag an image here</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={pasteFromClipboardApi}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ClipboardPaste className="size-3.5" />
          Paste from clipboard
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          title="Upload file"
        >
          <Upload className="size-3.5" />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  )
}
