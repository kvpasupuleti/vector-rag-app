import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { uploadDocument } from '../lib/api'
import { cn } from '../lib/utils'

interface UploadFormProps {
  moduleId: number
  adminKey: string
  onSuccess: () => void
}

export function UploadForm({ moduleId, adminKey, onSuccess }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ name: string; ok: boolean; msg?: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const pdfs = Array.from(incoming).filter((f) => f.name.toLowerCase().endsWith('.pdf'))
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...pdfs.filter((f) => !existing.has(f.name))]
    })
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    if (!files.length || uploading) return
    setUploading(true)
    setResults([])
    const out: typeof results = []
    for (const file of files) {
      try {
        await uploadDocument(moduleId, file, adminKey)
        out.push({ name: file.name, ok: true })
      } catch (err: any) {
        out.push({ name: file.name, ok: false, msg: err?.response?.data?.detail ?? 'Upload failed' })
      }
    }
    setResults(out)
    setFiles([])
    setUploading(false)
    if (out.some((r) => r.ok)) onSuccess()
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition',
          dragging
            ? 'border-orange-500 bg-orange-500/5'
            : 'border-white/10 hover:border-orange-500/40 hover:bg-orange-500/[0.02]',
        )}
      >
        <Upload size={28} className="text-zinc-500" />
        <div>
          <p className="text-sm font-medium text-zinc-300">Drop PDFs here or click to select</p>
          <p className="mt-0.5 text-xs text-zinc-500">PDF files only</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2 text-zinc-300">
                <FileText size={14} className="text-zinc-500" />
                <span className="truncate max-w-xs">{f.name}</span>
              </div>
              <button onClick={() => removeFile(f.name)} className="text-zinc-500 hover:text-red-400 transition">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-medium text-white shadow-md shadow-orange-500/20 transition hover:from-orange-400 hover:to-amber-400 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading & indexing…' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
        </button>
      )}

      {results.length > 0 && (
        <ul className="space-y-1.5">
          {results.map((r) => (
            <li key={r.name} className={cn('rounded-lg px-3 py-2 text-xs', r.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
              {r.ok ? '✓' : '✗'} {r.name}{r.msg ? ` — ${r.msg}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
