import { useCallback, useState, useRef, useEffect } from 'react'
import { Upload, FilePlus, Sparkles, Download, HelpCircle, FolderOpen, Archive, Globe } from 'lucide-react'
import { clsx } from 'clsx'
import { useDocumentStore, extractTitle } from '@/store/document'
import type { Chapter } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { useUIStore } from '@/store/ui'
import { decodeAsync } from 'edumark-js'
import {
  isEdmIndex,
  isZipFile,
  resolveEdmIndex,
  parseIncludes,
  parseAllIncludes,
  findMissingRecursive,
  readDirectoryEntries,
  readFileList,
  readZipFile,
  findEdmIndex,
  fetchEdmIndexFromUrl,
} from '@/lib/edmindex'
import { IncludeResolverModal } from './IncludeResolverModal'

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

/** Estado pendiente del modal de includes */
interface PendingIndex {
  indexSource: string
  indexFilename: string
  requiredFiles: string[]
  /** Archivos ya cargados de pasadas anteriores del modal (resolución recursiva) */
  initialFileMap?: Map<string, string>
}

export function Welcome() {
  const setSource = useDocumentStore((s) => s.setSource)
  const setFilename = useDocumentStore((s) => s.setFilename)
  const setHtml = useDocumentStore((s) => s.setHtml)
  const loadProject = useDocumentStore((s) => s.loadProject)
  const addToast = useUIStore((s) => s.addToast)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

  // Estado para el modal de resolución de includes
  const [pendingIndex, setPendingIndex] = useState<PendingIndex | null>(null)

  /** Carga un .edm individual (no proyecto) */
  const loadContent = useCallback(
    async (text: string, name: string) => {
      useThemeStore.getState().loadThemeFromSource(text)
      useDocumentStore.getState().reset()
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

  /** Carga un .edmindex como proyecto con capítulos individuales */
  const loadEdmIndex = useCallback(
    async (indexSource: string, indexName: string, fileMap: Map<string, string>) => {
      // Todos los includes (en orden de aparición) para capítulos
      const allIncludes = parseAllIncludes(indexSource)
      // Solo @include() para resolución/inlining en merged
      const { resolved, missing } = resolveEdmIndex(indexSource, fileMap)

      if (missing.length > 0) {
        addToast(`${missing.length} archivo(s) no encontrado(s): ${missing.join(', ')}`, 'error')
      }

      // Construir capítulos de TODOS los tipos de include (en orden del source)
      const chapters: Chapter[] = []
      for (const path of allIncludes) {
        const baseName = path.split('/').pop() ?? path
        const content = fileMap.get(path) ?? fileMap.get(baseName)
        if (content != null) {
          let html: string
          try {
            html = await decodeAsync(content, { mode: 'teacher' })
          } catch {
            html = '<p style="color:#f87171;">Error al parsear este capitulo.</p>'
          }
          chapters.push({
            path,
            title: extractTitle(content, path),
            source: content,
            html,
          })
        }
      }

      // Decodificar versión fusionada (para modo libro)
      let mergedHtml: string
      try {
        mergedHtml = await decodeAsync(resolved, { mode: 'teacher' })
      } catch {
        mergedHtml = '<p style="color:#f87171;">Error al parsear el documento fusionado.</p>'
      }

      // Aplicar tema del índice
      useThemeStore.getState().loadThemeFromSource(resolved)

      loadProject({
        filename: indexName,
        indexSource,
        chapters,
        mergedSource: resolved,
        mergedHtml,
      })
    },
    [loadProject, addToast]
  )

  /** Procesa un fileMap completo (de carpeta, ZIP, etc.) */
  const processFileMap = useCallback(
    async (fileMap: Map<string, string>) => {
      const index = findEdmIndex(fileMap)
      if (index) {
        const [indexName, indexSource] = index
        await loadEdmIndex(indexSource, indexName, fileMap)
      } else {
        // Sin .edmindex: buscar primer .edm
        for (const [name, content] of fileMap) {
          if (name.endsWith('.edm')) {
            await loadContent(content, name)
            return
          }
        }
        addToast('No se encontro un archivo .edmindex ni .edm', 'error')
      }
    },
    [loadEdmIndex, loadContent, addToast]
  )

  /** Maneja un archivo individual */
  const handleFile = useCallback(
    async (file: File) => {
      // ZIP
      if (isZipFile(file)) {
        try {
          const fileMap = await readZipFile(file)
          await processFileMap(fileMap)
        } catch {
          addToast('Error al leer el archivo ZIP', 'error')
        }
        return
      }

      // .edmindex suelto → extraer TODOS los includes y abrir modal
      if (isEdmIndex(file.name)) {
        const reader = new FileReader()
        reader.onload = () => {
          const text = reader.result as string
          const required = parseAllIncludes(text)

          if (required.length > 0) {
            // Abrir modal para que el usuario suba los archivos
            setPendingIndex({
              indexSource: text,
              indexFilename: file.name,
              requiredFiles: required,
            })
          } else {
            // .edmindex sin ningún tipo de include → error
            addToast('El .edmindex no contiene referencias @include ni :::include', 'error')
          }
        }
        reader.readAsText(file)
        return
      }

      // Archivo .edm/.md/.txt normal
      const reader = new FileReader()
      reader.onload = () => {
        loadContent(reader.result as string, file.name)
      }
      reader.readAsText(file)
    },
    [loadContent, processFileMap, addToast]
  )

  /** Callback del modal: el usuario terminó de subir archivos */
  const handleIncludeResolve = useCallback(
    async (fileMap: Map<string, string>) => {
      if (!pendingIndex) return

      // Fusionar con archivos de pasadas anteriores
      const mergedMap = new Map<string, string>()
      if (pendingIndex.initialFileMap) {
        for (const [k, v] of pendingIndex.initialFileMap) mergedMap.set(k, v)
      }
      for (const [k, v] of fileMap) mergedMap.set(k, v)

      // Buscar dependencias transitivas en los archivos recién cargados
      const missing = findMissingRecursive(pendingIndex.indexSource, mergedMap)

      if (missing.length > 0) {
        // Faltan archivos → extender modal con las nuevas dependencias
        setPendingIndex({
          indexSource: pendingIndex.indexSource,
          indexFilename: pendingIndex.indexFilename,
          requiredFiles: [...new Set([...pendingIndex.requiredFiles, ...missing])],
          initialFileMap: mergedMap,
        })
        return
      }

      setPendingIndex(null)
      await loadEdmIndex(pendingIndex.indexSource, pendingIndex.indexFilename, mergedMap)
    },
    [pendingIndex, loadEdmIndex]
  )

  /** Maneja el drop de carpetas o archivos */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const items = e.dataTransfer.items
      if (!items || items.length === 0) {
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
        return
      }

      // Verificar si es una carpeta
      const firstEntry = items[0].webkitGetAsEntry?.()
      if (firstEntry?.isDirectory) {
        const fileMap = await readDirectoryEntries(firstEntry as FileSystemDirectoryEntry)
        await processFileMap(fileMap)
        return
      }

      // Es un archivo suelto
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile, processFileMap]
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

  /** Maneja la selección de carpeta via input[webkitdirectory] */
  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      const fileMap = await readFileList(files)
      await processFileMap(fileMap)
    },
    [processFileMap]
  )

  /** Maneja input de ZIP */
  const handleZipInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const setHelpModalOpen = useUIStore((s) => s.setHelpModalOpen)
  const setSourceUrl = useDocumentStore((s) => s.setSourceUrl)
  const [skills, setSkills] = useState<GitHubFile[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [loadingExample, setLoadingExample] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)

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

  const handleLoadFromUrl = useCallback(async () => {
    const url = urlInput.trim()
    if (!url) return
    setUrlLoading(true)
    try {
      if (isEdmIndex(url)) {
        // Fetch edmindex + all referenced files
        const { indexSource, indexName, fileMap } = await fetchEdmIndexFromUrl(url)
        setSourceUrl(url)
        await loadEdmIndex(indexSource, indexName, fileMap)
      } else {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        const name = url.split('/').pop()?.split('?')[0] || 'remote.edm'
        await loadContent(text, name)
        setSourceUrl(url)
      }
    } catch {
      addToast('No se pudo cargar el archivo desde la URL', 'error')
    } finally {
      setUrlLoading(false)
    }
  }, [urlInput, loadContent, loadEdmIndex, setSourceUrl, addToast])

  const handleNewDocument = useCallback(() => {
    const template = '# New document\n\nStart writing here...\n'
    loadContent(template, 'new_document.edm')
  }, [loadContent])

  const handleLoadExample = useCallback(
    async (file: string) => {
      setLoadingExample(file)
      try {
        const res = await fetch(EXAMPLES_BASE_URL + file + '?t=' + Date.now())
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
            <img src={`${import.meta.env.BASE_URL}icon-192.webp`} alt="Edumark" className="w-12 h-12 rounded-xl shadow-lg" />
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
              Arrastra un archivo, carpeta o ZIP aqui
            </p>
            <p className="text-xs text-[var(--app-fg3)] mt-1">
              .edm, .edmindex, .zip — o haz clic para seleccionar
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".edm,.edmindex,.zip,.md,.txt"
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is a non-standard attribute
          webkitdirectory=""
          onChange={handleFolderInput}
          className="hidden"
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          onChange={handleZipInput}
          className="hidden"
        />

        {/* Botones principales */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleNewDocument}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl
              bg-[var(--app-accent)] text-white text-sm font-medium
              hover:opacity-90 transition-all"
          >
            <FilePlus size={18} />
            Nuevo documento
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            title="Abrir carpeta con .edmindex"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-[var(--app-bg1)] border border-[var(--app-border)] text-sm font-medium
              text-[var(--app-fg1)] hover:border-[var(--app-accent)]
              hover:text-[var(--app-accent)] transition-all"
          >
            <FolderOpen size={18} />
          </button>
          <button
            onClick={() => zipInputRef.current?.click()}
            title="Abrir archivo .zip"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-[var(--app-bg1)] border border-[var(--app-border)] text-sm font-medium
              text-[var(--app-fg1)] hover:border-[var(--app-accent)]
              hover:text-[var(--app-accent)] transition-all"
          >
            <Archive size={18} />
          </button>
        </div>

        {/* Abrir desde URL */}
        {!showUrlInput ? (
          <button
            onClick={() => setShowUrlInput(true)}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl
              bg-[var(--app-bg1)] border border-[var(--app-border)] text-sm font-medium
              text-[var(--app-fg1)] hover:border-[var(--app-accent)]
              hover:text-[var(--app-accent)] transition-all"
          >
            <Globe size={18} />
            Abrir desde URL
          </button>
        ) : (
          <div className="flex gap-2 w-full">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadFromUrl()}
              placeholder="https://ejemplo.com/archivo.edm"
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--app-bg1)] border border-[var(--app-border)]
                text-sm text-[var(--app-fg)] placeholder:text-[var(--app-fg3)]
                focus:border-[var(--app-accent)] focus:outline-none transition-all"
            />
            <button
              onClick={handleLoadFromUrl}
              disabled={urlLoading || !urlInput.trim()}
              className="px-4 py-3 rounded-xl bg-[var(--app-accent)] text-white text-sm font-medium
                hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {urlLoading ? '...' : 'Cargar'}
            </button>
          </div>
        )}

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

      {/* Modal de resolución de includes */}
      {pendingIndex && (
        <IncludeResolverModal
          key={pendingIndex.requiredFiles.join(',')}
          indexFilename={pendingIndex.indexFilename}
          requiredFiles={pendingIndex.requiredFiles}
          initialFileMap={pendingIndex.initialFileMap}
          onResolve={handleIncludeResolve}
          onCancel={() => setPendingIndex(null)}
        />
      )}
    </div>
  )
}
