import { create } from 'zustand'
import type { ContentMode, PageConfig, SlideConfig, Slide, SlideTemplate, FreeTextMode } from '@/types/contentMode'
import { PAPER_SIZES } from '@/types/contentMode'
import { updateSlideMetadataInSource } from '@/lib/slideParser'
import { useDocumentStore } from '@/store/document'
import { useThemeStore } from '@/store/theme'

interface ContentModeStore {
  contentMode: ContentMode
  pageConfig: PageConfig
  slideConfig: SlideConfig
  currentSlide: number
  slides: Slide[]
  slideZoomOverrides: Map<number, number>

  setContentMode: (mode: ContentMode) => void
  setPageConfig: (config: PageConfig) => void
  setSlideConfig: (config: SlideConfig) => void
  setCurrentSlide: (index: number) => void
  setSlides: (slides: Slide[]) => void
  /**
   * Update template for a slide by writing a `<!-- slide: template=... -->`
   * comment into the document source. This triggers a re-parse automatically.
   */
  setSlideTemplate: (index: number, template: SlideTemplate) => void
  setSlideZoom: (index: number, zoom: number) => void
  clearSlideZoom: (index: number) => void
  setFreeTextMode: (mode: FreeTextMode) => void
  nextSlide: () => void
  prevSlide: () => void
}

export const useContentModeStore = create<ContentModeStore>((set, get) => ({
  contentMode: 'html',
  pageConfig: {
    paperSize: 'a4',
    width: PAPER_SIZES.a4.width,
    height: PAPER_SIZES.a4.height,
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
  },
  slideConfig: {
    ratio: '16:9',
  },
  currentSlide: 0,
  slides: [],
  slideZoomOverrides: new Map(),

  setContentMode: (mode) => {
    const prev = get().contentMode
    set({ contentMode: mode, currentSlide: 0 })
    useThemeStore.getState().switchMode(mode)

    // En proyecto: cambiar entre vista de capítulo y fusionada
    const doc = useDocumentStore.getState()
    if (doc.isProject) {
      if (mode === 'book' && prev !== 'book') {
        doc.switchToMerged()
      } else if (mode !== 'book' && prev === 'book') {
        doc.switchToChapter()
      }
    }
  },
  setPageConfig: (config) => set({ pageConfig: config }),
  setSlideConfig: (config) => set({ slideConfig: config }),
  setCurrentSlide: (index) => set({ currentSlide: index }),
  setSlides: (slides) => set((s) => ({
    slides,
    currentSlide: Math.min(s.currentSlide, Math.max(0, slides.length - 1)),
  })),
  setSlideTemplate: (index, template) => {
    const source = useDocumentStore.getState().source
    const newSource = updateSlideMetadataInSource(source, index, { template })
    if (newSource !== source) {
      useDocumentStore.getState().setSource(newSource)
    }
  },
  setSlideZoom: (index, zoom) => {
    // In-memory for immediate UI response
    set((s) => {
      const newZooms = new Map(s.slideZoomOverrides)
      newZooms.set(index, zoom)
      return { slideZoomOverrides: newZooms }
    })
    // Persist in source metadata
    const source = useDocumentStore.getState().source
    const newSource = updateSlideMetadataInSource(source, index, {
      zoom: String(Math.round(zoom * 100) / 100),
    })
    if (newSource !== source) {
      useDocumentStore.getState().setSource(newSource)
    }
  },
  clearSlideZoom: (index) => {
    set((s) => {
      const newZooms = new Map(s.slideZoomOverrides)
      newZooms.delete(index)
      return { slideZoomOverrides: newZooms }
    })
    // Remove zoom from source metadata
    const source = useDocumentStore.getState().source
    const newSource = updateSlideMetadataInSource(source, index, {
      zoom: undefined,
    })
    if (newSource !== source) {
      useDocumentStore.getState().setSource(newSource)
    }
  },
  setFreeTextMode: (mode) => set((s) => ({
    slideConfig: { ...s.slideConfig, freeTextMode: mode },
  })),
  nextSlide: () => set((s) => ({
    currentSlide: Math.min(s.currentSlide + 1, s.slides.length - 1),
  })),
  prevSlide: () => set((s) => ({
    currentSlide: Math.max(s.currentSlide - 1, 0),
  })),
}))
