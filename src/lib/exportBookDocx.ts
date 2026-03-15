import { saveAs } from 'file-saver'
import type { PageConfig } from '@/types/contentMode'
import type { BookLayoutConfig } from '@/types/bookLayout'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, UnderlineType, SectionType,
} from 'docx'

/**
 * Exports book mode as DOCX using the `docx` package.
 * Converts HTML to basic DOCX paragraphs.
 * If a BookLayoutConfig is provided, applies column layouts where possible.
 */
export async function exportBookDocx(
  html: string,
  pageConfig: PageConfig,
  filename: string,
  bookLayout?: BookLayoutConfig | null,
): Promise<void> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild!

  // Build node map for manual layout
  const nodeMap = new Map<string, Element>()
  let ordinal = 0
  for (const child of Array.from(root.children)) {
    const el = child as HTMLElement
    if (el.tagName === 'STYLE' || el.tagName === 'LINK') continue
    const id = el.getAttribute('id') || `node-${ordinal}`
    nodeMap.set(id, el)
    ordinal++
  }

  const mmToTwips = (mm: number) => Math.round(mm * 56.7)

  const basePageProps = {
    page: {
      size: {
        width: mmToTwips(pageConfig.width),
        height: mmToTwips(pageConfig.height),
      },
      margin: {
        top: mmToTwips(pageConfig.margins.top),
        bottom: mmToTwips(pageConfig.margins.bottom),
        left: mmToTwips(pageConfig.margins.left),
        right: mmToTwips(pageConfig.margins.right),
      },
    },
  }

  if (bookLayout?.isManual) {
    // Build sections per page, applying column layout where possible
    const sections = bookLayout.pages.map((pageConf, i) => {
      const children: Paragraph[] = []

      for (const blockId of pageConf.blockIds) {
        const el = nodeMap.get(blockId)
        if (!el) continue
        children.push(...parseElement(el))
      }

      const columnCount = pageConf.layout === 'two-columns' ? 2
        : pageConf.layout === 'sidebar-left' || pageConf.layout === 'sidebar-right' ? 2
        : 1

      return {
        properties: {
          ...basePageProps,
          ...(i > 0 ? { type: SectionType.NEXT_PAGE } : {}),
          ...(columnCount > 1 ? {
            column: {
              space: mmToTwips(5),
              count: columnCount,
            },
          } : {}),
        },
        children,
      }
    })

    const document = new Document({
      sections,
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
    })

    const blob = await Packer.toBlob(document)
    saveAs(blob, filename.replace(/\.edm$/, '') + '_libro.docx')
  } else {
    // Default: sequential flow
    const children: Paragraph[] = []
    for (const node of Array.from(root.children)) {
      children.push(...parseElement(node))
    }

    const document = new Document({
      sections: [
        {
          properties: basePageProps,
          children,
        },
      ],
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.START,
              },
            ],
          },
        ],
      },
    })

    const blob = await Packer.toBlob(document)
    saveAs(blob, filename.replace(/\.edm$/, '') + '_libro.docx')
  }
}

/** Parse a single DOM element into DOCX paragraphs */
function parseElement(node: Element): Paragraph[] {
  const children: Paragraph[] = []
  const tag = node.tagName.toLowerCase()

  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6
    const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    }
    children.push(
      new Paragraph({
        heading: headingMap[level],
        children: [new TextRun({ text: node.textContent || '' })],
      })
    )
  } else if (tag === 'p') {
    children.push(
      new Paragraph({
        children: parseInlineContent(node),
      })
    )
  } else if (tag === 'ul' || tag === 'ol') {
    const items = node.querySelectorAll('li')
    items.forEach((li) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: li.textContent || '' })],
          bullet: tag === 'ul' ? { level: 0 } : undefined,
          numbering: tag === 'ol' ? { reference: 'default-numbering', level: 0 } : undefined,
        })
      )
    })
  } else if (tag === 'blockquote') {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: node.textContent || '', italics: true })],
        indent: { left: 720 },
      })
    )
  } else if (tag === 'pre') {
    const code = node.textContent || ''
    code.split('\n').forEach((line) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
        })
      )
    })
  } else {
    // For container elements (article, section, div), recurse into children
    if (node.children.length > 0) {
      for (const child of Array.from(node.children)) {
        children.push(...parseElement(child))
      }
    } else if (node.textContent?.trim()) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: node.textContent || '' })],
        })
      )
    }
  }

  return children
}

/** Parse inline elements (bold, italic, code) from a DOM node */
function parseInlineContent(node: Element): TextRun[] {
  const runs: TextRun[] = []

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      runs.push(new TextRun({ text: child.textContent || '' }))
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      const text = el.textContent || ''

      if (tag === 'strong' || tag === 'b') {
        runs.push(new TextRun({ text, bold: true }))
      } else if (tag === 'em' || tag === 'i') {
        runs.push(new TextRun({ text, italics: true }))
      } else if (tag === 'code') {
        runs.push(new TextRun({ text, font: 'Courier New' }))
      } else if (tag === 'a') {
        runs.push(new TextRun({ text, underline: { type: UnderlineType.SINGLE } }))
      } else {
        runs.push(new TextRun({ text }))
      }
    }
  }

  return runs
}
