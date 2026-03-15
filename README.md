# Edumark Beauty

Transforma documentos [Edumark](https://github.com/Debaq/edumark) (`.edm`) en publicaciones hermosas. Editor en vivo, configuración visual profunda, y exportación a múltiples formatos.

```
.edm → [editor] → [configuración visual] → HTML / PDF / DOCX
```

## Qué hace

1. **Abres** un archivo `.edm` (arrastrando, seleccionando, o cargando el demo)
2. **Editas** con syntax highlighting en CodeMirror 6
3. **Configuras** cada aspecto visual: colores, tipografía, cards, tablas, espaciado
4. **Exportas** a HTML, PDF o DOCX con un click

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Estilos app | Tailwind CSS 4 |
| Estado | Zustand |
| Editor | CodeMirror 6 (markdown + oneDark) |
| Decoder | [edumark-js](https://github.com/Debaq/edumark-js) |
| Fórmulas | KaTeX |
| Diagramas | Mermaid |
| PDF | html2pdf.js |
| DOCX | html-to-docx |
| Iconos | Lucide React |

## Configuración visual

El panel derecho permite controlar cada parámetro visual del documento renderizado. Todos los cambios se aplican en vivo sobre la vista previa.

### Presets
4 temas base: Oscuro, Claro, Sepia, AMOLED. Un click aplica ~100 tokens de diseño.

### Colores
- **Globales**: background, foreground, accent, bordes
- **Por bloque**: cada tipo de bloque pedagógico (definition, warning, key-concept, exercise, question, etc.) tiene su propio color de acento y fondo

### Tipografía
- Fuente del cuerpo y de títulos (independientes)
- Tamaño base con slider (13–22px)
- Escala de headings
- Interlineado (1.2–2.2)

### Cards
Border radius, border width, sombra, visibilidad de header e iconos — todo con controles individuales.

### Tablas
Filas alternadas, hover, estilo de bordes.

### Espaciado
Gap entre cards, ancho máximo del contenido, padding.

### CSS personalizado
Textarea para inyectar CSS que se aplica sobre todo lo demás.

### Temas como JSON
Exporta el tema completo como `.json` para reutilizarlo. Importa un `.json` y aplica todos los tokens al instante.

## Formatos de exportación

| Formato | Descripción |
|---|---|
| **HTML completo** | Página standalone con CSS embebido y Google Fonts |
| **HTML snippet** | Fragmento copiado al portapapeles para insertar en otra web |
| **PDF** | Documento paginado para imprimir |
| **DOCX** | Documento editable para Word / LibreOffice |

## Desarrollo

```bash
git clone https://github.com/Debaq/edumark-beauty.git
cd edumark-beauty
npm install
npm run dev
```

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build |

## Ecosistema Edumark

| Repo | Descripción |
|---|---|
| [edumark](https://github.com/Debaq/edumark) | Especificación del formato `.edm` |
| [edumark-js](https://github.com/Debaq/edumark-js) | Decoder JavaScript/TypeScript |
| **edumark-beauty** | Transformador visual y exportador (este repo) |

## Licencia

MIT
