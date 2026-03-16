import { useCallback, useRef, useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface IncludeResolverModalProps {
  /** Nombre del .edmindex */
  indexFilename: string
  /** Lista de rutas que necesitan resolverse */
  requiredFiles: string[]
  /** Archivos ya cargados de pasadas anteriores (resolución recursiva) */
  initialFileMap?: Map<string, string>
  /** Llamado cuando el usuario completa la carga (o decide continuar con parciales) */
  onResolve: (fileMap: Map<string, string>) => void
  /** Llamado al cerrar/cancelar el modal */
  onCancel: () => void
}

type FileStatus = 'pending' | 'loaded' | 'error'

export function IncludeResolverModal({
  indexFilename,
  requiredFiles,
  initialFileMap,
  onResolve,
  onCancel,
}: IncludeResolverModalProps) {
  const [fileMap, setFileMap] = useState<Map<string, string>>(
    () => initialFileMap ? new Map(initialFileMap) : new Map()
  )
  const [statuses, setStatuses] = useState<Map<string, FileStatus>>(
    () => {
      const map = new Map<string, FileStatus>()
      for (const f of requiredFiles) {
        if (initialFileMap) {
          const base = f.split('/').pop() ?? f
          if (initialFileMap.has(f) || initialFileMap.has(base)) {
            map.set(f, 'loaded')
            continue
          }
        }
        map.set(f, 'pending')
      }
      return map
    }
  )
  const [dragOverFile, setDragOverFile] = useState<string | null>(null)
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const bulkInputRef = useRef<HTMLInputElement>(null)

  const loadedCount = Array.from(statuses.values()).filter((s) => s === 'loaded').length
  const allLoaded = loadedCount === requiredFiles.length

  /** Maneja la carga de un archivo para una ruta específica */
  const handleFileForPath = useCallback(
    (path: string, file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        setFileMap((prev) => {
          const next = new Map(prev)
          next.set(path, content)
          // También guardar por nombre base por si la ruta es relativa
          next.set(file.name, content)
          return next
        })
        setStatuses((prev) => {
          const next = new Map(prev)
          next.set(path, 'loaded')
          return next
        })
      }
      reader.onerror = () => {
        setStatuses((prev) => {
          const next = new Map(prev)
          next.set(path, 'error')
          return next
        })
      }
      reader.readAsText(file)
    },
    []
  )

  /** Input change para un archivo específico */
  const handleInputChange = useCallback(
    (path: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileForPath(path, file)
    },
    [handleFileForPath]
  )

  /** Drop sobre un slot específico */
  const handleSlotDrop = useCallback(
    (path: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOverFile(null)
      const file = e.dataTransfer.files[0]
      if (file) handleFileForPath(path, file)
    },
    [handleFileForPath]
  )

  /** Carga múltiple: asignar archivos por nombre */
  const handleBulkFiles = useCallback(
    (files: FileList) => {
      for (const file of files) {
        // Buscar qué ruta requerida coincide con este nombre de archivo
        const matchingPath = requiredFiles.find((p) => {
          const baseName = p.split('/').pop() ?? p
          return file.name === baseName || file.name === p
        })
        if (matchingPath) {
          handleFileForPath(matchingPath, file)
        }
      }
    },
    [requiredFiles, handleFileForPath]
  )

  const handleBulkInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleBulkFiles(e.target.files)
    },
    [handleBulkFiles]
  )

  /** Drop masivo en el área general */
  const handleBulkDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) {
        handleBulkFiles(e.dataTransfer.files)
      }
    },
    [handleBulkFiles]
  )

  const statusIcon = (status: FileStatus) => {
    switch (status) {
      case 'loaded':
        return <CheckCircle size={16} className="text-green-400" />
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      default:
        return <FileText size={16} className="text-[var(--app-fg3)]" />
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in"
      onClick={onCancel}
    >
      <div
        className="bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-2xl
          w-full max-w-xl max-h-[80vh] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--app-fg)]">
              Resolver referencias
            </h2>
            <p className="text-xs text-[var(--app-fg3)] mt-1">
              <span className="text-[var(--app-accent)] font-medium">{indexFilename}</span>
              {' '}requiere {requiredFiles.length} archivo{requiredFiles.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Zona para cargar todos de golpe */}
        <div
          className="mx-6 mb-3 p-3 border border-dashed border-[var(--app-border)] rounded-xl
            flex items-center justify-center gap-3 cursor-pointer
            hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)]/5 transition-all"
          onClick={() => bulkInputRef.current?.click()}
          onDrop={handleBulkDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload size={16} className="text-[var(--app-fg2)]" />
          <span className="text-xs text-[var(--app-fg2)]">
            Arrastra todos los archivos aqui o haz clic para seleccionar varios
          </span>
        </div>
        <input
          ref={bulkInputRef}
          type="file"
          accept=".edm,.md,.txt"
          multiple
          onChange={handleBulkInput}
          className="hidden"
        />

        {/* Lista de archivos requeridos */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="flex flex-col gap-2">
            {requiredFiles.map((path) => {
              const status = statuses.get(path) ?? 'pending'
              const isOver = dragOverFile === path

              return (
                <div
                  key={path}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    status === 'loaded'
                      ? 'border-green-500/30 bg-green-500/5'
                      : isOver
                        ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/5'
                        : 'border-[var(--app-border)] hover:border-[var(--app-border-hover)]'
                  )}
                  onDrop={(e) => handleSlotDrop(path, e)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverFile(path)
                  }}
                  onDragLeave={() => setDragOverFile(null)}
                >
                  {statusIcon(status)}

                  <span
                    className={clsx(
                      'flex-1 text-sm font-mono truncate',
                      status === 'loaded' ? 'text-[var(--app-fg1)]' : 'text-[var(--app-fg2)]'
                    )}
                  >
                    {path}
                  </span>

                  {status !== 'loaded' ? (
                    <button
                      onClick={() => fileInputRefs.current.get(path)?.click()}
                      className="px-3 py-1 rounded-lg text-xs font-medium
                        bg-[var(--app-bg2)] text-[var(--app-fg1)]
                        hover:bg-[var(--app-accent)] hover:text-white transition-all"
                    >
                      Subir
                    </button>
                  ) : (
                    <span className="text-xs text-green-400 font-medium">Cargado</span>
                  )}

                  <input
                    ref={(el) => {
                      if (el) fileInputRefs.current.set(path, el)
                    }}
                    type="file"
                    accept=".edm,.md,.txt"
                    onChange={(e) => handleInputChange(path, e)}
                    className="hidden"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-[var(--app-border)]">
          <span className="text-xs text-[var(--app-fg3)]">
            {loadedCount} de {requiredFiles.length} cargados
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm text-[var(--app-fg2)]
                hover:bg-[var(--app-bg2)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onResolve(fileMap)}
              className={clsx(
                'px-6 py-2 rounded-xl text-sm font-medium transition-all',
                allLoaded
                  ? 'bg-[var(--app-accent)] text-white hover:opacity-90'
                  : loadedCount > 0
                    ? 'bg-[var(--app-accent)]/60 text-white hover:bg-[var(--app-accent)]/80'
                    : 'bg-[var(--app-bg2)] text-[var(--app-fg3)] cursor-not-allowed'
              )}
              disabled={loadedCount === 0}
            >
              {allLoaded ? 'Cargar proyecto' : `Continuar (${loadedCount}/${requiredFiles.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
