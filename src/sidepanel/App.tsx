import { useEffect, useState, useMemo, useRef } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Clock,
  Plus,
  Search,
  FolderOpen,
  Film,
  AlertTriangle,
  RefreshCw,
  Download,
  Sun,
  Moon,
} from 'lucide-react'
import {
  fetchCurrentVideoState,
  seekPlayerTo,
  togglePlayerPlayPause,
  pausePlayerVideo,
  adjustPlayerTime,
} from '../core/youtube/player-client'
import {
  getNotesForVideo,
  saveNote,
  updateNote,
  deleteNote,
  getAllVideos,
  deleteVideoAndNotes,
  getNoteDraft,
  clearNoteDraft,
} from '../core/storage/notes-repository'
import { Note, VideoMetadata, VideoState } from '../shared/types'
import { formatTimestamp } from '../shared/time'
import { NoteEditor } from './components/NoteEditor'
import { NoteCard } from './components/NoteCard'
import { VideosList } from './components/VideosList'
import { ExportModal } from './components/ExportModal'

export default function App() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current')
  const [theme, setTheme] = useState<'light' | 'dark'>('light') // Fondo solicitado #FEF8F0 en modo claro
  const [videoState, setVideoState] = useState<VideoState | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [videos, setVideos] = useState<VideoMetadata[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Estados del editor
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false)
  const [capturedTime, setCapturedTime] = useState<number>(0)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const videoStateRef = useRef<VideoState | null>(null)

  useEffect(() => {
    videoStateRef.current = videoState
  }, [videoState])

  // Estados de modales
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  // Cargar tema guardado en storage
  useEffect(() => {
    if (chrome.storage?.local) {
      chrome.storage.local.get(['intellimark_theme'], (res) => {
        if (res.intellimark_theme) {
          setTheme(res.intellimark_theme)
        }
      })
    }
  }, [])

  // Aplicar clase del tema en el documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (chrome.storage?.local) {
      chrome.storage.local.set({ intellimark_theme: theme })
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // Cargar notas del video activo
  const loadNotes = async (videoId: string) => {
    const loaded = await getNotesForVideo(videoId)
    setNotes(loaded)
  }

  // Cargar lista de videos
  const loadVideos = async () => {
    const list = await getAllVideos()
    setVideos(list)
  }

  const updateState = async (forceReset = false) => {
    setIsRefreshing(true)
    const state = await fetchCurrentVideoState()

    if (state?.videoId) {
      setVideoState(state)
      await loadNotes(state.videoId)

      // Comprobar si existe un borrador pendiente para este video
      const draft = await getNoteDraft(state.videoId)
      if (draft && draft.text && draft.text.trim().length > 0) {
        if (draft.editingNoteId) {
          const currentNotes = await getNotesForVideo(state.videoId)
          const target = currentNotes.find((n) => n.id === draft.editingNoteId)
          if (target) {
            setEditingNote({ ...target, text: draft.text, timestampSec: draft.timestampSec })
            setIsCreatingNote(false)
          } else {
            setCapturedTime(draft.timestampSec)
            setIsCreatingNote(true)
            setEditingNote(null)
          }
        } else {
          setCapturedTime(draft.timestampSec)
          setIsCreatingNote(true)
          setEditingNote(null)
        }
      }
    } else {
      // Si la nueva pestaña activa no es YouTube pero ya teníamos un video cargado,
      // mantenemos el estado y el borrador en pantalla a menos que se fuerce el reseteo
      if (forceReset || !videoStateRef.current?.videoId) {
        setVideoState(null)
        setNotes([])
      }
    }

    await loadVideos()
    setLoading(false)
    setIsRefreshing(false)
  }

  // Iniciar creación de nueva nota: pausa el video y congela el timestamp actual
  const handleStartNewNote = async () => {
    const current = videoState ? videoState.currentTime : 0
    setCapturedTime(current)
    setEditingNote(null)
    setIsCreatingNote(true)

    // Pausar el video en YouTube automáticamente (el usuario puede despausarlo cuando quiera)
    await pausePlayerVideo()
    setVideoState((prev) => (prev ? { ...prev, isPaused: true } : prev))
  }

  useEffect(() => {
    updateState()

    // Sondeo de tiempo cada segundo
    const interval = setInterval(() => {
      fetchCurrentVideoState().then((state) => {
        if (state) {
          setVideoState((prev) => {
            if (prev?.videoId !== state.videoId && state.videoId) {
              loadNotes(state.videoId)
              loadVideos()
            }
            return state
          })
        }
      })
    }, 1000)

    // Escuchar atajo TRIGGER_QUICK_NOTE del service worker
    const handleRuntimeMessage = (message: { type: string }) => {
      if (message?.type === 'TRIGGER_QUICK_NOTE') {
        fetchCurrentVideoState().then((state) => {
          if (state?.videoId && !state.isAd) {
            setCapturedTime(state.currentTime)
            setEditingNote(null)
            setIsCreatingNote(true)
            setActiveTab('current')
            pausePlayerVideo()
            setVideoState((prev) => (prev ? { ...prev, isPaused: true } : prev))
          }
        })
      }
    }

    // Escuchar cambios de pestañas en Chrome
    const handleTabActivated = () => updateState(false)
    const handleTabUpdated = (_id: number, change: chrome.tabs.TabChangeInfo) => {
      if (change.status === 'complete' || change.url) {
        updateState(false)
      }
    }
    const handleTabRemoved = () => {
      if (chrome.tabs?.query) {
        chrome.tabs.query({ url: '*://*.youtube.com/watch*' }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            updateState(true)
          }
        })
      }
    }

    if (chrome.tabs) {
      chrome.tabs.onActivated.addListener(handleTabActivated)
      chrome.tabs.onUpdated.addListener(handleTabUpdated)
      chrome.tabs.onRemoved.addListener(handleTabRemoved)
    }

    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage)
    }

    return () => {
      clearInterval(interval)
      if (chrome.tabs) {
        chrome.tabs.onActivated.removeListener(handleTabActivated)
        chrome.tabs.onUpdated.removeListener(handleTabUpdated)
        chrome.tabs.onRemoved.removeListener(handleTabRemoved)
      }
      if (chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
      }
    }
  }, [])

  // Guardar nueva nota en chrome.storage.local
  const handleSaveNewNote = async (text: string, timestampSec: number) => {
    if (!videoState?.videoId) return

    await saveNote({
      videoId: videoState.videoId,
      timestampSec,
      text,
      videoTitle: videoState.title,
    })

    await clearNoteDraft(videoState.videoId)
    await loadNotes(videoState.videoId)
    await loadVideos()
    setIsCreatingNote(false)
  }

  // Actualizar una nota existente
  const handleUpdateNote = async (text: string, timestampSec: number) => {
    if (!videoState?.videoId || !editingNote) return

    await updateNote(videoState.videoId, editingNote.id, {
      text,
      timestampSec,
    })

    await clearNoteDraft(videoState.videoId)
    await loadNotes(videoState.videoId)
    setEditingNote(null)
  }

  // Eliminar una nota
  const handleDeleteNote = async (noteId: string) => {
    if (!videoState?.videoId) return

    await deleteNote(videoState.videoId, noteId)
    await loadNotes(videoState.videoId)
    await loadVideos()
  }

  // Eliminar un video del historial
  const handleDeleteVideo = async (videoId: string) => {
    await deleteVideoAndNotes(videoId)
    await loadVideos()
    if (videoState?.videoId === videoId) {
      setNotes([])
    }
  }

  // Saltar en el video de YouTube
  const handleSeek = async (seconds: number) => {
    await seekPlayerTo(seconds)
  }

  // Filtrar notas con el buscador
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes
    const q = searchQuery.toLowerCase()
    return notes.filter((n) => n.text.toLowerCase().includes(q) || n.formattedTime.includes(q))
  }, [notes, searchQuery])

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-container">
          <img
            src="/logo.png"
            alt="IntelliMark Logo"
            className="brand-logo-img"
          />
          <div>
            <h1 className="brand-title">IntelliMark</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {notes.length > 0 && activeTab === 'current' && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="btn btn-secondary header-action-btn"
              title="Exportar a Word o Markdown"
            >
              <Download size={13} color="var(--primary)" />
              <span className="hide-on-compact">Exportar</span>
            </button>
          )}

          {/* Botón de cambio de tema Claro / Oscuro */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary header-icon-btn"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro (#FEF8F0)'}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} color="#f59e0b" />}
          </button>

          {/* Botón de refrescar */}
          <button
            onClick={() => updateState()}
            className="btn btn-secondary header-icon-btn"
            title="Actualizar estado"
          >
            <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Navegación por pestañas */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          <Film size={14} /> Video actual
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FolderOpen size={14} /> Mis videos ({videos.length})
        </button>
      </div>

      {/* Pestaña: Mis videos */}
      {activeTab === 'history' && (
        <VideosList
          videos={videos}
          activeVideoId={videoState?.videoId || null}
          onSelectVideo={async (videoId) => {
            await loadNotes(videoId)
            setActiveTab('current')
          }}
          onDeleteVideo={handleDeleteVideo}
        />
      )}

      {/* Pestaña: Video actual */}
      {activeTab === 'current' && (
        <>
          {/* Si no estamos en YouTube */}
          {!loading && !videoState?.videoId && (
            <div className="empty-state">
              <Film className="empty-state-icon" />
              <h3>Abre un video de YouTube</h3>
              <p>Navega a un video en YouTube para empezar a capturar notas con timestamps automáticos.</p>
            </div>
          )}

          {/* Tarjeta de información del video activo */}
          {videoState?.videoId && (
            <>
              <div className="video-card">
                {videoState.isAd && (
                  <div className="video-header">
                    <span className="ad-badge">
                      <AlertTriangle size={12} /> Anuncio en reproducción
                    </span>
                  </div>
                )}

                <h2 className="video-title" title={videoState.title}>
                  {videoState.title}
                </h2>

                <div className="time-display-container">
                  <div className="time-badge">
                    <Clock size={16} />
                    <span className="time-current">{formatTimestamp(videoState.currentTime)}</span>
                    <span className="time-total">/ {formatTimestamp(videoState.duration)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => adjustPlayerTime(-5)}
                      className="chip-btn"
                      title="Retroceder 5 segundos"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      onClick={togglePlayerPlayPause}
                      className="chip-btn"
                      title={videoState.isPaused ? 'Reproducir' : 'Pausar'}
                    >
                      {videoState.isPaused ? <Play size={12} /> : <Pause size={12} />}
                    </button>
                    <button
                      onClick={() => adjustPlayerTime(5)}
                      className="chip-btn"
                      title="Adelantar 5 segundos"
                    >
                      <RotateCw size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón principal: Nueva Nota */}
              {!isCreatingNote && !editingNote && (
                <button
                  className="btn btn-primary new-note-btn"
                  onClick={handleStartNewNote}
                  disabled={videoState.isAd}
                  title={videoState.isAd ? 'Espera a que termine el anuncio' : 'Pausar video y crear nota (Alt+Shift+N)'}
                >
                  <Plus size={16} />
                  <span>Nueva nota en {formatTimestamp(videoState.currentTime)}</span>
                </button>
              )}

              {/* Formulario de creación de nota con IA */}
              {isCreatingNote && (
                <NoteEditor
                  initialTimestampSec={capturedTime}
                  videoId={videoState.videoId}
                  videoTitle={videoState.title}
                  onSave={handleSaveNewNote}
                  onCancel={async () => {
                    if (videoState?.videoId) {
                      await clearNoteDraft(videoState.videoId)
                    }
                    setIsCreatingNote(false)
                  }}
                />
              )}

              {/* Formulario de edición de nota existente con IA */}
              {editingNote && (
                <NoteEditor
                  initialTimestampSec={editingNote.timestampSec}
                  initialText={editingNote.text}
                  videoId={videoState.videoId}
                  draftNoteId={editingNote.id}
                  videoTitle={videoState.title}
                  isEditing={true}
                  onSave={handleUpdateNote}
                  onCancel={async () => {
                    if (videoState?.videoId) {
                      await clearNoteDraft(videoState.videoId)
                    }
                    setEditingNote(null)
                  }}
                />
              )}

              {/* Buscador de notas si hay más de 2 */}
              {notes.length > 2 && (
                <div className="search-bar">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar notas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              )}

              {/* Lista de notas */}
              <div className="notes-list-section">
                <div className="notes-section-header">
                  <span className="section-title">Notas de este video ({filteredNotes.length})</span>
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="empty-notes-hint">
                    {searchQuery ? (
                      <p>No hay notas que coincidan con la búsqueda.</p>
                    ) : (
                      <p>Aún no has tomado notas en este video. Pulsa "Nueva nota" o <code>Alt+Shift+N</code> para guardar tu primer apunte.</p>
                    )}
                  </div>
                ) : (
                  <div className="notes-stack">
                    {filteredNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onSeek={handleSeek}
                        onEdit={(n) => {
                          setIsCreatingNote(false)
                          setEditingNote(n)
                        }}
                        onDelete={handleDeleteNote}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal de Exportación (Word o Markdown) */}
      {isExportModalOpen && videoState?.videoId && (
        <ExportModal
          videoId={videoState.videoId}
          videoTitle={videoState.title}
          notes={notes}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  )
}
