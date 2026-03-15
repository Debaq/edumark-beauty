import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Minus, Plus, Maximize, Minimize, MonitorPlay,
  Eye, EyeOff, StickyNote,
} from 'lucide-react'
import type { FreeTextMode } from '@/types/contentMode'
import { useContentModeStore } from '@/store/contentMode'
import { useThemeStore } from '@/store/theme'
import { generateThemeCss } from './previewTheme'
import { useSlides } from '@/hooks/useSlides'
import { SlideTemplateSelector } from './SlideTemplateSelector'
import { useQuestionInteractivity } from '@/hooks/useQuestionInteractivity'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityCss } from '@/lib/interactivity'
import '@/styles/presentation.css'

const ZOOM_STEP = 0.05

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PresentationPreview() {
  const currentSlide = useContentModeStore((s) => s.currentSlide)
  const slides = useContentModeStore((s) => s.slides)
  const nextSlide = useContentModeStore((s) => s.nextSlide)
  const prevSlide = useContentModeStore((s) => s.prevSlide)
  const setCurrentSlide = useContentModeStore((s) => s.setCurrentSlide)
  const themeConfig = useThemeStore((s) => s.config)
  const slideConfig = useContentModeStore((s) => s.slideConfig)
  const slideZoomOverrides = useContentModeStore((s) => s.slideZoomOverrides)
  const setSlideZoom = useContentModeStore((s) => s.setSlideZoom)
  const clearSlideZoom = useContentModeStore((s) => s.clearSlideZoom)
  const freeTextMode = useContentModeStore((s) => s.slideConfig.freeTextMode) ?? 'show'
  const setFreeTextMode = useContentModeStore((s) => s.setFreeTextMode)

  useSlides()

  const themeCssVars = useMemo(() => generateThemeCss(themeConfig), [themeConfig])

  const slide = slides[currentSlide]
  const nextSlideData = slides[currentSlide + 1]
  const storeZoom = slideZoomOverrides.get(currentSlide)
  const metaZoom = slide?.metadata?.zoom ? parseFloat(slide.metadata.zoom) : undefined
  const manualZoom = storeZoom ?? (Number.isFinite(metaZoom) ? metaZoom : undefined)
  const isManualZoom = manualZoom !== undefined

  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  // Interactividad de preguntas
  useQuestionInteractivity(containerRef, slide?.html ?? '')

  // ── Auto-fit system ──
  const [autoScale, setAutoScale] = useState(1)
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })
  const scale = isManualZoom ? manualZoom : autoScale

  // ── Fullscreen & Presenter ──
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [presenterMode, setPresenterMode] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const timerStartRef = useRef<number>(0)

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

      // Open all <details> for measurement so scale accounts for expanded content
      const details = measure.querySelectorAll('details:not([open])')
      details.forEach((d) => d.setAttribute('open', ''))
      const contentH = measure.offsetHeight
      details.forEach((d) => d.removeAttribute('open'))

      if (contentH <= 0) return

      const scaleY = vh / contentH
      setAutoScale(Math.min(scaleY, 1))
    }

    compute()
    const t = setTimeout(compute, 300)
    return () => clearTimeout(t)
  }, [slide, currentSlide, viewportSize])

  // ── Zoom handlers ──
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

  // ── Navigation helpers ──
  const goToFirst = useCallback(() => setCurrentSlide(0), [setCurrentSlide])
  const goToLast = useCallback(
    () => setCurrentSlide(slides.length - 1),
    [setCurrentSlide, slides.length],
  )

  // ── Fullscreen ──
  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen()
  }, [])

  const enterPresenter = useCallback(() => {
    setPresenterMode(true)
    timerStartRef.current = Date.now()
    setElapsedTime(0)
    containerRef.current?.requestFullscreen()
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
  }, [])

  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      if (!isFs) {
        setPresenterMode(false)
        setControlsVisible(true)
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Timer for presenter mode
  useEffect(() => {
    if (!presenterMode) return
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - timerStartRef.current)
    }, 1000)
    return () => clearInterval(interval)
  }, [presenterMode])

  // Auto-hide controls in clean fullscreen (not presenter)
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    if (isFullscreen && !presenterMode) {
      hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [isFullscreen, presenterMode])

  useEffect(() => {
    if (isFullscreen && !presenterMode) {
      hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000)
      return () => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      }
    } else {
      setControlsVisible(true)
    }
  }, [isFullscreen, presenterMode])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const active = document.activeElement
      if (
        active &&
        (active.closest('.cm-editor') ||
          active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA')
      )
        return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prevSlide()
      } else if (e.key === 'Home') {
        e.preventDefault()
        goToFirst()
      } else if (e.key === 'End') {
        e.preventDefault()
        goToLast()
      } else if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen()
      } else if ((e.key === 'f' || e.key === 'F') && !isFullscreen) {
        e.preventDefault()
        enterFullscreen()
      }
    },
    [nextSlide, prevSlide, goToFirst, goToLast, isFullscreen, exitFullscreen, enterFullscreen],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const aspectRatio =
    slideConfig.ratio === '16:9'
      ? '16/9'
      : slideConfig.ratio === '4:3'
        ? '4/3'
        : `${slideConfig.customWidth ?? 16}/${slideConfig.customHeight ?? 9}`

  if (!slide) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--app-fg3)]">
        <p className="text-sm">La vista previa de presentacion aparecera aqui...</p>
      </div>
    )
  }

  // ── Shared styles ──
  const slideStyleBlock = `${previewBaseCss}\n${interactivityCss}\n.edm-preview { ${themeCssVars} }\n${themeConfig.customCss || ''}`
  const slideLinks = (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
    </>
  )

  // ── Button style helper ──
  const btnClass = (disabled?: boolean) =>
    `p-1.5 rounded-lg transition-colors ${
      isFullscreen
        ? 'text-neutral-300 hover:bg-white/15'
        : 'text-[var(--app-fg2)] hover:bg-[var(--app-bg2)]'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`

  return (
    <div
      ref={containerRef}
      className={`h-full flex flex-col ${isFullscreen ? 'bg-black' : 'bg-[var(--app-bg)]'}`}
      onMouseMove={isFullscreen && !presenterMode ? showControls : undefined}
    >
      {/* ── Presenter mode: split layout ── */}
      {isFullscreen && presenterMode ? (
        <div className="flex-1 flex min-h-0">
          {/* Current slide */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div
              ref={viewportRef}
              className="edm-slide-viewport relative rounded-sm"
              style={{
                aspectRatio,
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
              }}
            >
              <style>{slideStyleBlock}</style>
              {slideLinks}
              {/* Measurement div */}
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
              {/* Visible slide */}
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
            </div>
          </div>

          {/* Presenter sidebar */}
          <div className="w-80 border-l border-white/10 bg-neutral-900 flex flex-col p-4 gap-4">
            {/* Next slide preview */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">
                Siguiente
              </span>
              {nextSlideData ? (
                <div
                  className="edm-slide-viewport rounded overflow-hidden border border-white/10 relative"
                  style={{ aspectRatio }}
                >
                  <style>{slideStyleBlock}</style>
                  <div
                    className={`edm-preview edm-slide edm-slide-${nextSlideData.template}`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: themeConfig.bg,
                      overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{ __html: nextSlideData.html }}
                  />
                </div>
              ) : (
                <div
                  className="rounded border border-white/10 flex items-center justify-center text-neutral-500 text-xs"
                  style={{ aspectRatio }}
                >
                  Fin de la presentacion
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Tiempo</span>
              <span className="text-3xl font-mono text-white">{formatTime(elapsedTime)}</span>
            </div>

            {/* Slide counter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">
                Diapositiva
              </span>
              <span className="text-xl text-white">
                {currentSlide + 1} / {slides.length}
              </span>
            </div>

            {/* Speaker notes */}
            {slide.notes && (
              <div className="flex flex-col gap-1 flex-1 min-h-0">
                <span className="text-xs text-neutral-400 uppercase tracking-wider">
                  Notas
                </span>
                <div
                  className="edm-preview text-sm text-neutral-200 overflow-y-auto flex-1 leading-relaxed"
                  style={{ fontSize: '13px' }}
                  dangerouslySetInnerHTML={{ __html: slide.notes }}
                />
              </div>
            )}

            <div className="mt-auto">
              <button
                onClick={exitFullscreen}
                className="w-full py-2 px-4 rounded-lg bg-white/10 text-white
                  hover:bg-white/20 transition-colors text-sm"
              >
                Salir del presentador
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Normal / clean fullscreen: slide area ── */
        <div
          className={`flex-1 flex items-center justify-center overflow-hidden ${isFullscreen ? 'p-0' : 'p-6'}`}
          style={{ background: isFullscreen ? 'black' : 'var(--app-bg)' }}
        >
          <div
            ref={viewportRef}
            className="edm-slide-viewport relative rounded-sm"
            style={{
              aspectRatio,
              maxWidth: '100%',
              maxHeight: '100%',
              width: '100%',
              boxShadow: isFullscreen
                ? 'none'
                : '0 2px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2)',
              border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <style>{slideStyleBlock}</style>
            {slideLinks}

            {/* Hidden measurement div */}
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
      )}

      {/* ── Navigation + zoom bar ── */}
      <div
        className={`shrink-0 flex items-center justify-between py-2 px-4 transition-opacity duration-300 ${
          isFullscreen
            ? `bg-black/80 backdrop-blur-sm ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
            : 'border-t border-[var(--app-border)] bg-[var(--app-bg1)]'
        }`}
      >
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToFirst}
            disabled={currentSlide === 0}
            title="Primera diapositiva (Home)"
            className={btnClass(currentSlide === 0)}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            title="Anterior"
            className={btnClass(currentSlide === 0)}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className={`text-xs min-w-[60px] text-center ${
              isFullscreen ? 'text-neutral-300' : 'text-[var(--app-fg2)]'
            }`}
          >
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            title="Siguiente"
            className={btnClass(currentSlide === slides.length - 1)}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={goToLast}
            disabled={currentSlide === slides.length - 1}
            title="Ultima diapositiva (End)"
            className={btnClass(currentSlide === slides.length - 1)}
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls (hidden in fullscreen) */}
          {!isFullscreen && (
            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                title="Reducir zoom"
                className="p-1 rounded text-[var(--app-fg3)] hover:bg-[var(--app-bg2)]
                  hover:text-[var(--app-fg2)] transition-colors"
              >
                <Minus size={14} />
              </button>
              <span
                className={`text-[11px] min-w-[40px] text-center ${
                  isManualZoom ? 'text-[var(--app-accent)]' : 'text-[var(--app-fg3)]'
                }`}
              >
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
          )}

          {/* Free text mode toggle (hidden in fullscreen) */}
          {!isFullscreen && (
            <div className="flex items-center gap-0.5 border border-[var(--app-border)] rounded-lg overflow-hidden">
              <button
                onClick={() => setFreeTextMode('show')}
                title="Mostrar texto libre"
                className={`p-1.5 transition-colors ${
                  freeTextMode === 'show'
                    ? 'text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                    : 'text-[var(--app-fg3)] hover:text-[var(--app-fg2)]'
                }`}
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => setFreeTextMode('hide')}
                title="Ocultar texto libre"
                className={`p-1.5 transition-colors ${
                  freeTextMode === 'hide'
                    ? 'text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                    : 'text-[var(--app-fg3)] hover:text-[var(--app-fg2)]'
                }`}
              >
                <EyeOff size={14} />
              </button>
              <button
                onClick={() => setFreeTextMode('notes')}
                title="Texto libre como notas del presentador"
                className={`p-1.5 transition-colors ${
                  freeTextMode === 'notes'
                    ? 'text-[var(--app-accent)] bg-[var(--app-accent)]/10'
                    : 'text-[var(--app-fg3)] hover:text-[var(--app-fg2)]'
                }`}
              >
                <StickyNote size={14} />
              </button>
            </div>
          )}

          {/* Fullscreen / Presenter buttons */}
          <div className="flex items-center gap-1">
            {isFullscreen ? (
              <button
                onClick={exitFullscreen}
                title="Salir de pantalla completa (Esc)"
                className={btnClass()}
              >
                <Minimize size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={enterFullscreen}
                  title="Pantalla completa (F)"
                  className="p-1.5 rounded-lg text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] transition-colors"
                >
                  <Maximize size={16} />
                </button>
                <button
                  onClick={enterPresenter}
                  title="Modo presentador"
                  className="p-1.5 rounded-lg text-[var(--app-fg2)] hover:bg-[var(--app-bg2)] transition-colors"
                >
                  <MonitorPlay size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Template selector (hidden in fullscreen) */}
      {!isFullscreen && (
        <SlideTemplateSelector
          currentSlide={currentSlide}
          currentTemplate={slide.template}
          onSelectTemplate={(template) => {
            useContentModeStore.getState().setSlideTemplate(currentSlide, template)
          }}
        />
      )}
    </div>
  )
}
