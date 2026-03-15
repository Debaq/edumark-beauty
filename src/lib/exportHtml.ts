import type { ThemeConfig } from '@/types/theme'
import { generateThemeCss } from '@/components/preview/previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'

/**
 * Genera un archivo HTML completo y autocontenido
 * con todo el CSS inlined y listo para abrir en cualquier navegador.
 */
export function exportFullHtml(html: string, theme: ThemeConfig, title: string): string {
  const themeCssVars = generateThemeCss(theme)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: ${theme.bg};
      min-height: 100vh;
    }
    .edm-preview {
      ${themeCssVars}
    }
    ${previewBaseCss}
    ${theme.customCss ? `/* CSS personalizado */\n${theme.customCss}` : ''}
  </style>
</head>
<body>
  <div class="edm-preview">
    ${html}
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
