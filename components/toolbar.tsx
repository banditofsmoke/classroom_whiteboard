"use client"

import { FileText, ImageIcon, Youtube, Download, Upload, Trash2, GraduationCap, LogOut } from "lucide-react"
import type { CardKind } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ToolbarProps {
  boardName: string
  setBoardName: (n: string) => void
  onAdd: (kind: CardKind) => void
  onExport: () => void
  onImport: () => void
  onClear: () => void
  onLogout?: () => void
}

export function Toolbar({
  boardName,
  setBoardName,
  onAdd,
  onExport,
  onImport,
  onClear,
  onLogout,
}: ToolbarProps) {
  return (
    <header className="relative z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-2.5">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white">
          <GraduationCap className="size-4" />
        </div>
        <input
          className="w-56 bg-transparent text-sm font-semibold text-slate-900 outline-none focus:bg-slate-50 rounded px-1.5 py-1"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          aria-label="Board name"
        />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs uppercase tracking-wide text-slate-400 mr-1">Add</span>
        <ToolButton icon={<FileText className="size-3.5" />} label="Text" onClick={() => onAdd("text")} />
        <ToolButton icon={<ImageIcon className="size-3.5" />} label="Image" onClick={() => onAdd("image")} />
        <ToolButton icon={<Youtube className="size-3.5" />} label="YouTube" onClick={() => onAdd("youtube")} />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {onLogout && (
          <ToolButton icon={<LogOut className="size-3.5" />} label="Logout" onClick={onLogout} variant="ghost" />
        )}
        <ToolButton icon={<Upload className="size-3.5" />} label="Import" onClick={onImport} variant="ghost" />
        <ToolButton icon={<Download className="size-3.5" />} label="Export" onClick={onExport} variant="ghost" />
        <ToolButton
          icon={<Trash2 className="size-3.5" />}
          label="Clear"
          onClick={onClear}
          variant="danger"
        />
      </div>
    </header>
  )
}

function ToolButton({
  icon,
  label,
  onClick,
  variant = "primary",
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: "primary" | "ghost" | "danger"
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border transition",
        variant === "primary" && "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
        variant === "ghost" && "bg-transparent text-slate-600 border-transparent hover:bg-slate-100",
        variant === "danger" && "bg-transparent text-rose-600 border-transparent hover:bg-rose-50",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
