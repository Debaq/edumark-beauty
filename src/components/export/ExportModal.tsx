import { useCallback, useMemo, useState } from 'react'
import { X, FileCode, Copy, FileImage, FileText, Presentation, BookOpen, Code } from 'lucide-react'
import { EmbedListModal } from './EmbedListModal'
import { useUIStore } from '@/store/ui'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'
import { useContentModeStore } from '@/store/contentMode'
import { useBookLayoutStore } from '@/store/bookLayout'
import { exportFullHtml } from '@/lib/exportHtml'
import { copyHtmlSnippet } from '@/lib/exportSnippet'
import { exportPdf } from '@/lib/exportPdf'
import { exportDocx } from '@/lib/exportDocx'
import { Toggle } from '@/components/ui/Toggle'
import { PageConfigSection } from './PageConfigSection'
import { saveFile } from '@/lib/fileAdapter'

interface ExportCard {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  desc: string
  color: string
  action: () => void
  badge?: string
}

export function ExportModal() {
  const open = useUIStore((s) => s.exportModalOpen)
  const setOpen = useUIStore((s) => s.setExportModalOpen)
  const addToast = useUIStore((s) => s.addToast)
  const html = useDocumentStore((s) => s.html)
  const filename = useDocumentStore((s) => s.filename)
  const themeConfig = useThemeStore((s) => s.config)
  const activePreset = useThemeStore((s) => s.activePreset)
  const contentMode = useContentModeStore((s) => s.contentMode)
  const slides = useContentModeStore((s) => s.slides)
  const slideConfig = useContentModeStore((s) => s.slideConfig)
  const pageConfig = useContentModeStore((s) => s.pageConfig)
  const bookLayout = useBookLayoutStore((s) => s.layoutConfig)
  const sourceUrl = useDocumentStore((s) => s.sourceUrl)
  const isProject = useDocumentStore((s) => s.isProject)
  const [inlineStyles, setInlineStyles] = useState(true)
  const [embedListVariant, setEmbedListVariant] = useState<'embed' | 'app' | null>(null)

  // --- HTML mode handlers ---
  const handleHtml = useCallback(async () => {
    const fullHtml = exportFullHtml(html, themeConfig, filename)
    const blob = new Blob([fullHtml], { type: 'text/html' })
    await saveFile(blob, filename.replace(/\.edm$/, '') + '.html')
    addToast('HTML exportado correctamente', 'success')
    setOpen(false)
  }, [html, themeConfig, filename, addToast, setOpen])

  const handleSnippet = useCallback(async () => {
    await copyHtmlSnippet(html, themeConfig, inlineStyles)
    addToast('HTML copiado al portapapeles', 'success')
    setOpen(false)
  }, [html, themeConfig, inlineStyles, addToast, setOpen])

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

  // --- Presentation mode handlers ---
  const handlePresentationHtml = useCallback(async () => {
    try {
      const { exportPresentationHtml } = await import('@/lib/exportPresentation')
      const result = exportPresentationHtml(slides, themeConfig, slideConfig, filename)
      const blob = new Blob([result], { type: 'text/html' })
      await saveFile(blob, filename.replace(/\.edm$/, '') + '_presentacion.html')
      addToast('Presentacion HTML exportada', 'success')
    } catch {
      addToast('Error al exportar presentacion', 'error')
    }
    setOpen(false)
  }, [slides, themeConfig, slideConfig, filename, addToast, setOpen])

  const slideZoomOverrides = useContentModeStore((s) => s.slideZoomOverrides)

  const handlePresentationPdf = useCallback(async () => {
    try {
      addToast('Generando PDF de presentacion...', 'info')
      const { exportPresentationPdf } = await import('@/lib/exportPresentationPdf')
      await exportPresentationPdf(slides, themeConfig, slideConfig, filename, slideZoomOverrides)
      addToast('PDF de presentacion generado', 'success')
    } catch {
      addToast('Error al generar PDF de presentacion', 'error')
    }
    setOpen(false)
  }, [slides, themeConfig, slideConfig, filename, slideZoomOverrides, addToast, setOpen])

  const handlePptxRaster = useCallback(async () => {
    try {
      addToast('Generando PPTX (imagen)...', 'info')
      const { exportPptxRaster } = await import('@/lib/exportPptxRaster')
      await exportPptxRaster(slides, themeConfig, slideConfig, filename, slideZoomOverrides)
      addToast('PPTX generado correctamente', 'success')
    } catch {
      addToast('Error al generar PPTX', 'error')
    }
    setOpen(false)
  }, [slides, themeConfig, slideConfig, filename, slideZoomOverrides, addToast, setOpen])

  const handlePptxNative = useCallback(async () => {
    try {
      addToast('Generando PPTX nativo...', 'info')
      const { exportPptxNative } = await import('@/lib/exportPptxNative')
      await exportPptxNative(slides, themeConfig, slideConfig, filename)
      addToast('PPTX nativo generado correctamente', 'success')
    } catch {
      addToast('Error al generar PPTX nativo', 'error')
    }
    setOpen(false)
  }, [slides, themeConfig, slideConfig, filename, addToast, setOpen])

  // --- Book mode handlers ---
  const handleBookPdf = useCallback(async () => {
    try {
      addToast('Generando PDF de libro...', 'info')
      const { exportBookPdf } = await import('@/lib/exportBookPdf')
      await exportBookPdf(html, themeConfig, pageConfig, filename, bookLayout)
      addToast('PDF de libro generado', 'success')
    } catch {
      addToast('Error al generar PDF de libro', 'error')
    }
    setOpen(false)
  }, [html, themeConfig, pageConfig, filename, bookLayout, addToast, setOpen])

  const handleBookDocx = useCallback(async () => {
    try {
      addToast('Generando DOCX de libro...', 'info')
      const { exportBookDocx } = await import('@/lib/exportBookDocx')
      await exportBookDocx(html, pageConfig, filename, bookLayout)
      addToast('DOCX de libro generado', 'success')
    } catch {
      addToast('Error al generar DOCX', 'error')
    }
    setOpen(false)
  }, [html, pageConfig, filename, bookLayout, addToast, setOpen])

  /** Builds the &theme= query param: preset name or base64-encoded config */
  const themeParam = useCallback(() => {
    if (activePreset) return `&theme=${activePreset}`
    return `&theme=${btoa(JSON.stringify(themeConfig))}`
  }, [activePreset, themeConfig])

  const handleEmbedCode = useCallback(async () => {
    if (isProject) {
      setEmbedListVariant('embed')
      return
    }
    if (!sourceUrl) return
    const base = `${window.location.origin}${window.location.pathname}`
    const encodedUrl = encodeURIComponent(sourceUrl)
    const embedUrl = `${base}?url=${encodedUrl}&mode=embed${themeParam()}`
    const snippet = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allowfullscreen style="border:none;border-radius:8px;"></iframe>`
    await navigator.clipboard.writeText(snippet)
    addToast('Codigo embed (solo lectura) copiado al portapapeles', 'success')
    setOpen(false)
  }, [sourceUrl, isProject, themeParam, addToast, setOpen])

  const handleEmbedApp = useCallback(async () => {
    if (isProject) {
      setEmbedListVariant('app')
      return
    }
    if (!sourceUrl) return
    const base = `${window.location.origin}${window.location.pathname}`
    const encodedUrl = encodeURIComponent(sourceUrl)
    const appUrl = `${base}?url=${encodedUrl}${themeParam()}`
    const snippet = `<iframe src="${appUrl}" width="100%" height="700" frameborder="0" allowfullscreen style="border:none;border-radius:8px;"></iframe>`
    await navigator.clipboard.writeText(snippet)
    addToast('Codigo embed (app completa) copiado al portapapeles', 'success')
    setOpen(false)
  }, [sourceUrl, isProject, themeParam, addToast, setOpen])

  const cards: ExportCard[] = useMemo(() => {
    switch (contentMode) {
      case 'presentation':
        return [
          {
            icon: FileCode,
            title: 'HTML Web',
            desc: 'Presentacion interactiva con navegacion por teclado',
            color: 'text-orange-400',
            action: handlePresentationHtml,
          },
          {
            icon: FileImage,
            title: 'PDF',
            desc: 'PDF con una diapositiva por pagina',
            color: 'text-red-400',
            action: handlePresentationPdf,
          },
          {
            icon: Presentation,
            title: 'PPTX',
            desc: 'Diapositivas como imagen — fiel al preview',
            color: 'text-amber-400',
            action: handlePptxRaster,
            badge: 'Experimental',
          },
          {
            icon: Presentation,
            title: 'PPTX Nativo',
            desc: 'Texto editable, cards como figuras — SVGs rasterizados',
            color: 'text-amber-400',
            action: handlePptxNative,
            badge: 'Experimental',
          },
        ]
      case 'book':
        return [
          {
            icon: FileImage,
            title: 'PDF',
            desc: 'PDF con tamano y margenes configurados',
            color: 'text-red-400',
            action: handleBookPdf,
          },
          {
            icon: BookOpen,
            title: 'DOCX',
            desc: 'Documento Word con formato de pagina configurado',
            color: 'text-blue-500',
            action: handleBookDocx,
          },
        ]
      default: // html
        return [
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
            desc: 'HTML con estilos para insertar en Moodle u otro LMS',
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
          ...((sourceUrl || isProject) ? [
            {
              icon: Code as ExportCard['icon'],
              title: 'Embed solo lectura',
              desc: isProject
                ? 'Embeds por capitulo — preview limpio'
                : 'Iframe con el preview limpio — ideal para Moodle o web',
              color: 'text-green-400',
              action: handleEmbedCode,
            },
            {
              icon: Code as ExportCard['icon'],
              title: 'Embed app completa',
              desc: isProject
                ? 'Embeds por capitulo — app con editor y temas'
                : 'Iframe con editor, temas y exportacion incluidos',
              color: 'text-emerald-400',
              action: handleEmbedApp,
            },
          ] : []),
        ]
    }
  }, [
    contentMode, handleHtml, handleSnippet, handlePdf, handleDocx, handleEmbedCode, handleEmbedApp, sourceUrl, isProject,
    handlePresentationHtml, handlePresentationPdf, handlePptxRaster, handlePptxNative,
    handleBookPdf, handleBookDocx,
  ])

  const modeLabel = contentMode === 'presentation' ? 'Presentacion'
    : contentMode === 'book' ? 'Libro' : 'Documento'

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
          <h2 className="text-lg font-semibold text-[var(--app-fg)]">Exportar {modeLabel}</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Page/Slide config section */}
        <PageConfigSection />

        {/* Toggle inline styles (solo modo html) */}
        {contentMode === 'html' && (
          <div className="mb-4 px-1">
            <Toggle
              label="Estilos inline (compatibilidad Moodle)"
              value={inlineStyles}
              onChange={setInlineStyles}
            />
          </div>
        )}

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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--app-fg)]">{card.title}</p>
                  {card.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--app-fg3)]">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal de embeds por capítulo (proyectos) */}
      <EmbedListModal
        open={embedListVariant !== null}
        onClose={() => setEmbedListVariant(null)}
        variant={embedListVariant ?? 'embed'}
      />
    </div>
  )
}
