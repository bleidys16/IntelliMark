import React, { useState } from 'react'
import { Download, Copy, Check, X, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Note } from '../../shared/types'
import {
  generateMarkdown,
  downloadMarkdownFile,
  copyMarkdownToClipboard,
} from '../../core/markdown/exporter'
import { generateWordDocument, downloadWordDocument } from '../../core/word/word-exporter'

interface ExportModalProps {
  videoId: string
  videoTitle: string
  notes: Note[]
  onClose: () => void
}

export const ExportModal: React.FC<ExportModalProps> = ({
  videoId,
  videoTitle,
  notes,
  onClose,
}) => {
  const [exportFormat, setExportFormat] = useState<'markdown' | 'word'>('word')
  const [copied, setCopied] = useState<boolean>(false)
  const [isGeneratingWord, setIsGeneratingWord] = useState<boolean>(false)
  const [includeDate, setIncludeDate] = useState<boolean>(true)
  const [includeHeader, setIncludeHeader] = useState<boolean>(true)
  const [bulletStyle, setBulletStyle] = useState<'-' | '*'>('-')

  const markdownContent = generateMarkdown(videoId, videoTitle, notes, {
    includeHeader,
    includeDate,
    bulletStyle,
  })

  const getCleanTitle = () => {
    return (videoTitle || 'notas-youtube')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50)
  }

  const handleCopyMarkdown = async () => {
    const ok = await copyMarkdownToClipboard(markdownContent)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadMarkdown = () => {
    downloadMarkdownFile(`${getCleanTitle()}.md`, markdownContent)
  }

  const handleDownloadWord = async () => {
    setIsGeneratingWord(true)
    try {
      const blob = await generateWordDocument(videoId, videoTitle, notes, {
        includeDate,
      })
      downloadWordDocument(`${getCleanTitle()}.docx`, blob)
    } finally {
      setIsGeneratingWord(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <FileText size={18} color="var(--primary)" />
            <h3>Exportar Notas ({notes.length})</h3>
          </div>
          <button className="action-icon-btn" onClick={onClose} title="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Selector de formato: Word vs Markdown */}
          <div className="format-toggle-container">
            <button
              type="button"
              className={`format-toggle-btn ${exportFormat === 'word' ? 'active' : ''}`}
              onClick={() => setExportFormat('word')}
            >
              <FileSpreadsheet size={15} />
              <span>Microsoft Word (.docx)</span>
            </button>
            <button
              type="button"
              className={`format-toggle-btn ${exportFormat === 'markdown' ? 'active' : ''}`}
              onClick={() => setExportFormat('markdown')}
            >
              <FileText size={15} />
              <span>Markdown (.md)</span>
            </button>
          </div>

          {/* Opciones para Word */}
          {exportFormat === 'word' && (
            <div className="export-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeDate}
                  onChange={(e) => setIncludeDate(e.target.checked)}
                />
                <span>Incluir fecha y metadatos del video</span>
              </label>
              <p className="settings-tip" style={{ marginTop: '4px' }}>
                Genera un documento <strong>.docx</strong> estructurado con tabla de dos columnas, timestamps enlazados directamente a YouTube y tipografía Manrope para impresión o entrega académica.
              </p>
            </div>
          )}

          {/* Opciones para Markdown */}
          {exportFormat === 'markdown' && (
            <>
              <div className="export-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={(e) => setIncludeHeader(e.target.checked)}
                  />
                  <span>Incluir título y enlace al video</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeDate}
                    onChange={(e) => setIncludeDate(e.target.checked)}
                  />
                  <span>Incluir fecha de exportación</span>
                </label>
                <div className="bullet-selector">
                  <span className="bullet-label">Estilo de viñeta:</span>
                  <button
                    type="button"
                    className={`chip-btn ${bulletStyle === '-' ? 'active' : ''}`}
                    onClick={() => setBulletStyle('-')}
                  >
                    Guión (-)
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${bulletStyle === '*' ? 'active' : ''}`}
                    onClick={() => setBulletStyle('*')}
                  >
                    Asterisco (*)
                  </button>
                </div>
              </div>

              {/* Vista previa de Markdown */}
              <div className="preview-container">
                <div className="preview-header">
                  <span>Vista previa de Markdown</span>
                </div>
                <pre className="markdown-preview">{markdownContent}</pre>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {exportFormat === 'markdown' ? (
            <>
              <button className="btn btn-secondary" onClick={handleCopyMarkdown}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copied ? '¡Copiado!' : 'Copiar Markdown'}</span>
              </button>
              <button className="btn btn-primary" onClick={handleDownloadMarkdown}>
                <Download size={14} />
                <span>Descargar .md</span>
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleDownloadWord}
              disabled={isGeneratingWord}
            >
              {isGeneratingWord ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Generando Word...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Descargar documento Word (.docx)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
