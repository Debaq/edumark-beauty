import type { ThemeConfig } from '@/types/theme'
import { generateThemeCss, generateFullExportCss } from '@/components/preview/previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityCss, interactivityScript } from '@/lib/interactivity'

/* ── Modo <style> block ──────────────────────────── */

export function buildStyledSnippet(html: string, theme: ThemeConfig): string {
  const css = generateFullExportCss(theme, previewBaseCss)
  const hasQuestions = html.includes('edm-question')

  return `<style>\n${css}\n${interactivityCss}\n</style>\n<div class="edm-preview">\n${html}\n</div>${hasQuestions ? `\n<script>${interactivityScript}</script>` : ''}`
}

/* ── Modo inline styles ──────────────────────────── */

/** Extrae las declaraciones --t-* del tema a un mapa nombre→valor */
function buildVarMap(theme: ThemeConfig): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of generateThemeCss(theme).split('\n')) {
    const m = line.match(/^\s*(--t-[^:]+):\s*(.+?)\s*;?\s*$/)
    if (m) map.set(m[1], m[2])
  }
  return map
}

/** Reemplaza var(--t-*) por sus valores reales */
function resolveVars(css: string, vars: Map<string, string>): string {
  return css.replace(/var\((--t-[^)]+)\)/g, (_, name) => vars.get(name) ?? '')
}

/**
 * Genera un fragmento HTML con todos los estilos aplicados inline
 * en cada elemento. No requiere <style> — máxima compatibilidad con
 * Moodle y otros LMS que filtran tags de estilo.
 */
export function buildInlineSnippet(html: string, theme: ThemeConfig): string {
  const vars = buildVarMap(theme)
  const resolved = resolveVars(
    `${previewBaseCss}\n${interactivityCss}\n${theme.customCss ?? ''}`,
    vars,
  )

  // Parsear CSS con el motor del navegador
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(resolved)

  // Construir DOM temporal
  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><body><div class="edm-preview">${html}</div></body></html>`,
    'text/html',
  )
  const root = doc.querySelector('.edm-preview')!

  // Aplicar cada regla CSS como estilos inline
  for (const rule of sheet.cssRules) {
    if (!(rule instanceof CSSStyleRule)) continue
    if (rule.selectorText.includes('::')) continue

    const els: Element[] = []
    try { if (root.matches(rule.selectorText)) els.push(root) } catch { /* selector inválido */ }
    try { els.push(...root.querySelectorAll(rule.selectorText)) } catch { /* selector inválido */ }

    for (const el of els) {
      const s = (el as HTMLElement).style
      for (let i = 0; i < rule.style.length; i++) {
        const p = rule.style[i]
        s.setProperty(p, rule.style.getPropertyValue(p))
      }
    }
  }

  const hasQuestions = html.includes('edm-question')
  return `${root.outerHTML}${hasQuestions ? `\n<script>${interactivityScript}</script>` : ''}`
}

/* ── API pública ──────────────────────────────────── */

export async function copyHtmlSnippet(
  html: string,
  theme: ThemeConfig,
  inline: boolean,
): Promise<void> {
  const snippet = inline
    ? buildInlineSnippet(html, theme)
    : buildStyledSnippet(html, theme)
  await navigator.clipboard.writeText(snippet)
}
