import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Plus, MessageSquare, Pencil, Trash2, PanelLeft, X } from 'lucide-react'
import { getModule, getSessions, createSession, deleteSession, renameSession, logUsage } from '../lib/api'
import type { Module, ChatSession } from '../lib/api'
import { ChatWindow } from '../components/ChatWindow'
import { AppSidebar } from '../components/AppSidebar'
import type { NavItem } from '../components/AppSidebar'
import { UsagePanel } from '../components/UsagePanel'
import { cn } from '../lib/utils'

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const moduleId = Number(id)
  const [module, setModule] = useState<Module | null>(null)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getModule(moduleId)
      .then(setModule)
      .catch(() => setError('Module not found.'))
  }, [moduleId])

  useEffect(() => {
    if (!module) return
    getSessions(moduleId).then((list) => {
      setSessions(list)
      if (list.length > 0) setActiveSessionId(list[0].id)
    })
  }, [module, moduleId])

  async function handleNewChat() {
    const session = await createSession(moduleId)
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setSidebarOpen(false)
  }

  async function handleDeleteSession(sessionId: number, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteSession(sessionId)
    const remaining = sessions.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  function handleSessionSelect(sessionId: number) {
    setActiveSessionId(sessionId)
    setSidebarOpen(false)
  }

  function handleSessionTitleChange(sessionId: number, title: string) {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)))
  }

  function startEditing(sessionId: number, currentTitle: string, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingSessionId(sessionId)
    setEditingTitle(currentTitle)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  async function commitRename(sessionId: number) {
    const trimmed = editingTitle.trim()
    if (trimmed && trimmed !== sessions.find((s) => s.id === sessionId)?.title) {
      const updated = await renameSession(sessionId, trimmed)
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)))
    }
    setEditingSessionId(null)
  }

  function cancelEditing() {
    setEditingSessionId(null)
  }

  function handleNavChange(nav: NavItem) {
    setActiveNav(nav)
    if (nav === 'home') setSidebarOpen(false)
  }

  function handleMessageSent() {
    logUsage({ session_id: activeSessionId ?? undefined, module_id: moduleId }).catch(() => {
      // fire-and-forget — ignore errors
    })
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">{error}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-orange-400 hover:text-orange-300">
            Back to modules
          </Link>
        </div>
      </div>
    )
  }

  const sessionSidebarContent = (
    <>
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-300 transition hover:border-orange-500/40 hover:text-white"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 px-2 pb-3">
        {sessions.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-zinc-600">No chats yet</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => editingSessionId !== s.id && handleSessionSelect(s.id)}
            className={cn(
              'group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition',
              activeSessionId === s.id
                ? 'bg-orange-500/15 text-white'
                : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white',
            )}
          >
            <MessageSquare size={13} className="shrink-0" />
            {editingSessionId === s.id ? (
              <input
                ref={editInputRef}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => commitRename(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitRename(s.id) }
                  if (e.key === 'Escape') { e.preventDefault(); cancelEditing() }
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 rounded bg-white/[0.08] px-1.5 py-0.5 text-xs text-white outline-none ring-1 ring-orange-500/60 focus:ring-orange-400"
              />
            ) : (
              <span
                className="flex-1 truncate text-xs"
                onDoubleClick={(e) => startEditing(s.id, s.title, e)}
              >
                {s.title}
              </span>
            )}
            <Pencil
              size={13}
              className="shrink-0 opacity-0 transition group-hover:opacity-100 hover:text-orange-400"
              onClick={(e) => startEditing(s.id, s.title, e)}
            />
            <Trash2
              size={13}
              className="shrink-0 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
              onClick={(e) => handleDeleteSession(s.id, e)}
            />
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-white md:hidden"
        >
          <PanelLeft size={17} />
        </button>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Modules</span>
        </Link>

        {module && (
          <>
            <span className="text-zinc-700">/</span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <BookOpen size={13} />
              </div>
              <span className="truncate text-sm font-medium text-white">{module.name}</span>
              {module.description && (
                <span className="hidden text-xs text-zinc-500 lg:block">
                  — {module.description}
                </span>
              )}
            </div>
          </>
        )}
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Mobile backdrop for session sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* App navigation sidebar — always visible */}
        <AppSidebar activeNav={activeNav} onNavChange={handleNavChange} />

        {/* Usage panel — visible on desktop when usage nav is active */}
        {activeNav === 'usage' && (
          <div className="hidden md:flex">
            <UsagePanel />
          </div>
        )}

        {/* Session list sidebar — drawer on mobile, static on desktop when home nav is active */}
        {activeNav !== 'usage' && (
          <aside
            className={cn(
              'flex flex-col border-r border-white/[0.07] bg-[#09090b] transition-transform duration-300',
              'fixed inset-y-0 left-0 z-30 w-72 md:relative md:inset-auto md:z-auto md:w-60 md:translate-x-0 md:shrink-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {/* Mobile drawer header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 md:hidden">
              <span className="text-sm font-medium text-white">Chats</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {sessionSidebarContent}
          </aside>
        )}

        {/* Chat area */}
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden px-3 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-3xl flex-col">
            {activeNav === 'usage' ? (
              /* Mobile usage panel shown in main area */
              <div className="md:hidden flex-1">
                <UsagePanel />
              </div>
            ) : !module ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
              </div>
            ) : activeSessionId ? (
              <ChatWindow
                key={activeSessionId}
                moduleName={module.name}
                sessionId={activeSessionId}
                onTitleChange={(title) => handleSessionTitleChange(activeSessionId, title)}
                onMessageSent={handleMessageSent}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                  <MessageSquare size={28} />
                </div>
                <p className="text-sm text-zinc-400">
                  Tap <strong className="text-white">the sidebar icon</strong> to start a new chat.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
