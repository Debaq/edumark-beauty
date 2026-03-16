import { useState, useCallback, useRef } from 'react'
import {
  X, ChevronDown, Palette, Type, LayoutGrid, Table2,
  Maximize, Code, Download, Upload, Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useThemeStore, PRESETS, type PresetKey } from '@/store/theme'
import { useUIStore } from '@/store/ui'
import { SEMANTIC_COLORS, FONT_OPTIONS } from '@/types/theme'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'
import { Select } from '@/components/ui/Select'
import type { ThemeConfig } from '@/types/theme'

// ─── Sección colapsable ────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ComponentType<{ size?: number }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--app-border)]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-medium
          text-[var(--app-fg1)] hover:bg-[var(--app-bg2)] transition-colors"
      >
        <Icon size={16} />
        <span className="flex-1">{title}</span>
        <ChevronDown
          size={16}
          className={clsx('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 flex flex-col gap-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Panel principal ────────────────────────────────────

export function ConfigPanel() {
  const config = useThemeStore((s) => s.config)
  const activePreset = useThemeStore((s) => s.activePreset)
  const set = useThemeStore((s) => s.set)
  const applyPreset = useThemeStore((s) => s.applyPreset)
  const importTheme = useThemeStore((s) => s.importTheme)
  const exportTheme = useThemeStore((s) => s.exportTheme)
  const setConfigPanelOpen = useUIStore((s) => s.setConfigPanelOpen)
  const addToast = useUIStore((s) => s.addToast)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helpers tipados
  const setStr = useCallback(
    (key: keyof ThemeConfig) => (value: string) => set(key, value as never),
    [set]
  )
  const setNum = useCallback(
    (key: keyof ThemeConfig) => (value: number) => set(key, value as never),
    [set]
  )
  const setBool = useCallback(
    (key: keyof ThemeConfig) => (value: boolean) => set(key, value as never),
    [set]
  )

  // Exportar como JSON
  const handleExport = useCallback(async () => {
    const data = exportTheme()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const { saveFile } = await import('@/lib/fileAdapter')
    await saveFile(blob, 'edumark-theme.json')
    addToast('Tema exportado correctamente', 'success')
  }, [exportTheme, addToast])

  // Importar desde JSON
  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string)
          importTheme(json)
          addToast('Tema importado correctamente', 'success')
        } catch {
          addToast('Error al importar el tema', 'error')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [importTheme, addToast]
  )

  return (
    <div className="h-full w-80 bg-[var(--app-bg1)] border-l border-[var(--app-border)]
      flex flex-col overflow-hidden shrink-0">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)]">
        <h2 className="text-sm font-semibold text-[var(--app-fg)]">Configuracion de tema</h2>
        <button
          onClick={() => setConfigPanelOpen(false)}
          className="p-1 rounded hover:bg-[var(--app-bg2)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Presets ──────────────────────────────── */}
        <Section title="Preset de tema" icon={Sparkles} defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
              const preset = PRESETS[key]
              const isActive = activePreset === key
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all',
                    isActive
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                      : 'border-[var(--app-border)] hover:border-[var(--app-border-hover)] text-[var(--app-fg1)]'
                  )}
                >
                  <span className="text-base">{preset.emoji}</span>
                  {preset.label}
                </button>
              )
            })}
          </div>
        </Section>

        {/* ── Colores globales ─────────────────────── */}
        <Section title="Colores globales" icon={Palette} defaultOpen>
          <ColorPicker label="Fondo principal" value={config.bg} onChange={setStr('bg')} />
          <ColorPicker label="Fondo secundario" value={config.bg1} onChange={setStr('bg1')} />
          <ColorPicker label="Fondo terciario" value={config.bg2} onChange={setStr('bg2')} />
          <ColorPicker label="Texto principal" value={config.fg} onChange={setStr('fg')} />
          <ColorPicker label="Texto secundario" value={config.fg1} onChange={setStr('fg1')} />
          <ColorPicker label="Texto terciario" value={config.fg2} onChange={setStr('fg2')} />
          <ColorPicker label="Color acento" value={config.accent} onChange={setStr('accent')} />
          <ColorPicker label="Bordes" value={config.border} onChange={setStr('border')} />
        </Section>

        {/* ── Colores por bloque ───────────────────── */}
        <Section title="Colores por bloque" icon={Palette}>
          {SEMANTIC_COLORS.map(({ key, label }) => (
            <div key={key} className="mb-2">
              <p className="text-[10px] font-semibold text-[var(--app-fg3)] uppercase tracking-wider mb-1">
                {label}
              </p>
              <ColorPicker
                label="Acento"
                value={config[key as keyof ThemeConfig] as string}
                onChange={setStr(key as keyof ThemeConfig)}
              />
              <ColorPicker
                label="Fondo suave"
                value={config[`${key}Soft` as keyof ThemeConfig] as string}
                onChange={setStr(`${key}Soft` as keyof ThemeConfig)}
              />
              <ColorPicker
                label="Borde"
                value={config[`${key}Border` as keyof ThemeConfig] as string}
                onChange={setStr(`${key}Border` as keyof ThemeConfig)}
              />
            </div>
          ))}
        </Section>

        {/* ── Tipografia ───────────────────────────── */}
        <Section title="Tipografia" icon={Type}>
          <Select
            label="Fuente del cuerpo"
            value={config.bodyFont}
            options={FONT_OPTIONS}
            onChange={setStr('bodyFont')}
          />
          <Select
            label="Fuente de encabezados"
            value={config.headingFont}
            options={FONT_OPTIONS}
            onChange={setStr('headingFont')}
          />
          <Slider
            label="Tamano del cuerpo"
            value={config.bodySize}
            min={13}
            max={22}
            unit="px"
            onChange={setNum('bodySize')}
          />
          <Slider
            label="Escala H1"
            value={config.h1Size}
            min={1.4}
            max={3.5}
            step={0.1}
            unit="em"
            onChange={setNum('h1Size')}
          />
          <Slider
            label="Escala H2"
            value={config.h2Size}
            min={1.1}
            max={2.5}
            step={0.1}
            unit="em"
            onChange={setNum('h2Size')}
          />
          <Slider
            label="Escala H3"
            value={config.h3Size}
            min={1}
            max={2}
            step={0.1}
            unit="em"
            onChange={setNum('h3Size')}
          />
          <Slider
            label="Interlineado"
            value={config.bodyLh}
            min={1.2}
            max={2.2}
            step={0.1}
            onChange={setNum('bodyLh')}
          />
        </Section>

        {/* ── Cards ────────────────────────────────── */}
        <Section title="Cards" icon={LayoutGrid}>
          <Slider
            label="Radio de borde"
            value={config.cardRadius}
            min={0}
            max={24}
            unit="px"
            onChange={setNum('cardRadius')}
          />
          <Slider
            label="Ancho de borde"
            value={config.cardBorderWidth}
            min={0}
            max={4}
            unit="px"
            onChange={setNum('cardBorderWidth')}
          />
          <Toggle label="Sombra" value={config.cardShadow} onChange={setBool('cardShadow')} />
          <Toggle label="Mostrar encabezado" value={config.cardShowHeader} onChange={setBool('cardShowHeader')} />
          <Toggle label="Mostrar iconos" value={config.cardShowIcons} onChange={setBool('cardShowIcons')} />
        </Section>

        {/* ── Tablas ───────────────────────────────── */}
        <Section title="Tablas" icon={Table2}>
          <Toggle label="Filas alternadas" value={config.tableStriped} onChange={setBool('tableStriped')} />
          <Toggle label="Resaltar al pasar" value={config.tableHover} onChange={setBool('tableHover')} />
          <Select
            label="Estilo de borde"
            value={config.tableBorderStyle}
            options={[
              { value: 'solid', label: 'Solido' },
              { value: 'dashed', label: 'Discontinuo' },
              { value: 'dotted', label: 'Punteado' },
              { value: 'none', label: 'Sin borde' },
            ]}
            onChange={setStr('tableBorderStyle')}
          />
        </Section>

        {/* ── Espaciado ────────────────────────────── */}
        <Section title="Espaciado" icon={Maximize}>
          <Slider
            label="Ancho maximo"
            value={config.contentMaxWidth}
            min={600}
            max={1200}
            step={20}
            unit="px"
            onChange={setNum('contentMaxWidth')}
          />
          <Slider
            label="Padding"
            value={config.contentPadding}
            min={12}
            max={64}
            step={4}
            unit="px"
            onChange={setNum('contentPadding')}
          />
          <Slider
            label="Separacion entre cards"
            value={config.cardGap}
            min={8}
            max={48}
            step={4}
            unit="px"
            onChange={setNum('cardGap')}
          />
        </Section>

        {/* ── CSS personalizado ────────────────────── */}
        <Section title="CSS personalizado" icon={Code}>
          <textarea
            value={config.customCss}
            onChange={(e) => set('customCss', e.target.value)}
            placeholder="/* Escribe CSS personalizado aqui... */"
            className="w-full h-32 bg-[var(--app-bg)] text-[var(--app-fg)] text-xs font-mono
              border border-[var(--app-border)] rounded-lg p-3 resize-y outline-none
              focus:border-[var(--app-accent)] transition-colors"
            spellCheck={false}
          />
        </Section>

        {/* ── Importar / Exportar ──────────────────── */}
        <Section title="Importar / Exportar" icon={Download}>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                bg-[var(--app-accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={14} />
              Exportar JSON
            </button>
            <button
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                border border-[var(--app-border)] text-[var(--app-fg1)] text-xs font-medium
                hover:bg-[var(--app-bg2)] transition-colors"
            >
              <Upload size={14} />
              Importar JSON
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </Section>
      </div>
    </div>
  )
}
