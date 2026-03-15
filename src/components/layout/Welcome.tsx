import { useCallback, useState, useRef } from 'react'
import { Upload, FileText, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useDocumentStore } from '@/store/document'
import { decode } from 'edumark-js'

// Ejemplo breve de contenido edumark para la demo
const DEMO_EDM = `---
title: "Introduccion a la Celula"
subtitle: "Biologia General — Capitulo 1"
author: "Dra. Maria Lopez"
institution: "Universidad Nacional"
---

# La Celula: Unidad Basica de la Vida

La **celula** es la unidad estructural y funcional mas pequena de los seres vivos.

:::objective
Comprender los conceptos fundamentales de la biologia celular y distinguir entre los diferentes tipos de celulas.
:::

## Tipos de Celulas

Existen dos grandes grupos de celulas segun su organizacion interna:

:::definition
- Celula procariota: Celula sin nucleo definido, con material genetico disperso en el citoplasma.
- Celula eucariota: Celula con nucleo delimitado por membrana nuclear que contiene el ADN.
- Organelo: Estructura especializada dentro de la celula con funciones especificas.
:::

:::key-concept
La principal diferencia entre procariotas y eucariotas es la presencia de un **nucleo** delimitado por membrana. Los eucariotas tambien poseen organelos membranosos como mitocondrias y reticulo endoplasmatico.
:::

## Organelos Principales

| Organelo | Funcion | Tipo de celula |
|----------|---------|----------------|
| Nucleo | Almacena el ADN | Eucariota |
| Mitocondria | Produce energia (ATP) | Eucariota |
| Ribosoma | Sintetiza proteinas | Ambas |
| Cloroplasto | Fotosintesis | Vegetal |
| Reticulo endoplasmatico | Transporte de moleculas | Eucariota |

:::note
Los **ribosomas** se encuentran tanto en celulas procariotas como eucariotas, aunque difieren en su tamano (70S vs 80S).
:::

:::example{title="Celulas especializadas"}
Un buen ejemplo de especializacion celular son las **neuronas**, que poseen axones largos para transmitir impulsos electricos, y los **eritrocitos**, que carecen de nucleo para maximizar el espacio para hemoglobina.
:::

:::warning
No confundir la **membrana celular** (presente en todas las celulas) con la **pared celular** (presente solo en plantas, hongos y bacterias).
:::

## Teoria Celular

:::history{year="1665"}
Robert Hooke observo por primera vez las celulas al examinar laminas de corcho bajo el microscopio. Llamo a estas estructuras "celulas" por su parecido con las celdas de un monasterio.
:::

Los tres principios fundamentales de la teoria celular:

1. Todos los seres vivos estan formados por celulas.
2. La celula es la unidad basica de la vida.
3. Toda celula proviene de otra celula preexistente.

:::question{type="single"}
Cual de los siguientes organelos es responsable de la produccion de energia en la celula eucariota?

- [ ] Ribosoma
- [x] Mitocondria
- [ ] Lisosoma
- [ ] Aparato de Golgi
:::

:::summary
- La celula es la unidad basica de la vida
- Existen dos tipos principales: procariotas y eucariotas
- Los organelos cumplen funciones especializadas
- La teoria celular establece los tres principios fundamentales de la biologia celular
:::
`

export function Welcome() {
  const setSource = useDocumentStore((s) => s.setSource)
  const setFilename = useDocumentStore((s) => s.setFilename)
  const setHtml = useDocumentStore((s) => s.setHtml)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadContent = useCallback(
    (text: string, name: string) => {
      setSource(text)
      setFilename(name)
      try {
        setHtml(decode(text, { mode: 'teacher' }))
      } catch {
        setHtml('<p style="color:#f87171;">Error al parsear el documento.</p>')
      }
    },
    [setSource, setFilename, setHtml]
  )

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => loadContent(reader.result as string, file.name)
      reader.readAsText(file)
    },
    [loadContent]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
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

  const handleDemo = useCallback(() => {
    loadContent(DEMO_EDM, 'demo_celula.edm')
  }, [loadContent])

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
            <div className="w-12 h-12 rounded-xl bg-[var(--app-accent)] flex items-center justify-center shadow-lg">
              <FileText size={24} className="text-white" />
            </div>
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
              Arrastra un archivo .edm aqui
            </p>
            <p className="text-xs text-[var(--app-fg3)] mt-1">
              o haz clic para seleccionar
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".edm,.md,.txt"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Separador */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-[var(--app-border)]" />
          <span className="text-xs text-[var(--app-fg3)]">o</span>
          <div className="flex-1 h-px bg-[var(--app-border)]" />
        </div>

        {/* Boton demo */}
        <button
          onClick={handleDemo}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--app-bg1)]
            border border-[var(--app-border)] text-sm font-medium text-[var(--app-fg1)]
            hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-all"
        >
          <Sparkles size={16} />
          Cargar ejemplo de demostracion
        </button>
      </div>
    </div>
  )
}
