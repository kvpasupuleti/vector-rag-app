import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Zap } from 'lucide-react'
import { getModules } from '../lib/api'
import type { Module } from '../lib/api'
import { ModuleCard } from '../components/ModuleCard'

export default function Home() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getModules()
      .then(setModules)
      .catch(() => setError('Failed to load modules. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-bold text-white shadow-lg shadow-orange-500/25">
              KB
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                RAG{' '}
                <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  Knowledge Base
                </span>
              </h1>
              <p className="text-xs text-zinc-500">Ask questions from your team's documents</p>
            </div>
          </div>
          <Link
            to="/admin"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
          >
            <Settings size={15} />
            Admin
          </Link>
        </div>

        {/* Hero tag */}
        <div className="mb-8 flex items-center gap-2">
          <Zap size={13} className="text-orange-400" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            RAG · Knowledge Base
          </span>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && modules.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-zinc-400">No modules yet.</p>
            <Link
              to="/admin"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-400 hover:to-amber-400"
            >
              Go to Admin view to create one
            </Link>
          </div>
        )}

        {!loading && !error && modules.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
