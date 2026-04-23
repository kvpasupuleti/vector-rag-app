import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Send, ChevronDown, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MessageResponse } from '../lib/api'
import { getMessages, streamChat } from '../lib/api'
import { cn } from '../lib/utils'

interface ChatWindowProps {
  moduleName: string
  sessionId: number
  onTitleChange: (title: string) => void
}

interface UIMessage {
  role: 'user' | 'assistant'
  content: string
  sources: string[]
}

export function ChatWindow({ moduleName, sessionId, onTitleChange }: ChatWindowProps) {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedSources, setExpandedSources] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setMessages([])
    getMessages(sessionId).then((msgs: MessageResponse[]) => {
      setMessages(msgs.map((m) => ({ role: m.role, content: m.content, sources: m.sources })))
    })
    return () => abortRef.current?.()
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /** Grow height with wrapped lines: collapse first so scrollHeight reflects line-wrapped layout. */
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.overflowY = 'hidden'
    el.style.height = '0px'
    const full = el.scrollHeight
    const cap = 200
    const next = Math.min(full, cap)
    el.style.height = `${Math.max(next, 48)}px`
    el.style.overflowY = full > cap ? 'auto' : 'hidden'
  }, [input])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    const isFirstMessage = messages.length === 0

    setInput('')
    setLoading(true)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question, sources: [] },
      { role: 'assistant', content: '', sources: [] },
    ])

    let capturedSources: string[] = []

    abortRef.current = streamChat(sessionId, question, (event) => {
      if (event.type === 'sources') {
        capturedSources = event.sources
      } else if (event.type === 'token') {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + event.token }
          }
          return updated
        })
      } else if (event.type === 'done') {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, sources: capturedSources }
          }
          return updated
        })
        setLoading(false)
      } else if (event.type === 'error') {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: event.message || 'Something went wrong. Please try again.',
            }
          }
          return updated
        })
        setLoading(false)
      }
    })

    if (isFirstMessage) {
      onTitleChange(question.slice(0, 50))
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {messages.length === 0 && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
            <FileText size={28} />
          </div>
          <p className="text-lg font-semibold text-white">Ask about {moduleName}</p>
          <p className="max-w-sm text-sm text-zinc-500">
            Ask any question and the AI will answer strictly from the module's documents.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex min-w-0 gap-2 sm:gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-orange-500 to-amber-400 text-white'
                    : 'bg-white/[0.08] text-zinc-300',
                )}
              >
                {msg.role === 'user' ? 'Y' : 'AI'}
              </div>

              <div className="flex min-w-0 max-w-[88%] flex-col gap-1.5 sm:max-w-[80%]">
                {/* Bubble */}
                <div
                  className={cn(
                    'min-w-0 [overflow-wrap:anywhere] rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:px-4 sm:py-3 break-words',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-tr-sm shadow-md shadow-orange-500/20'
                      : 'border border-white/[0.07] bg-white/[0.04] text-zinc-200 rounded-tl-sm backdrop-blur-sm',
                  )}
                >
                  {msg.role === 'assistant' ? (
                    msg.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => (
                            <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => <li className="text-zinc-200">{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-semibold text-white">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-zinc-300">{children}</em>
                          ),
                          h1: ({ children }) => (
                            <h1 className="mb-2 text-base font-bold text-white">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="mb-1.5 text-sm font-bold text-white">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="mb-1 text-sm font-semibold text-white">{children}</h3>
                          ),
                          code: ({ className, children }) => {
                            const isBlock = !!className
                            return isBlock ? (
                              <code className="block text-xs font-mono text-orange-300">
                                {children}
                              </code>
                            ) : (
                              <code className="rounded bg-black/30 px-1 py-0.5 text-xs font-mono text-orange-300">
                                {children}
                              </code>
                            )
                          },
                          pre: ({ children }) => (
                            <pre className="mb-2 overflow-x-auto rounded-lg border border-white/[0.06] bg-black/30 p-3">
                              {children}
                            </pre>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="mb-2 border-l-2 border-orange-500/60 pl-3 text-zinc-400 italic">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="my-2 border-white/10" />,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="text-orange-400 underline hover:text-orange-300"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      loading &&
                      i === messages.length - 1 && (
                        <div className="flex gap-1.5 py-0.5">
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce"
                              style={{ animationDelay: `${d * 150}ms` }}
                            />
                          ))}
                        </div>
                      )
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>

                {/* Sources toggle */}
                {msg.role === 'assistant' && msg.sources.length > 0 && (
                  <button
                    onClick={() => setExpandedSources(expandedSources === i ? null : i)}
                    className="flex items-center gap-1 self-start rounded-lg bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-400 transition hover:text-zinc-200"
                  >
                    <FileText size={12} />
                    {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                    <ChevronDown
                      size={12}
                      className={cn('transition', expandedSources === i && 'rotate-180')}
                    />
                  </button>
                )}

                {expandedSources === i && msg.sources.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-zinc-400 space-y-1">
                    {msg.sources.map((s, j) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <FileText size={11} className="text-zinc-500" />
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input — wrapper must own flex-1 + min-w-0 so textarea width is bounded and text wraps */}
      <form onSubmit={handleSubmit} className="mt-4 flex min-w-0 shrink-0 items-end gap-2">
        <div className="min-w-0 max-w-full flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            wrap="soft"
            placeholder={`Ask anything about ${moduleName}…`}
            className="box-border block max-h-[200px] min-h-12 w-full max-w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-5 text-white whitespace-pre-wrap [overflow-wrap:anywhere] break-words placeholder-zinc-500 outline-none backdrop-blur-sm transition focus:border-orange-500/50 focus:bg-white/[0.07]"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
