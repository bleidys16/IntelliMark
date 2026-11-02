import { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { Note } from '../../shared/types'
import { buildTimestampUrl } from '../../shared/youtube'

interface ExportWordOptions {
  includeDate?: boolean
}

/**
 * Genera un documento Microsoft Word (.docx) estructurado con portada, tabla de notas y enlaces a YouTube.
 */
export async function generateWordDocument(
  videoId: string,
  videoTitle: string,
  notes: Note[],
  options: ExportWordOptions = {}
): Promise<Blob> {
  const { includeDate = true } = options
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const sortedNotes = [...notes].sort((a, b) => a.timestampSec - b.timestampSec)

  // Filas de la tabla de notas
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: '2D3748' },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Timestamp',
                  bold: true,
                  color: 'FFFFFF',
                  font: 'Manrope',
                  size: 22,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          shading: { fill: '2D3748' },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Apuntes / Notas',
                  bold: true,
                  color: 'FFFFFF',
                  font: 'Manrope',
                  size: 22,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ]

  sortedNotes.forEach((note, index) => {
    const timestampUrl = buildTimestampUrl(videoId, note.timestampSec)
    const isEven = index % 2 === 0
    const cellBg = isEven ? 'F7FAFC' : 'FFFFFF'

    const textParagraphs = note.text.split('\n').map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Manrope',
              size: 20,
              color: '2D3748',
            }),
          ],
          spacing: { after: 80 },
        })
    )

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: cellBg },
            children: [
              new Paragraph({
                children: [
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: `▶ ${note.formattedTime}`,
                        bold: true,
                        color: '4F46E5',
                        underline: {},
                        font: 'Manrope',
                        size: 20,
                      }),
                    ],
                    link: timestampUrl,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            shading: { fill: cellBg },
            children: textParagraphs,
          }),
        ],
      })
    )
  })

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Título principal
          new Paragraph({
            text: 'Apuntes de Video: IntelliMark',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 120 },
            style: 'TitleStyle',
          }),

          // Título del video con enlace
          new Paragraph({
            children: [
              new TextRun({
                text: 'Video: ',
                bold: true,
                font: 'Manrope',
                size: 24,
                color: '1A202C',
              }),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: videoTitle || 'Video de YouTube',
                    bold: true,
                    color: '4F46E5',
                    underline: {},
                    font: 'Manrope',
                    size: 24,
                  }),
                ],
                link: videoUrl,
              }),
            ],
            spacing: { after: 100 },
          }),

          // Fecha y metadatos
          ...(includeDate
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Documento generado el ${formattedDate} con IntelliMark`,
                      italics: true,
                      color: '718096',
                      font: 'Manrope',
                      size: 18,
                    }),
                  ],
                  spacing: { after: 300 },
                }),
              ]
            : []),

          // Tabla con notas
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EDF2F7' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EDF2F7' },
            },
          }),
        ],
      },
    ],
  })

  return await Packer.toBlob(doc)
}

/**
 * Dispara la descarga del archivo Word (.docx) generado.
 */
export function downloadWordDocument(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
