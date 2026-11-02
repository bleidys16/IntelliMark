import React, { useState } from 'react'
import { Play, Edit2, Trash2, Check, X, Copy } from 'lucide-react'
import { Note, NoteCategory } from '../../shared/types'

interface NoteCardProps {
  note: Note
  onSeek: (seconds: number) => void
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
}

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  idea: '💡 Idea',
  key: '📌 Clave',
  question: '❓ Duda',
  exam: '⚠️ Examen',
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onSeek, onEdit, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.warn('Error al copiar texto:', err)
    }
  }

  const categoryClass = note.category ? `category-${note.category}` : ''

  return (
    <div className={`note-card ${categoryClass}`}>
      <div className="note-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="note-timestamp-btn"
            onClick={() => onSeek(note.timestampSec)}
            title={`Saltar a ${note.formattedTime} y reproducir automáticamente`}
          >
            <Play size={12} fill="currentColor" />
            <span>{note.formattedTime}</span>
          </button>

          {note.category && (
            <span className={`category-tag-badge badge-${note.category}`}>
              {CATEGORY_LABELS[note.category]}
            </span>
          )}
        </div>

        <div className="note-card-actions">
          {confirmDelete ? (
            <div className="confirm-delete-box">
              <span className="confirm-text">¿Borrar?</span>
              <button
                className="action-icon-btn delete-confirm"
                onClick={() => onDelete(note.id)}
                title="Confirmar eliminación"
              >
                <Check size={13} />
              </button>
              <button
                className="action-icon-btn"
                onClick={() => setConfirmDelete(false)}
                title="Cancelar"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <button
                className="action-icon-btn"
                onClick={handleCopy}
                title={copied ? '¡Copiado al portapapeles!' : 'Copiar nota al portapapeles'}
              >
                {copied ? <Check size={13} color="var(--primary)" /> : <Copy size={13} />}
              </button>
              <button
                className="action-icon-btn"
                onClick={() => onEdit(note)}
                title="Editar nota"
              >
                <Edit2 size={13} />
              </button>
              <button
                className="action-icon-btn delete-trigger"
                onClick={() => setConfirmDelete(true)}
                title="Eliminar nota"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="note-card-body">
        <p className="note-text">{note.text}</p>
      </div>
    </div>
  )
}
