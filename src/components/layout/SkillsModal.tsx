import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { useUIStore } from '@/store/ui'

const SKILLS_API_URL = 'https://api.github.com/repos/Debaq/edumark/contents/llms'
const SKILLS_RAW_BASE = 'https://raw.githubusercontent.com/Debaq/edumark/main/llms/'

interface GitHubFile {
  name: string
  download_url: string
}

export function SkillsModal() {
  const open = useUIStore((s) => s.skillsModalOpen)
  const setOpen = useUIStore((s) => s.setSkillsModalOpen)
  const [skills, setSkills] = useState<GitHubFile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || skills.length > 0) return
    setLoading(true)
    fetch(SKILLS_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((files: GitHubFile[]) => {
        setSkills(files.filter((f) => f.name.endsWith('.md') && f.name !== 'README.md'))
      })
      .catch(() => setSkills([]))
      .finally(() => setLoading(false))
  }, [open, skills.length])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-2xl p-6
          w-full max-w-md shadow-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--app-fg)]">Prompts para LLMs</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[var(--app-fg3)] mb-4">
          Descarga un prompt para que tu IA genere archivos .edm
        </p>

        {loading && (
          <p className="text-xs text-[var(--app-fg3)] text-center py-4">Cargando prompts...</p>
        )}

        {!loading && skills.length === 0 && (
          <p className="text-xs text-[var(--app-fg3)] text-center py-4">No se encontraron prompts</p>
        )}

        <div className="flex flex-col gap-3">
          {skills.map((skill) => (
            <a
              key={skill.name}
              href={SKILLS_RAW_BASE + skill.name}
              download={skill.name}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--app-border)]
                hover:border-[var(--app-border-hover)] hover:bg-[var(--app-bg2)] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--app-bg)] flex items-center justify-center shrink-0">
                <Download size={20} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--app-fg)]">
                  {skill.name.replace('.md', '').replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-[var(--app-fg3)]">{skill.name}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
