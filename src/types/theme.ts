/** Configuración completa de tema visual para la vista previa */
export interface ThemeConfig {
  // Base
  bg: string
  bg1: string
  bg2: string
  fg: string
  fg1: string
  fg2: string
  fg3: string

  // Acento
  accent: string
  accentSoft: string
  accentBorder: string

  // Colores semánticos
  blue: string
  blueSoft: string
  blueBorder: string
  green: string
  greenSoft: string
  greenBorder: string
  yellow: string
  yellowSoft: string
  yellowBorder: string
  orange: string
  orangeSoft: string
  orangeBorder: string
  red: string
  redSoft: string
  redBorder: string
  pink: string
  pinkSoft: string
  pinkBorder: string
  teal: string
  tealSoft: string
  tealBorder: string

  // Interfaz
  border: string
  borderHover: string
  cardHeaderBg: string
  tableHead: string
  rowHover: string
  mutedSoft: string

  // Tipografía
  bodyFont: string
  headingFont: string
  monoFont: string
  bodySize: number
  h1Size: number
  h2Size: number
  h3Size: number
  heroSize: number
  bodyLh: number

  // Cards
  cardRadius: number
  cardBorderWidth: number
  cardShadow: boolean
  cardShowHeader: boolean
  cardShowIcons: boolean

  // Layout
  contentMaxWidth: number
  contentPadding: number
  cardGap: number

  // Tablas
  tableStriped: boolean
  tableHover: boolean
  tableBorderStyle: 'solid' | 'dashed' | 'dotted' | 'none'

  // Decoración
  h2Bar: string

  // CSS personalizado
  customCss: string
}

/** Nombres legibles de los colores semánticos */
export const SEMANTIC_COLORS = [
  { key: 'blue', label: 'Azul (Definiciones)' },
  { key: 'green', label: 'Verde (Conceptos clave)' },
  { key: 'yellow', label: 'Amarillo (Notas)' },
  { key: 'orange', label: 'Naranja (Advertencias)' },
  { key: 'red', label: 'Rojo (Alertas)' },
  { key: 'pink', label: 'Rosa (Mnemotecnia)' },
  { key: 'teal', label: 'Verde azulado (Ejemplos)' },
] as const

export type SemanticColorKey = (typeof SEMANTIC_COLORS)[number]['key']

/** Categorías de fuentes disponibles */
export const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Sans-Serif (Inter)' },
  { value: 'Merriweather, Georgia, serif', label: 'Serif (Merriweather)' },
  { value: '"JetBrains Mono", monospace', label: 'Monoespaciada' },
] as const
