import type { ThemeConfig } from '@/types/theme'

/** Genera un string CSS con custom properties a partir del ThemeConfig */
export function generateThemeCss(t: ThemeConfig): string {
  return `
  --t-bg: ${t.bg};
  --t-bg1: ${t.bg1};
  --t-bg2: ${t.bg2};
  --t-fg: ${t.fg};
  --t-fg1: ${t.fg1};
  --t-fg2: ${t.fg2};
  --t-fg3: ${t.fg3};

  --t-accent: ${t.accent};
  --t-accent-soft: ${t.accentSoft};
  --t-accent-border: ${t.accentBorder};

  --t-blue: ${t.blue};
  --t-blue-soft: ${t.blueSoft};
  --t-blue-border: ${t.blueBorder};
  --t-green: ${t.green};
  --t-green-soft: ${t.greenSoft};
  --t-green-border: ${t.greenBorder};
  --t-yellow: ${t.yellow};
  --t-yellow-soft: ${t.yellowSoft};
  --t-yellow-border: ${t.yellowBorder};
  --t-orange: ${t.orange};
  --t-orange-soft: ${t.orangeSoft};
  --t-orange-border: ${t.orangeBorder};
  --t-red: ${t.red};
  --t-red-soft: ${t.redSoft};
  --t-red-border: ${t.redBorder};
  --t-pink: ${t.pink};
  --t-pink-soft: ${t.pinkSoft};
  --t-pink-border: ${t.pinkBorder};
  --t-teal: ${t.teal};
  --t-teal-soft: ${t.tealSoft};
  --t-teal-border: ${t.tealBorder};

  --t-border: ${t.border};
  --t-border-hover: ${t.borderHover};
  --t-card-header-bg: ${t.cardHeaderBg};
  --t-table-head: ${t.tableHead};
  --t-row-hover: ${t.rowHover};
  --t-muted-soft: ${t.mutedSoft};

  --t-body-font: ${t.bodyFont};
  --t-heading-font: ${t.headingFont};
  --t-mono-font: ${t.monoFont};
  --t-body-size: ${t.bodySize}px;
  --t-h1-size: ${t.h1Size}em;
  --t-h2-size: ${t.h2Size}em;
  --t-h3-size: ${t.h3Size}em;
  --t-hero-size: ${t.heroSize}em;
  --t-body-lh: ${t.bodyLh};

  --t-card-radius: ${t.cardRadius}px;
  --t-card-border-width: ${t.cardBorderWidth}px;
  --t-card-shadow: ${t.cardShadow ? '0 4px 24px rgba(0,0,0,0.12)' : 'none'};
  --t-card-show-header: ${t.cardShowHeader ? 'flex' : 'none'};
  --t-card-show-icons: ${t.cardShowIcons ? 'inline-flex' : 'none'};

  --t-content-max-width: ${t.contentMaxWidth}px;
  --t-content-padding: ${t.contentPadding}px;
  --t-card-gap: ${t.cardGap}px;

  --t-table-striped-bg: ${t.tableStriped ? t.mutedSoft : 'transparent'};
  --t-table-hover-bg: ${t.tableHover ? t.rowHover : 'transparent'};
  --t-table-border-style: ${t.tableBorderStyle};

  --t-h2-bar: ${t.h2Bar};
  `.trim()
}

/** Genera el string CSS completo para exportación (tokens + base CSS) */
export function generateFullExportCss(t: ThemeConfig, baseCss: string): string {
  return `.edm-preview {\n  ${generateThemeCss(t)}\n}\n\n${baseCss}\n\n/* CSS personalizado */\n${t.customCss}`
}
