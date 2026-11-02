import React, { useState } from 'react'
import { Video, ExternalLink, Trash2, Calendar, Check, X } from 'lucide-react'
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
        <span className="section-title">Videos con notas ({videos.length})</span>
      </div>

      <div className="videos-grid">
        {videos.map((vid) => {
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
                  title="Abrir en YouTube"
                >
                  <ExternalLink size={13} />
                </a>

                {deletingId === vid.videoId ? (
                  <div className="confirm-delete-box">
                    <button
                      className="action-icon-btn delete-confirm"
                      onClick={() => onDeleteVideo(vid.videoId)}
                      title="Eliminar historial de este video"
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
                    onClick={() => setDeletingId(vid.videoId)}
                    title="Eliminar video y sus notas"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
