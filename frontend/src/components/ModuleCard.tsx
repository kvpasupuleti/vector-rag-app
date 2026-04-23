import { BookOpen, MessageSquare, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Module } from '../lib/api'
import { cn } from '../lib/utils'

interface ModuleCardProps {
  module: Module
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition duration-200 hover:border-orange-500/30 hover:bg-white/[0.05]">
      {/* Subtle glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100 [background:radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(249,115,22,0.06),transparent)]" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
          <BookOpen size={22} />
        </div>
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
            module.document_count === 0
              ? 'bg-white/[0.06] text-zinc-400'
              : 'bg-emerald-500/10 text-emerald-400',
          )}
        >
          <FileText size={12} />
          {module.document_count} {module.document_count === 1 ? 'doc' : 'docs'}
        </span>
      </div>

      <div>
        <h3 className="text-base font-semibold text-white">{module.name}</h3>
        {module.description && (
          <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{module.description}</p>
        )}
      </div>

      <Link
        to={`/modules/${module.id}`}
        className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/20 transition hover:from-orange-400 hover:to-amber-400"
      >
        <MessageSquare size={15} />
        Chat with this module
      </Link>
    </div>
  )
}
