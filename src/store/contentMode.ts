import { create } from 'zustand'
import type { ContentMode, PageConfig, SlideConfig, Slide, SlideTemplate } from '@/types/contentMode'
import { PAPER_SIZES } from '@/types/contentMode'

interface ContentModeStore {
  contentMode: ContentMode
  pageConfig: PageConfig
  slideConfig: SlideConfig
  currentSlide: number
  slides: Slide[]
  slideTemplates: Map<number, SlideTemplate>
  slideZoomOverrides: Map<number, number>

  setContentMode: (mode: ContentMode) => void
  setPageConfig: (config: PageConfig) => void
  setSlideConfig: (config: SlideConfig) => void
  setCurrentSlide: (index: number) => void
  setSlides: (slides: Slide[]) => void
  setSlideTemplate: (index: number, template: SlideTemplate) => void
  setSlideZoom: (index: number, zoom: number) => void
  clearSlideZoom: (index: number) => void
  nextSlide: () => void
  prevSlide: () => void
}

export const useContentModeStore = create<ContentModeStore>((set) => ({
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
  slideTemplates: new Map(),
  slideZoomOverrides: new Map(),

  setContentMode: (mode) => set({ contentMode: mode, currentSlide: 0 }),
  setPageConfig: (config) => set({ pageConfig: config }),
  setSlideConfig: (config) => set({ slideConfig: config }),
  setCurrentSlide: (index) => set({ currentSlide: index }),
  setSlides: (slides) => set((s) => ({
    slides,
    currentSlide: Math.min(s.currentSlide, Math.max(0, slides.length - 1)),
  })),
  setSlideTemplate: (index, template) => set((s) => {
    const newTemplates = new Map(s.slideTemplates)
    newTemplates.set(index, template)
    const newSlides = [...s.slides]
    if (newSlides[index]) {
      newSlides[index] = { ...newSlides[index], template }
    }
    return { slideTemplates: newTemplates, slides: newSlides }
  }),
  setSlideZoom: (index, zoom) => set((s) => {
    const newZooms = new Map(s.slideZoomOverrides)
    newZooms.set(index, zoom)
    return { slideZoomOverrides: newZooms }
  }),
  clearSlideZoom: (index) => set((s) => {
    const newZooms = new Map(s.slideZoomOverrides)
    newZooms.delete(index)
    return { slideZoomOverrides: newZooms }
  }),
  nextSlide: () => set((s) => ({
    currentSlide: Math.min(s.currentSlide + 1, s.slides.length - 1),
  })),
  prevSlide: () => set((s) => ({
    currentSlide: Math.max(s.currentSlide - 1, 0),
  })),
}))
