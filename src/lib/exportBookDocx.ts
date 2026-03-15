import { saveAs } from 'file-saver'
import type { PageConfig } from '@/types/contentMode'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, UnderlineType,
} from 'docx'

/**
 * Exports book mode as DOCX using the `docx` package.
 * Converts HTML to basic DOCX paragraphs.
 */
export async function exportBookDocx(
  html: string,
  pageConfig: PageConfig,
  filename: string
): Promise<void> {
  // Parse HTML into a temp DOM
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild!

  const children: Paragraph[] = []

  for (const node of Array.from(root.children)) {
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
      if (node.textContent?.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: node.textContent || '' })],
          })
        )
      }
    }
  }

  // Convert mm to twips (1 mm = ~56.7 twips)
  const mmToTwips = (mm: number) => Math.round(mm * 56.7)

  const document = new Document({
    sections: [
      {
        properties: {
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
        },
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
