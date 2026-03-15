import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useUIStore } from '@/store/ui'
import { decode } from 'edumark-js'

const REPO_BASE = 'https://raw.githubusercontent.com/Debaq/edumark/main'
const DOCS_API = 'https://api.github.com/repos/Debaq/edumark/contents/docs'

interface DocTab {
  key: string
  label: string
  url: string
}

const LANG_LABELS: Record<string, string> = {
  EN: 'English',
  ES: 'Español',
  PT: 'Português',
  FR: 'Français',
  DE: 'Deutsch',
  IT: 'Italiano',
  ZH: '中文',
  JA: '日本語',
  KO: '한국어',
}

function labelForLang(code: string): string {
  return LANG_LABELS[code] ?? code
}

export function HelpModal() {
  const open = useUIStore((s) => s.helpModalOpen)
  const setOpen = useUIStore((s) => s.setHelpModalOpen)

  const [tabs, setTabs] = useState<DocTab[]>([])
  const [activeTab, setActiveTab] = useState('EN')
  const [cache, setCache] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Discover available translations on first open
  useEffect(() => {
    if (!open || tabs.length > 0) return

    const defaultTabs: DocTab[] = [
      { key: 'EN', label: 'English', url: `${REPO_BASE}/README.md` },
    ]

    fetch(DOCS_API)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((files: { name: string }[]) => {
        const translations = files
          .filter((f) => /^README_[A-Z]{2}\.md$/.test(f.name))
          .map((f) => {
            const code = f.name.replace('README_', '').replace('.md', '')
            return {
              key: code,
              label: labelForLang(code),
              url: `${REPO_BASE}/docs/${f.name}`,
            }
          })
        setTabs([...defaultTabs, ...translations])
      })
      .catch(() => {
        setTabs(defaultTabs)
      })
  }, [open, tabs.length])

  // Fetch content for active tab
  const fetchTab = useCallback(
    (tab: DocTab) => {
      if (cache[tab.key]) return
      setLoading(true)
      setError(false)
      fetch(tab.url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.text()
        })
        .then((md) => {
          setCache((prev) => ({ ...prev, [tab.key]: decode(md, { mode: 'student' }) }))
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false))
    },
    [cache]
  )

  // Load active tab content
  useEffect(() => {
    const tab = tabs.find((t) => t.key === activeTab)
    if (tab) fetchTab(tab)
  }, [activeTab, tabs, fetchTab])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-2xl
          w-full max-w-3xl max-h-[80vh] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-[var(--app-fg)]">Acerca de Edumark</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="flex gap-1 px-6 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-fg2)] hover:text-[var(--app-fg1)] hover:bg-[var(--app-bg2)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {loading && (
            <p className="text-sm text-[var(--app-fg3)]">Cargando...</p>
          )}
          {error && !loading && (
            <p className="text-sm text-red-400">Error al cargar la documentacion desde GitHub.</p>
          )}
          {cache[activeTab] && (
            <div
              className="edm-preview prose-help"
              dangerouslySetInnerHTML={{ __html: cache[activeTab] }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
