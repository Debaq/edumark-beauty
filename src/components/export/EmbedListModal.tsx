import { useState, useCallback } from 'react'
import { X, Copy, Check, Globe } from 'lucide-react'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { useUIStore } from '@/store/ui'

interface Props {
  open: boolean
  onClose: () => void
  /** 'embed' = solo preview, 'app' = app completa */
  variant: 'embed' | 'app'
}

export function EmbedListModal({ open, onClose, variant }: Props) {
  const chapters = useDocumentStore((s) => s.chapters)
  const sourceUrl = useDocumentStore((s) => s.sourceUrl)
  const filename = useDocumentStore((s) => s.filename)
  const activePreset = useThemeStore((s) => s.activePreset)
  const themeConfig = useThemeStore((s) => s.config)
  const addToast = useUIStore((s) => s.addToast)

  // If loaded from URL, derive base automatically (files are in the same directory)
  const autoBase = sourceUrl ? sourceUrl.replace(/[^/]+$/, '') : ''
  const [manualBase, setManualBase] = useState('')
  const baseUrl = autoBase || manualBase
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const themeParam = useCallback(() => {
    if (activePreset) return `&theme=${activePreset}`
    return `&theme=${btoa(JSON.stringify(themeConfig))}`
  }, [activePreset, themeConfig])

  const buildSnippet = useCallback((chapterPath: string) => {
    const fileUrl = baseUrl + chapterPath
    const appBase = `${window.location.origin}${window.location.pathname}`
    const encodedUrl = encodeURIComponent(fileUrl)
    const mode = variant === 'embed' ? '&mode=embed' : ''
    const height = variant === 'embed' ? '600' : '700'
    const url = `${appBase}?url=${encodedUrl}${mode}${themeParam()}`
    return `<iframe src="${url}" width="100%" height="${height}" frameborder="0" allowfullscreen style="border:none;border-radius:8px;"></iframe>`
  }, [baseUrl, variant, themeParam])

  const handleCopy = useCallback(async (idx: number, path: string) => {
    if (!baseUrl.trim()) {
      addToast('Ingresa la URL base donde estan alojados los archivos', 'error')
      return
    }
    const snippet = buildSnippet(path)
    await navigator.clipboard.writeText(snippet)
    setCopiedIdx(idx)
    addToast('Embed copiado', 'success')
    setTimeout(() => setCopiedIdx(null), 2000)
  }, [baseUrl, buildSnippet, addToast])

  const handleCopyAll = useCallback(async () => {
    if (!baseUrl.trim()) {
      addToast('Ingresa la URL base donde estan alojados los archivos', 'error')
      return
    }
    const all = chapters.map((ch) => buildSnippet(ch.path)).join('\n\n')
    await navigator.clipboard.writeText(all)
    addToast(`${chapters.length} embeds copiados`, 'success')
  }, [baseUrl, chapters, buildSnippet, addToast])

  if (!open) return null

  const title = variant === 'embed' ? 'Embeds solo lectura' : 'Embeds app completa'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-2xl p-6
          w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--app-fg)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Base URL: auto-detected from source or manual input */}
        <div className="mb-4">
          {autoBase ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--app-bg)]
              border border-[var(--app-border)]">
              <Globe size={14} className="text-green-400 shrink-0" />
              <span className="text-xs text-[var(--app-fg2)] truncate font-mono">{autoBase}</span>
            </div>
          ) : (
            <>
              <label className="text-xs text-[var(--app-fg2)] mb-1.5 block">
                URL base donde estan alojados los archivos .edm
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--app-bg)]
                border border-[var(--app-border)] focus-within:border-[var(--app-accent)] transition-all">
                <Globe size={14} className="text-[var(--app-fg3)] shrink-0" />
                <input
                  type="url"
                  value={manualBase}
                  onChange={(e) => setManualBase(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/user/repo/main/"
                  className="flex-1 bg-transparent text-sm text-[var(--app-fg)] placeholder:text-[var(--app-fg3)]
                    focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Chapter list */}
        <div className="flex-1 overflow-auto space-y-2 mb-4">
          {chapters.map((ch, idx) => (
            <div
              key={ch.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--app-bg)]
                border border-[var(--app-border)] hover:border-[var(--app-border-hover)] transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--app-fg)] truncate">{ch.title}</p>
                <p className="text-[11px] text-[var(--app-fg3)] font-mono truncate">{ch.path}</p>
              </div>
              <button
                onClick={() => handleCopy(idx, ch.path)}
                className="shrink-0 p-2 rounded-lg hover:bg-[var(--app-bg2)] transition-colors"
                title="Copiar embed"
              >
                {copiedIdx === idx
                  ? <Check size={16} className="text-green-400" />
                  : <Copy size={16} className="text-[var(--app-fg2)]" />
                }
              </button>
            </div>
          ))}
        </div>

        {/* Copy all */}
        <button
          onClick={handleCopyAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
            bg-[var(--app-accent)] text-white text-sm font-medium
            hover:opacity-90 transition-all"
        >
          <Copy size={16} />
          Copiar todos ({chapters.length})
        </button>
      </div>
    </div>
  )
}
