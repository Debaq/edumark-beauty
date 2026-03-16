import { create } from 'zustand'

export type ViewMode = 'editor' | 'preview' | 'split'

interface UIStore {
  viewMode: ViewMode
  exportModalOpen: boolean
  configPanelOpen: boolean
  helpModalOpen: boolean
  skillsModalOpen: boolean
  scrollSync: boolean
  toasts: Toast[]

  /** SVG editor state */
  svgEditorActive: boolean
  svgEditorDiagramId: string | null
  svgEditorOriginalSvg: string | null

  /** Mermaid editor state */
  mermaidEditorActive: boolean
  mermaidEditorDiagramId: string | null
  mermaidEditorOriginalCode: string | null

  setViewMode: (mode: ViewMode) => void
  setExportModalOpen: (open: boolean) => void
  setConfigPanelOpen: (open: boolean) => void
  setHelpModalOpen: (open: boolean) => void
  setSkillsModalOpen: (open: boolean) => void
  toggleScrollSync: () => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  openSvgEditor: (diagramId: string, originalSvg: string) => void
  closeSvgEditor: () => void
  openMermaidEditor: (diagramId: string, originalCode: string) => void
  closeMermaidEditor: () => void
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

let toastCounter = 0

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'split',
  exportModalOpen: false,
  configPanelOpen: false,
  helpModalOpen: false,
  skillsModalOpen: false,
  scrollSync: true,
  toasts: [],
  svgEditorActive: false,
  svgEditorDiagramId: null,
  svgEditorOriginalSvg: null,
  mermaidEditorActive: false,
  mermaidEditorDiagramId: null,
  mermaidEditorOriginalCode: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setExportModalOpen: (open) => set({ exportModalOpen: open }),
  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  setHelpModalOpen: (open) => set({ helpModalOpen: open }),
  setSkillsModalOpen: (open) => set({ skillsModalOpen: open }),
  toggleScrollSync: () => set((s) => ({ scrollSync: !s.scrollSync })),

  addToast: (message, type = 'info') => {
    const id = `toast-${++toastCounter}`
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    // Auto-remover después de 4 segundos
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  openSvgEditor: (diagramId, originalSvg) =>
    set({ svgEditorActive: true, svgEditorDiagramId: diagramId, svgEditorOriginalSvg: originalSvg }),

  closeSvgEditor: () =>
    set({ svgEditorActive: false, svgEditorDiagramId: null, svgEditorOriginalSvg: null }),

  openMermaidEditor: (diagramId, originalCode) =>
    set({ mermaidEditorActive: true, mermaidEditorDiagramId: diagramId, mermaidEditorOriginalCode: originalCode }),

  closeMermaidEditor: () =>
    set({ mermaidEditorActive: false, mermaidEditorDiagramId: null, mermaidEditorOriginalCode: null }),
}))
