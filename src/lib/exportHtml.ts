import type { ThemeConfig } from '@/types/theme'
import { generateThemeCss } from '@/components/preview/previewTheme'
import previewBaseCss from '@/styles/preview-base.css?raw'
import { interactivityScript, interactivityCss } from '@/lib/interactivity'

/** Decide si un color hex es oscuro */
function isDarkColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5
}

/** Genera el script de Mermaid para HTML exportado */
function mermaidExportScript(theme: ThemeConfig): string {
  const dark = isDarkColor(theme.bg)
  const vars = {
    primaryColor: dark ? theme.accent + '30' : theme.accent + '18',
    primaryTextColor: theme.fg,
    primaryBorderColor: theme.accentBorder,
    lineColor: theme.fg2,
    secondaryColor: dark ? theme.blue + '25' : theme.blue + '14',
    tertiaryColor: dark ? theme.green + '25' : theme.green + '14',
    background: 'transparent',
    mainBkg: theme.bg1,
    textColor: theme.fg,
    nodeBorder: theme.border,
    clusterBkg: theme.bg2,
    clusterBorder: theme.border,
    titleColor: theme.fg,
    edgeLabelBackground: theme.bg,
    nodeTextColor: theme.fg,
    fontFamily: theme.bodyFont,
    fontSize: '14px',
  }
  return `mermaid.initialize({startOnLoad:true,theme:'base',darkMode:${dark},themeVariables:${JSON.stringify(vars)},securityLevel:'loose'});mermaid.run().then(()=>{document.querySelectorAll('.edm-diagram-render').forEach(el=>{const svg=el.querySelector('svg');if(!svg)return;const z=parseFloat(el.getAttribute('data-edm-zoom'))||1;const w=parseFloat(svg.getAttribute('width'))||svg.viewBox.baseVal.width||800;const h=parseFloat(svg.getAttribute('height'))||svg.viewBox.baseVal.height||600;const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const img2=new Image();img2.onload=()=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const ctx=c.getContext('2d');ctx.scale(2,2);ctx.drawImage(img2,0,0,w,h);URL.revokeObjectURL(url);const png=document.createElement('img');png.src=c.toDataURL('image/png');png.alt='Mermaid diagram';png.width=w;png.height=h;png.style.display='block';png.style.margin='0 auto';png.style.width=z*100+'%';png.style.maxWidth=z*100+'%';png.style.height='auto';const wr=svg.closest('.edm-mermaid-rendered')||svg.parentElement;if(wr){wr.innerHTML='';wr.appendChild(png);}else{svg.replaceWith(png);}};img2.src=url;});});`
}

/**
 * Genera un archivo HTML completo y autocontenido
 * con todo el CSS inlined y listo para abrir en cualquier navegador.
 */
export function exportFullHtml(html: string, theme: ThemeConfig, title: string): string {
  const themeCssVars = generateThemeCss(theme)
  const hasMermaid = html.includes('class="mermaid"')

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
    ${interactivityCss}
    ${theme.customCss ? `/* CSS personalizado */\n${theme.customCss}` : ''}
  </style>
</head>
<body>
  <div class="edm-preview">
    ${html}
  </div>
  <script>${interactivityScript}</script>${hasMermaid ? `\n  <script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';${mermaidExportScript(theme)}</script>` : ''}
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
