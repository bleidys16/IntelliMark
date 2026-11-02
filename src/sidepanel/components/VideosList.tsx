import React, { useState, useMemo } from 'react'
import { Video, ExternalLink, Trash2, Calendar, Check, X, Search } from 'lucide-react'
import { VideoMetadata } from '../../shared/types'

interface VideosListProps {
  videos: VideoMetadata[]
  activeVideoId: string | null
  onSelectVideo: (videoId: string) => void
  onDeleteVideo: (videoId: string) => void
}

export const VideosList: React.FC<VideosListProps> = ({
  videos,
  activeVideoId,
  onSelectVideo,
  onDeleteVideo,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos
    const q = searchQuery.toLowerCase().trim()
    return videos.filter((v) => v.title.toLowerCase().includes(q))
  }, [videos, searchQuery])

  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <Video className="empty-state-icon" />
        <h3>Sin historial de videos</h3>
        <p>Los videos donde tomes notas aparecerán aquí organizados automáticamente.</p>
      </div>
    )
  }

  return (
    <div className="videos-list-container">
      <div className="videos-list-header">
        <span className="section-title">Videos guardados ({videos.length})</span>
      </div>

      {/* Buscador de videos guardados */}
      {videos.length > 2 && (
        <div className="search-bar" style={{ marginBottom: '10px' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar videos en el historial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {filteredVideos.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 12px' }}>
          <Search className="empty-state-icon" style={{ width: '28px', height: '28px' }} />
          <p style={{ margin: 0 }}>No se encontraron videos con ese título.</p>
        </div>
      ) : (
        <div className="videos-grid">
          {filteredVideos.map((vid) => {
            const isActive = vid.videoId === activeVideoId
            const formattedDate = new Date(vid.lastAccessedAt).toLocaleDateString()

            return (
              <div
                key={vid.videoId}
                className={`video-item-card ${isActive ? 'active-video' : ''}`}
              >
                <div
                  className="video-item-main"
                  onClick={() => onSelectVideo(vid.videoId)}
                >
                  <div className="video-item-top">
                    {isActive && <span className="current-badge">Viendo ahora</span>}
                  </div>
                  <h4 className="video-item-title" title={vid.title}>
                    {vid.title}
                  </h4>
                  <div className="video-item-meta">
                    <span className="date-meta">
                      <Calendar size={12} /> {formattedDate}
                    </span>
                  </div>
                </div>

                <div className="video-item-actions">
                  <a
                    href={`https://www.youtube.com/watch?v=${vid.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="action-icon-btn"
                    title="Abrir video en YouTube"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>

                  {deletingId === vid.videoId ? (
                    <div className="confirm-delete-box" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="action-icon-btn delete-confirm"
                        onClick={() => {
                          onDeleteVideo(vid.videoId)
                          setDeletingId(null)
                        }}
                        title="Confirmar eliminación"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        className="action-icon-btn"
                        onClick={() => setDeletingId(null)}
                        title="Cancelar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="action-icon-btn delete-trigger"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingId(vid.videoId)
                      }}
                      title="Eliminar del historial"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
