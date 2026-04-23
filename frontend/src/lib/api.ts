import axios from 'axios'

const API_ORIGIN = import.meta.env.VITE_BACKEND_URL ?? ''

const api = axios.create({ baseURL: `${API_ORIGIN}/api` })

export interface Module {
  id: number
  name: string
  slug: string
  description: string
  document_count: number
}

export interface Document {
  id: number
  filename: string
  status: 'pending' | 'ingested' | 'error'
  error_message: string | null
  created_at: string
}

export interface ChatSession {
  id: number
  module_id: number
  title: string
  created_at: string
}

export interface MessageResponse {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources: string[]
  created_at: string
}

export type StreamEvent =
  | { type: 'sources'; sources: string[] }
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

// ── Modules ────────────────────────────────────────────────────────────────────

export const getModules = (): Promise<Module[]> =>
  api.get('/modules').then((r) => r.data)

export const getModule = (id: number): Promise<Module> =>
  api.get(`/modules/${id}`).then((r) => r.data)

export const createModule = (
  name: string,
  description: string,
  adminKey: string,
): Promise<Module> =>
  api
    .post('/modules', { name, description }, { headers: { 'x-admin-key': adminKey } })
    .then((r) => r.data)

export const deleteModule = (id: number, adminKey: string): Promise<void> =>
  api.delete(`/modules/${id}`, { headers: { 'x-admin-key': adminKey } }).then(() => undefined)

// ── Documents ─────────────────────────────────────────────────────────────────

export const getDocuments = (moduleId: number): Promise<Document[]> =>
  api.get(`/modules/${moduleId}/documents`).then((r) => r.data)

export const uploadDocument = (
  moduleId: number,
  file: File,
  adminKey: string,
): Promise<Document> => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post(`/modules/${moduleId}/upload`, form, {
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const deleteDocument = (
  moduleId: number,
  docId: number,
  adminKey: string,
): Promise<void> =>
  api
    .delete(`/modules/${moduleId}/documents/${docId}`, { headers: { 'x-admin-key': adminKey } })
    .then(() => undefined)

// ── Sessions ──────────────────────────────────────────────────────────────────

export const getSessions = (moduleId: number): Promise<ChatSession[]> =>
  api.get(`/modules/${moduleId}/sessions`).then((r) => r.data)

export const createSession = (moduleId: number): Promise<ChatSession> =>
  api.post(`/modules/${moduleId}/sessions`).then((r) => r.data)

export const deleteSession = (sessionId: number): Promise<void> =>
  api.delete(`/sessions/${sessionId}`).then(() => undefined)

export const getMessages = (sessionId: number): Promise<MessageResponse[]> =>
  api.get(`/sessions/${sessionId}/messages`).then((r) => r.data)

// ── Streaming Chat ─────────────────────────────────────────────────────────────

export function streamChat(
  sessionId: number,
  question: string,
  onEvent: (event: StreamEvent) => void,
): () => void {
  const controller = new AbortController()

  fetch(`${API_ORIGIN}/api/sessions/${sessionId}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal: controller.signal,
  })
    .then(async (res) => {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(line.slice(6)) as StreamEvent)
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onEvent({ type: 'error', message: err.message as string })
      }
    })

  return () => controller.abort()
}
