import { Note } from '../../shared/types'
import { buildTimestampUrl } from '../../shared/youtube'

interface ExportOptions {
  includeHeader?: boolean
  includeDate?: boolean
  bulletStyle?: '-' | '*'
}

/**
 * Escapa corchetes para evitar romper enlaces de Markdown en el texto de la nota.
 */
function sanitizeMarkdownText(text: string): string {
  return text.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

/**
 * Genera el documento Markdown a partir de un video y sus notas.
 */
export function generateMarkdown(
  videoId: string,
  videoTitle: string,
  notes: Note[],
  options: ExportOptions = {}
): string {
  const { includeHeader = true, includeDate = true, bulletStyle = '-' } = options
  const lines: string[] = []
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

  if (includeHeader) {
    lines.push(`# Notas: [${sanitizeMarkdownText(videoTitle || 'Video de YouTube')}](${videoUrl})`)
    lines.push('')
  }

  if (includeDate) {
    const formattedDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    lines.push(`> *Exportado con IntelliMark el ${formattedDate}*`)
    lines.push('')
  }

  if (notes.length === 0) {
    lines.push('_No hay notas registradas para este video._')
    return lines.join('\n')
  }

  // Ordenar cronológicamente por timestamp
  const sorted = [...notes].sort((a, b) => a.timestampSec - b.timestampSec)

  sorted.forEach((note) => {
    const timestampUrl = buildTimestampUrl(videoId, note.timestampSec)
    const sanitizedText = sanitizeMarkdownText(note.text)

    // Formato: - [01:23](https://youtube.com/watch?v=...&t=83s) Texto de la nota
    // Manejo de multilínea: si la nota tiene saltos de línea, sangrar las líneas siguientes
    const textLines = sanitizedText.split('\n')
    const firstLine = `${bulletStyle} [**${note.formattedTime}**](${timestampUrl}) ${textLines[0]}`
    lines.push(firstLine)

    for (let i = 1; i < textLines.length; i++) {
      if (textLines[i].trim()) {
        lines.push(`  ${textLines[i]}`)
      } else {
        lines.push('')
      }
    }
  })

  lines.push('')
  return lines.join('\n')
}

/**
 * Descarga una cadena de texto como archivo .md sin requerir permisos de 'downloads' en Chrome.
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copia el contenido Markdown al portapapeles del sistema operativo.
 */
export async function copyMarkdownToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content)
    return true
  } catch (err) {
    console.error('[IntelliMark] Error al copiar al portapapeles:', err)
    return false
  }
}
