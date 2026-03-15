import { create } from 'zustand'

interface DocumentStore {
  /** Texto fuente .edm */
  source: string
  /** Nombre del archivo cargado */
  filename: string
  /** HTML resultante del decode */
  html: string

  setSource: (source: string) => void
  setFilename: (name: string) => void
  setHtml: (html: string) => void
  reset: () => void
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  source: '',
  filename: '',
  html: '',

  setSource: (source) => set({ source }),
  setFilename: (name) => set({ filename: name }),
  setHtml: (html) => set({ html }),
  reset: () => set({ source: '', filename: '', html: '' }),
}))
