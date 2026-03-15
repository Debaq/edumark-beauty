import { saveAs } from 'file-saver'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, UnderlineType,
} from 'docx'

/**
 * Genera un archivo .docx a partir del HTML renderizado (modo HTML).
 * Usa la librería `docx` que funciona nativamente en el navegador.
 */
export async function exportDocx(html: string, filename: string): Promise<void> {
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

  // A4 defaults: 210x297mm, margins 25.4mm (1 inch)
  const mmToTwips = (mm: number) => Math.round(mm * 56.7)

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mmToTwips(210),
              height: mmToTwips(297),
            },
            margin: {
              top: mmToTwips(25.4),
              bottom: mmToTwips(25.4),
              left: mmToTwips(25.4),
              right: mmToTwips(25.4),
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
  saveAs(blob, filename.replace(/\.edm$/, '') + '.docx')
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
