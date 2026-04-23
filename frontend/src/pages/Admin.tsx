import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import {
  createModule,
  deleteModule,
  deleteDocument,
  getDocuments,
  getModules,
} from '../lib/api'
import type { Module, Document } from '../lib/api'
import { UploadForm } from '../components/UploadForm'
import { cn } from '../lib/utils'

function statusIcon(status: string) {
  if (status === 'ingested') return <CheckCircle2 size={14} className="text-emerald-400" />
  if (status === 'error') return <XCircle size={14} className="text-red-400" />
  return <Clock size={14} className="text-zinc-400 animate-pulse" />
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('admin_key') ?? '')
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState('')

  const [modules, setModules] = useState<Module[]>([])
  const [docs, setDocs] = useState<Record<number, Document[]>>({})
  const [expanded, setExpanded] = useState<number | null>(null)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [createError, setCreateError] = useState('')

  const isAuthed = Boolean(adminKey)

  function saveKey() {
    if (!keyInput.trim()) return
    sessionStorage.setItem('admin_key', keyInput.trim())
    setAdminKey(keyInput.trim())
    setKeyError('')
  }

  function logout() {
    sessionStorage.removeItem('admin_key')
    setAdminKey('')
    setKeyInput('')
  }

  async function loadModules() {
    const mods = await getModules()
    setModules(mods)
  }

  async function loadDocs(moduleId: number) {
    const d = await getDocuments(moduleId)
    setDocs((prev) => ({ ...prev, [moduleId]: d }))
  }

  useEffect(() => {
    if (isAuthed) loadModules()
  }, [isAuthed])

  useEffect(() => {
    if (expanded !== null) loadDocs(expanded)
  }, [expanded])

  async function handleCreateModule(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      await createModule(newName.trim(), newDesc.trim(), adminKey)
      setNewName('')
      setNewDesc('')
      await loadModules()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 401) {
        setKeyError('Invalid admin key.')
        logout()
      } else {
        setCreateError(detail ?? 'Failed to create module.')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteModule(id: number) {
    if (!confirm('Delete this module and all its documents?')) return
    try {
      await deleteModule(id, adminKey)
      await loadModules()
      if (expanded === id) setExpanded(null)
    } catch (err: any) {
      if (err?.response?.status === 401) { setKeyError('Invalid admin key.'); logout() }
    }
  }

  async function handleDeleteDoc(moduleId: number, docId: number) {
    if (!confirm('Remove this document from the module?')) return
    try {
      await deleteDocument(moduleId, docId, adminKey)
      await loadDocs(moduleId)
      await loadModules()
    } catch (err: any) {
      if (err?.response?.status === 401) { setKeyError('Invalid admin key.'); logout() }
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft size={15} />
            Back
          </Link>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </div>

        {/* Auth gate */}
        {!isAuthed ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4 backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white">Enter Admin Key</h2>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                placeholder="Admin key…"
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500/50 transition"
              />
              <button
                onClick={saveKey}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:from-orange-400 hover:to-amber-400"
              >
                Enter
              </button>
            </div>
            {keyError && <p className="text-xs text-red-400">{keyError}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 backdrop-blur-sm">
              <p className="text-sm text-emerald-400">Authenticated as admin</p>
              <button onClick={logout} className="text-xs text-zinc-400 hover:text-white transition">
                Log out
              </button>
            </div>

            {/* Create module */}
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4 backdrop-blur-sm">
              <h2 className="text-sm font-semibold text-white">Create New Module</h2>
              <form onSubmit={handleCreateModule} className="space-y-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Module name (e.g. Login Flow, Test Module)"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500/50 transition"
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-orange-500/50 transition"
                />
                {createError && <p className="text-xs text-red-400">{createError}</p>}
                <button
                  type="submit"
                  disabled={!newName.trim() || creating}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/20 transition hover:from-orange-400 hover:to-amber-400 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Module
                </button>
              </form>
            </section>

            {/* Modules list */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white">Manage Modules</h2>

              {modules.length === 0 && (
                <p className="text-sm text-zinc-400">No modules yet. Create one above.</p>
              )}

              {modules.map((mod) => (
                <div key={mod.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden backdrop-blur-sm">
                  <div className="flex items-center justify-between px-5 py-4">
                    <button
                      onClick={() => toggleExpand(mod.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <ChevronDown
                        size={16}
                        className={cn('text-zinc-500 transition', expanded === mod.id && 'rotate-180')}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{mod.name}</p>
                        <p className="text-xs text-zinc-500">
                          {mod.document_count} {mod.document_count === 1 ? 'document' : 'documents'}
                          {mod.description && ` · ${mod.description}`}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteModule(mod.id)}
                      className="ml-4 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {expanded === mod.id && (
                    <div className="border-t border-white/[0.06] px-5 py-4 space-y-4">
                      {docs[mod.id]?.length > 0 && (
                        <ul className="space-y-2">
                          {docs[mod.id].map((doc) => (
                            <li key={doc.id} className="flex items-center justify-between rounded-xl bg-black/20 border border-white/[0.05] px-4 py-2.5 text-sm">
                              <div className="flex items-center gap-2 text-zinc-300">
                                {statusIcon(doc.status)}
                                <FileText size={13} className="text-zinc-500" />
                                <span className="truncate max-w-xs">{doc.filename}</span>
                                {doc.status === 'error' && doc.error_message && (
                                  <span className="text-xs text-red-400 truncate max-w-xs">— {doc.error_message}</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteDoc(mod.id, doc.id)}
                                className="ml-3 text-zinc-500 hover:text-red-400 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <UploadForm
                        moduleId={mod.id}
                        adminKey={adminKey}
                        onSuccess={() => { loadDocs(mod.id); loadModules() }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
