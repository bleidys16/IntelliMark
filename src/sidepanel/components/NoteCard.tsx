import React, { useState } from 'react'
import { Play, Edit2, Trash2, Check, X } from 'lucide-react'
import { Note } from '../../shared/types'

interface NoteCardProps {
  note: Note
  onSeek: (seconds: number) => void
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onSeek, onEdit, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false)

  return (
    <div className="note-card">
      <div className="note-card-header">
        <button
          className="note-timestamp-btn"
          onClick={() => onSeek(note.timestampSec)}
          title={`Saltar a ${note.formattedTime} en el video`}
        >
          <Play size={12} fill="currentColor" />
          <span>{note.formattedTime}</span>
        </button>

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
