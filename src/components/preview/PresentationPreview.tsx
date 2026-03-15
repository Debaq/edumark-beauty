import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useContentModeStore } from '@/store/contentMode'
import { useThemeStore } from '@/store/theme'
import { generateThemeCss } from './previewTheme'
import { useSlides } from '@/hooks/useSlides'
import { SlideTemplateSelector } from './SlideTemplateSelector'
import previewBaseCss from '@/styles/preview-base.css?raw'
import '@/styles/presentation.css'

const ZOOM_STEP = 0.05

export function PresentationPreview() {
  const currentSlide = useContentModeStore((s) => s.currentSlide)
  const slides = useContentModeStore((s) => s.slides)
  const nextSlide = useContentModeStore((s) => s.nextSlide)
  const prevSlide = useContentModeStore((s) => s.prevSlide)
  const themeConfig = useThemeStore((s) => s.config)
  const slideConfig = useContentModeStore((s) => s.slideConfig)
  const slideZoomOverrides = useContentModeStore((s) => s.slideZoomOverrides)
  const setSlideZoom = useContentModeStore((s) => s.setSlideZoom)
  const clearSlideZoom = useContentModeStore((s) => s.clearSlideZoom)

  useSlides()

  const themeCssVars = useMemo(() => generateThemeCss(themeConfig), [themeConfig])

  const slide = slides[currentSlide]
  const manualZoom = slideZoomOverrides.get(currentSlide)
  const isManualZoom = manualZoom !== undefined

  // ── Auto-fit system ──
  // Uses a hidden measurement div at viewport's exact dimensions,
  // then compares scrollHeight to know the natural content height.
  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(1)
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })

  const scale = isManualZoom ? manualZoom : autoScale

  // Track viewport size with ResizeObserver
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setViewportSize((prev) => {
          if (prev.w === Math.round(width) && prev.h === Math.round(height)) return prev
          return { w: Math.round(width), h: Math.round(height) }
        })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Compute autoScale whenever slide content or viewport size changes
  useEffect(() => {
    const measure = measureRef.current
    const viewport = viewportRef.current
    if (!measure || !viewport || !slide) return

    const compute = () => {
      const vw = viewport.clientWidth
      const vh = viewport.clientHeight
      if (vw <= 0 || vh <= 0) return

      // Measurement div has height:auto + overflow:visible,
      // so offsetHeight is the natural content height at viewport width
      const contentH = measure.offsetHeight
      if (contentH <= 0) return

      const scaleY = vh / contentH
      setAutoScale(Math.min(scaleY, 1))
    }

    compute()
    // Re-compute after fonts/images load
    const t = setTimeout(compute, 300)
    return () => clearTimeout(t)
  }, [slide, currentSlide, viewportSize])

  const zoomIn = useCallback(() => {
    const next = Math.min((manualZoom ?? autoScale) + ZOOM_STEP, 2)
    setSlideZoom(currentSlide, next)
  }, [currentSlide, manualZoom, autoScale, setSlideZoom])

  const zoomOut = useCallback(() => {
    const next = Math.max((manualZoom ?? autoScale) - ZOOM_STEP, 0.1)
    setSlideZoom(currentSlide, next)
  }, [currentSlide, manualZoom, autoScale, setSlideZoom])

  const resetZoom = useCallback(() => {
    clearSlideZoom(currentSlide)
  }, [currentSlide, clearSlideZoom])

  // Keyboard navigation — only when the editor is NOT focused
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const active = document.activeElement
    if (active && (
      active.closest('.cm-editor') ||
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA'
    )) return

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextSlide()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      prevSlide()
    }
  }, [nextSlide, prevSlide])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const aspectRatio = slideConfig.ratio === '16:9' ? '16/9'
    : slideConfig.ratio === '4:3' ? '4/3'
    : `${slideConfig.customWidth ?? 16}/${slideConfig.customHeight ?? 9}`

  if (!slide) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--app-fg3)]">
        <p className="text-sm">La vista previa de presentacion aparecera aqui...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[var(--app-bg)]">
      {/* Slide viewport */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden"
        style={{ background: 'var(--app-bg)' }}>
        <div
          ref={viewportRef}
          className="edm-slide-viewport relative rounded-sm"
          style={{
            aspectRatio,
            maxWidth: '100%',
            maxHeight: '100%',
            width: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <style>{previewBaseCss}</style>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          />

          {/* Hidden measurement div — viewport width, natural height */}
          {slide && (
            <div
              ref={measureRef}
              className={`edm-preview edm-slide edm-slide-${slide.template}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 'auto',
                overflow: 'visible',
                visibility: 'hidden',
                pointerEvents: 'none',
                background: themeConfig.bg,
              }}
              dangerouslySetInnerHTML={{ __html: slide.html }}
            />
          )}

          {/* Visible content — scaled */}
          <div
            className={`edm-preview edm-slide edm-slide-${slide.template}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: themeConfig.bg,
            }}
            dangerouslySetInnerHTML={{ __html: slide.html }}
          />

          <style>{`.edm-preview { ${themeCssVars} }`}</style>
          {themeConfig.customCss && <style>{themeConfig.customCss}</style>}
        </div>
      </div>

      {/* Navigation + zoom bar */}
      <div className="shrink-0 flex items-center justify-between py-2 px-4
        border-t border-[var(--app-border)] bg-[var(--app-bg1)]">

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="p-1.5 rounded-lg text-[var(--app-fg2)] hover:bg-[var(--app-bg2)]
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-[var(--app-fg2)] min-w-[60px] text-center">
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="p-1.5 rounded-lg text-[var(--app-fg2)] hover:bg-[var(--app-bg2)]
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            title="Reducir zoom"
            className="p-1 rounded text-[var(--app-fg3)] hover:bg-[var(--app-bg2)]
              hover:text-[var(--app-fg2)] transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className={`text-[11px] min-w-[40px] text-center ${
            isManualZoom ? 'text-[var(--app-accent)]' : 'text-[var(--app-fg3)]'
          }`}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            title="Aumentar zoom"
            className="p-1 rounded text-[var(--app-fg3)] hover:bg-[var(--app-bg2)]
              hover:text-[var(--app-fg2)] transition-colors"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={resetZoom}
            title={isManualZoom ? 'Volver a zoom automatico' : 'Zoom automatico (activo)'}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ml-0.5 ${
              isManualZoom
                ? 'text-[var(--app-fg3)] hover:bg-[var(--app-bg2)] hover:text-[var(--app-accent)]'
                : 'text-[var(--app-accent)] bg-[var(--app-accent)]/10'
            }`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Template selector */}
      <SlideTemplateSelector
        currentSlide={currentSlide}
        currentTemplate={slide.template}
        onSelectTemplate={(template) => {
          useContentModeStore.getState().setSlideTemplate(currentSlide, template)
        }}
      />
    </div>
  )
}
