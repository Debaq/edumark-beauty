import { useCallback, useState, useRef, useEffect } from 'react'
import { Upload, FileText, Sparkles, Download, HelpCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useDocumentStore } from '@/store/document'
import { useUIStore } from '@/store/ui'
import { decodeAsync } from 'edumark-js'

const EXAMPLES_BASE_URL = 'https://raw.githubusercontent.com/Debaq/edumark/main/ejemplos/'
const SKILLS_API_URL = 'https://api.github.com/repos/Debaq/edumark/contents/llms'
const SKILLS_RAW_BASE = 'https://raw.githubusercontent.com/Debaq/edumark/main/llms/'

const EXAMPLE_FILES = [
  { file: 'capitulo_ejemplo.edm', label: 'Cinematica (Fisica)' },
  { file: 'U1_01_neurona_celulas_gliales.edm', label: 'Neurona y celulas gliales' },
] as const

interface GitHubFile {
  name: string
  download_url: string
}

export function Welcome() {
  const setSource = useDocumentStore((s) => s.setSource)
  const setFilename = useDocumentStore((s) => s.setFilename)
  const setHtml = useDocumentStore((s) => s.setHtml)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadContent = useCallback(
    async (text: string, name: string) => {
      setSource(text)
      setFilename(name)
      try {
        setHtml(await decodeAsync(text, { mode: 'teacher' }))
      } catch {
        setHtml('<p style="color:#f87171;">Error al parsear el documento.</p>')
      }
    },
    [setSource, setFilename, setHtml]
  )

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => loadContent(reader.result as string, file.name)
      reader.readAsText(file)
    },
    [loadContent]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const setHelpModalOpen = useUIStore((s) => s.setHelpModalOpen)
  const [skills, setSkills] = useState<GitHubFile[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [loadingExample, setLoadingExample] = useState<string | null>(null)

  useEffect(() => {
    setSkillsLoading(true)
    fetch(SKILLS_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((files: GitHubFile[]) => {
        setSkills(files.filter((f) => f.name.endsWith('.md') && f.name !== 'README.md'))
      })
      .catch(() => setSkills([]))
      .finally(() => setSkillsLoading(false))
  }, [])

  const handleLoadExample = useCallback(
    async (file: string) => {
      setLoadingExample(file)
      try {
        const res = await fetch(EXAMPLES_BASE_URL + file)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        loadContent(text, file)
      } catch {
        setHtml('<p style="color:#f87171;">Error al cargar el ejemplo desde GitHub.</p>')
      } finally {
        setLoadingExample(null)
      }
    },
    [loadContent, setHtml]
  )

  return (
    <div className="h-full flex items-center justify-center p-8"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(124,92,252,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(91,156,245,0.06) 0%, transparent 60%), var(--app-bg)',
      }}
    >
      <div className="max-w-lg w-full flex flex-col items-center gap-8 animate-in">
        {/* Logo / titulo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--app-accent)] flex items-center justify-center shadow-lg">
              <FileText size={24} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--app-fg)] mb-2">edumark-beauty</h1>
          <p className="text-sm text-[var(--app-fg2)]">
            Transforma tus documentos <span className="text-[var(--app-accent)] font-medium">.edm</span> en HTML, PDF y DOCX con estilo profesional
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all',
            isDragOver
              ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/5 scale-[1.02]'
              : 'border-[var(--app-border)] hover:border-[var(--app-border-hover)] hover:bg-[var(--app-bg1)]'
          )}
        >
          <div className="w-14 h-14 rounded-full bg-[var(--app-bg2)] flex items-center justify-center">
            <Upload size={24} className="text-[var(--app-fg2)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--app-fg1)]">
              Arrastra un archivo .edm aqui
            </p>
            <p className="text-xs text-[var(--app-fg3)] mt-1">
              o haz clic para seleccionar
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".edm,.md,.txt"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Separador */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-[var(--app-border)]" />
          <span className="text-xs text-[var(--app-fg3)]">o</span>
          <div className="flex-1 h-px bg-[var(--app-border)]" />
        </div>

        {/* Botones de ejemplos */}
        <div className="flex flex-col gap-2 w-full">
          <p className="text-xs text-[var(--app-fg3)] text-center mb-1">Cargar ejemplo desde GitHub</p>
          {EXAMPLE_FILES.map(({ file, label }) => (
            <button
              key={file}
              onClick={() => handleLoadExample(file)}
              disabled={loadingExample !== null}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--app-bg1)]
                border border-[var(--app-border)] text-sm font-medium text-[var(--app-fg1)]
                hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-all
                disabled:opacity-50 disabled:cursor-wait"
            >
              <Sparkles size={16} />
              {loadingExample === file ? 'Cargando...' : label}
            </button>
          ))}
        </div>

        {/* Prompts para LLMs */}
        {skills.length > 0 && (
          <>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-[var(--app-border)]" />
              <span className="text-xs text-[var(--app-fg3)]">prompts para LLMs</span>
              <div className="flex-1 h-px bg-[var(--app-border)]" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <p className="text-xs text-[var(--app-fg3)] text-center mb-1">
                Descarga un prompt para que tu IA genere archivos .edm
              </p>
              {skills.map((skill) => (
                <a
                  key={skill.name}
                  href={SKILLS_RAW_BASE + skill.name}
                  download={skill.name}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--app-bg1)]
                    border border-[var(--app-border)] text-sm font-medium text-[var(--app-fg1)]
                    hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-all"
                >
                  <Download size={16} />
                  {skill.name.replace('.md', '').replace(/_/g, ' ')}
                </a>
              ))}
            </div>
          </>
        )}
        {skillsLoading && (
          <p className="text-xs text-[var(--app-fg3)]">Cargando prompts...</p>
        )}

        {/* Ayuda */}
        <button
          onClick={() => setHelpModalOpen(true)}
          className="flex items-center gap-2 text-xs text-[var(--app-fg3)]
            hover:text-[var(--app-accent)] transition-colors mt-2"
        >
          <HelpCircle size={14} />
          ¿Que es Edumark?
        </button>
      </div>
    </div>
  )
}
