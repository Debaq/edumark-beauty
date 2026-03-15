import { useCallback } from 'react'
import { X, FileCode, Copy, FileImage, FileText } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { exportFullHtml } from '@/lib/exportHtml'
import { copyHtmlSnippet } from '@/lib/exportSnippet'
import { exportPdf } from '@/lib/exportPdf'
import { exportDocx } from '@/lib/exportDocx'
import { saveAs } from 'file-saver'

interface ExportCard {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  desc: string
  color: string
  action: () => void
}

export function ExportModal() {
  const open = useUIStore((s) => s.exportModalOpen)
  const setOpen = useUIStore((s) => s.setExportModalOpen)
  const addToast = useUIStore((s) => s.addToast)
  const html = useDocumentStore((s) => s.html)
  const filename = useDocumentStore((s) => s.filename)
  const themeConfig = useThemeStore((s) => s.config)

  const handleHtml = useCallback(() => {
    const fullHtml = exportFullHtml(html, themeConfig, filename)
    const blob = new Blob([fullHtml], { type: 'text/html' })
    saveAs(blob, filename.replace(/\.edm$/, '') + '.html')
    addToast('HTML exportado correctamente', 'success')
    setOpen(false)
  }, [html, themeConfig, filename, addToast, setOpen])

  const handleSnippet = useCallback(async () => {
    await copyHtmlSnippet(html)
    addToast('HTML copiado al portapapeles', 'success')
    setOpen(false)
  }, [html, addToast, setOpen])

  const handlePdf = useCallback(async () => {
    try {
      addToast('Generando PDF...', 'info')
      await exportPdf(html, themeConfig, filename)
      addToast('PDF generado correctamente', 'success')
    } catch {
      addToast('Error al generar PDF', 'error')
    }
    setOpen(false)
  }, [html, themeConfig, filename, addToast, setOpen])

  const handleDocx = useCallback(async () => {
    try {
      addToast('Generando DOCX...', 'info')
      await exportDocx(html, filename)
      addToast('DOCX generado correctamente', 'success')
    } catch {
      addToast('Error al generar DOCX', 'error')
    }
    setOpen(false)
  }, [html, filename, addToast, setOpen])

  const cards: ExportCard[] = [
    {
      icon: FileCode,
      title: 'HTML completo',
      desc: 'Pagina HTML autocontenida con CSS y fuentes',
      color: 'text-orange-400',
      action: handleHtml,
    },
    {
      icon: Copy,
      title: 'Copiar HTML',
      desc: 'Copia solo el contenido HTML al portapapeles',
      color: 'text-blue-400',
      action: handleSnippet,
    },
    {
      icon: FileImage,
      title: 'PDF',
      desc: 'Documento PDF generado desde la vista previa',
      color: 'text-red-400',
      action: handlePdf,
    },
    {
      icon: FileText,
      title: 'DOCX',
      desc: 'Documento Word compatible con Office',
      color: 'text-blue-500',
      action: handleDocx,
    },
  ]

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[var(--app-bg1)] border border-[var(--app-border)] rounded-2xl p-6
          w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--app-fg)]">Exportar documento</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cards de exportación */}
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={card.action}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--app-border)]
                hover:border-[var(--app-border-hover)] hover:bg-[var(--app-bg2)] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--app-bg)] flex items-center justify-center shrink-0">
                <card.icon size={20} className={card.color} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--app-fg)]">{card.title}</p>
                <p className="text-xs text-[var(--app-fg3)]">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
