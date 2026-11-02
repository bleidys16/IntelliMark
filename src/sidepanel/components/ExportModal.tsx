import React, { useState, useEffect } from 'react'
import {
  Download,
  Copy,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  Loader2,
  Zap,
  LogIn,
  LogOut,
  ExternalLink,
  UploadCloud,
  GraduationCap,
} from 'lucide-react'
import { Note } from '../../shared/types'
import {
  generateMarkdown,
  downloadMarkdownFile,
  copyMarkdownToClipboard,
} from '../../core/markdown/exporter'
import { generateWordDocument, downloadWordDocument } from '../../core/word/word-exporter'
import {
  loginToIntellixy,
  logoutIntellixy,
  getIntellixySession,
  getIntellixySubjects,
  uploadNotesToIntellixy,
  IntellixySubject,
  IntellixySession,
  INTELLIXY_BASE_URL,
} from '../../core/intellixy/intellixy-client'

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
  const [exportFormat, setExportFormat] = useState<'word' | 'markdown' | 'intellixy'>('word')
  const [copied, setCopied] = useState<boolean>(false)
  const [isGeneratingWord, setIsGeneratingWord] = useState<boolean>(false)
  const [includeDate, setIncludeDate] = useState<boolean>(true)
  const [includeHeader, setIncludeHeader] = useState<boolean>(true)
  const [bulletStyle, setBulletStyle] = useState<'-' | '*'>('-')

  // Estados de Intellixy
  const [session, setSession] = useState<IntellixySession>({ connected: false })
  const [loginEmail, setLoginEmail] = useState<string>('')
  const [loginPassword, setLoginPassword] = useState<string>('')
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const [subjects, setSubjects] = useState<IntellixySubject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false)
  const [isUploadingNotes, setIsUploadingNotes] = useState<boolean>(false)
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Cargar sesión de Intellixy al montar o cambiar a la pestaña
  useEffect(() => {
    checkSession()
  }, [exportFormat])

  const checkSession = async () => {
    const s = await getIntellixySession()
    setSession(s)
    if (s.connected) {
      loadSubjects()
    }
  }

  const loadSubjects = async () => {
    setIsLoadingSubjects(true)
    setUploadError(null)
    try {
      const res = await getIntellixySubjects()
      if (res.success && res.subjects) {
        setSubjects(res.subjects)
        if (res.subjects.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(res.subjects[0].id)
        }
      } else if (res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : 'Error al obtener materias.'
        setUploadError(errorMsg)
        if (errorMsg.toLowerCase().includes('expirado') || errorMsg.toLowerCase().includes('sesión')) {
          setSession({ connected: false })
        }
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error al cargar materias')
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail.trim() || !loginPassword) return

    setIsLoggingIn(true)
    setLoginError(null)

    try {
      const res = await loginToIntellixy(loginEmail, loginPassword)
      if (res.success) {
        setLoginPassword('')
        await checkSession()
      } else {
        const errorMsg = typeof res.error === 'string' ? res.error : 'Credenciales incorrectas.'
        setLoginError(errorMsg)
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Error al conectar con Intellixy')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await logoutIntellixy()
    setSession({ connected: false })
    setSubjects([])
    setSelectedSubjectId('')
    setUploadSuccess(false)
    setUploadError(null)
  }

  const handleUploadToIntellixy = async () => {
    if (!selectedSubjectId) return
    setIsUploadingNotes(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      const res = await uploadNotesToIntellixy({
        subjectId: selectedSubjectId,
        videoTitle,
        videoId,
        notes,
      })

      if (res.success) {
        setUploadSuccess(true)
      } else {
        const errorMsg = typeof res.error === 'string' ? res.error : 'Error al subir las notas a Intellixy.'
        setUploadError(errorMsg)
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error inesperado al subir las notas.')
    } finally {
      setIsUploadingNotes(false)
    }
  }

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
          {/* Selector de formato: Word vs Markdown vs Intellixy */}
          <div className="format-toggle-container">
            <button
              type="button"
              className={`format-toggle-btn ${exportFormat === 'word' ? 'active' : ''}`}
              onClick={() => setExportFormat('word')}
            >
              <FileSpreadsheet size={14} />
              <span>Word (.docx)</span>
            </button>
            <button
              type="button"
              className={`format-toggle-btn ${exportFormat === 'markdown' ? 'active' : ''}`}
              onClick={() => setExportFormat('markdown')}
            >
              <FileText size={14} />
              <span>Markdown (.md)</span>
            </button>
            <button
              type="button"
              className={`format-toggle-btn ${exportFormat === 'intellixy' ? 'active' : ''}`}
              onClick={() => setExportFormat('intellixy')}
              title="Sincronizar con la plataforma Intellixy"
            >
              <Zap size={14} color={exportFormat === 'intellixy' ? '#ffffff' : '#f59e0b'} />
              <span>Intellixy</span>
            </button>
          </div>

          {/* Pestaña: Microsoft Word */}
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

          {/* Pestaña: Markdown */}
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

          {/* Pestaña: Intellixy (Opcional) */}
          {exportFormat === 'intellixy' && (
            <div className="intellixy-export-panel">
              {!session.connected ? (
                /* Formulario de Login Directo en Intellixy */
                <form onSubmit={handleLoginSubmit} className="intellixy-login-card">
                  <div className="intellixy-login-header">
                    <div className="intellixy-badge-icon">
                      <GraduationCap size={18} color="#4f46e5" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0 }}>
                        Conectar cuenta de Intellixy
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                        Sube tus notas directamente a tu materia para generar Flashcards y Quizzes.
                      </p>
                    </div>
                  </div>

                  {loginError && (
                    <div className="ai-error-banner" style={{ margin: '4px 0' }}>
                      <span>{String(loginError)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        className="search-input"
                        placeholder="tu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={isLoggingIn}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Contraseña
                      </label>
                      <input
                        type="password"
                        className="search-input"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={isLoggingIn}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                    disabled={isLoggingIn || !loginEmail.trim() || !loginPassword}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 size={14} className="spin" /> Conectando...
                      </>
                    ) : (
                      <>
                        <LogIn size={14} /> Iniciar sesión en Intellixy
                      </>
                    )}
                  </button>

                  <p style={{ fontSize: '10.5px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '4px' }}>
                    ¿No tienes cuenta?{' '}
                    <a
                      href={`${INTELLIXY_BASE_URL}/login`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--primary)', fontWeight: 700 }}
                    >
                      Regístrate gratis en intellixy.vercel.app <ExternalLink size={10} />
                    </a>
                  </p>
                </form>
              ) : (
                /* Sesión Activa: Selector de Materia y Envío */
                <div className="intellixy-connected-card">
                  <div className="intellixy-user-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="online-indicator"></span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {session.user?.email || 'Conectado a Intellixy'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={handleLogout}
                      title="Cerrar sesión de Intellixy"
                      style={{ fontSize: '10.5px', padding: '2px 6px' }}
                    >
                      <LogOut size={11} /> Desconectar
                    </button>
                  </div>

                  {uploadError && (
                    <div className="ai-error-banner" style={{ margin: '6px 0' }}>
                      <span>{String(uploadError)}</span>
                    </div>
                  )}

                  {uploadSuccess ? (
                    <div className="intellixy-success-card">
                      <Check size={20} color="#10b981" />
                      <div>
                        <h5 style={{ fontSize: '12.5px', fontWeight: 800, margin: 0, color: '#059669' }}>
                          ¡Notas subidas con éxito!
                        </h5>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 8px 0' }}>
                          Tus apuntes se guardaron correctamente en Intellixy como material de estudio.
                        </p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <a
                            href={`${INTELLIXY_BASE_URL}/dashboard`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                          >
                            Abrir Intellixy <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            className="chip-btn"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => {
                              setUploadSuccess(false)
                              setUploadError(null)
                            }}
                          >
                            Subir a otra materia
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Selecciona la materia de destino:
                      </label>

                      {isLoadingSubjects ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', padding: '8px 0' }}>
                          <Loader2 size={13} className="spin" /> Cargando tus materias...
                        </div>
                      ) : subjects.length === 0 ? (
                        <div style={{ padding: '8px 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          No se encontraron materias en tu cuenta.{' '}
                          <a
                            href={`${INTELLIXY_BASE_URL}/dashboard`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--primary)', fontWeight: 700 }}
                          >
                            Crea una materia en Intellixy ↗
                          </a>
                        </div>
                      ) : (
                        <select
                          className="search-input"
                          style={{ width: '100%', padding: '7px 10px', fontSize: '12px' }}
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                          disabled={isUploadingNotes}
                        >
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              📚 {sub.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                        onClick={handleUploadToIntellixy}
                        disabled={isUploadingNotes || !selectedSubjectId || subjects.length === 0}
                      >
                        {isUploadingNotes ? (
                          <>
                            <Loader2 size={14} className="spin" /> Subiendo {notes.length} notas...
                          </>
                        ) : (
                          <>
                            <UploadCloud size={14} /> Subir {notes.length} notas a Intellixy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (Solo para Word y Markdown) */}
        {exportFormat !== 'intellixy' && (
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
        )}
      </div>
    </div>
  )
}
