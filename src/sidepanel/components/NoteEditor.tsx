import React, { useState, useEffect, useRef } from 'react'
import { Clock, Check, X, RotateCcw, RotateCw, Sparkles, List, FileCheck, Loader2 } from 'lucide-react'
import { formatTimestamp } from '../../shared/time'
import { enhanceNoteWithGroq, AIAssistAction } from '../../core/ai/groq-client'
import { saveNoteDraft, clearNoteDraft, getNoteDraft } from '../../core/storage/notes-repository'
import { NoteCategory } from '../../shared/types'

interface NoteEditorProps {
  initialTimestampSec: number
  initialText?: string
  initialCategory?: NoteCategory
  videoTitle?: string
  videoId?: string
  draftNoteId?: string
  isEditing?: boolean
  onSave: (text: string, timestampSec: number, category?: NoteCategory) => Promise<void>
  onCancel: () => void
}

const CATEGORY_OPTIONS: { id: NoteCategory; label: string }[] = [
  { id: 'idea', label: '💡 Idea' },
  { id: 'key', label: '📌 Clave' },
  { id: 'question', label: '❓ Duda' },
  { id: 'exam', label: '⚠️ Examen' },
]

export const NoteEditor: React.FC<NoteEditorProps> = ({
  initialTimestampSec,
  initialText = '',
  initialCategory,
  videoTitle = '',
  videoId = '',
  draftNoteId,
  isEditing = false,
  onSave,
  onCancel,
}) => {
  const [timestamp, setTimestamp] = useState<number>(initialTimestampSec)
  const [text, setText] = useState<string>(initialText)
  const [category, setCategory] = useState<NoteCategory | undefined>(initialCategory)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isAILoading, setIsAILoading] = useState<boolean>(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Sincronizar si cambian los valores iniciales
  useEffect(() => {
    setTimestamp(initialTimestampSec)
  }, [initialTimestampSec])

  useEffect(() => {
    if (initialText) {
      setText(initialText)
    }
  }, [initialText])

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory)
    }
  }, [initialCategory])

  // Recuperar borrador si el componente se monta sin initialText
  useEffect(() => {
    if (videoId && !initialText) {
      getNoteDraft(videoId).then((draft) => {
        if (draft && draft.text) {
          setText(draft.text)
          if (draft.timestampSec !== undefined) {
            setTimestamp(draft.timestampSec)
          }
          if (draft.category) {
            setCategory(draft.category)
          }
        }
      })
    }
  }, [videoId, initialText])

  const persistDraft = (newText: string, newTime: number, newCategory?: NoteCategory) => {
    if (!videoId) return
    if (newText.trim().length > 0) {
      saveNoteDraft(videoId, {
        text: newText,
        timestampSec: newTime,
        category: newCategory,
        editingNoteId: isEditing ? (draftNoteId || null) : null,
        updatedAt: Date.now(),
      })
    } else {
      clearNoteDraft(videoId)
    }
  }

  const handleTextChange = (newText: string) => {
    setText(newText)
    if (aiError) setAiError(null)
    persistDraft(newText, timestamp, category)
  }

  const handleAdjustTime = (delta: number) => {
    const nextTime = Math.max(0, timestamp + delta)
    setTimestamp(nextTime)
    persistDraft(text, nextTime, category)
  }

  const handleToggleCategory = (catId: NoteCategory) => {
    const nextCat = category === catId ? undefined : catId
    setCategory(nextCat)
    persistDraft(text, timestamp, nextCat)
  }

  const handleAIEnhance = async (action: AIAssistAction) => {
    if (!text.trim() || isAILoading) return
    setIsAILoading(true)
    setAiError(null)

    const result = await enhanceNoteWithGroq(text, action, videoTitle)
    setIsAILoading(false)

    if (result.success && result.enhancedText) {
      setText(result.enhancedText)
      persistDraft(result.enhancedText, timestamp, category)
    } else if (result.error) {
      setAiError(result.error)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!text.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (videoId) {
        await clearNoteDraft(videoId)
      }
      await onSave(text.trim(), timestamp, category)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (videoId) {
      await clearNoteDraft(videoId)
    }
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className={`note-editor-card ${isAILoading ? 'ai-loading-active' : ''}`}>
      <div className="note-editor-header">
        <div className="note-editor-time">
          <Clock size={15} color="var(--accent)" />
          <span className="timestamp-badge">{formatTimestamp(timestamp)}</span>
          <div className="time-tweak-buttons">
            <button
              type="button"
              className="chip-btn"
              onClick={() => handleAdjustTime(-5)}
              title="Atrasar 5 segundos"
            >
              <RotateCcw size={11} /> -5s
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => handleAdjustTime(5)}
              title="Adelantar 5 segundos"
            >
              <RotateCw size={11} /> +5s
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {text.trim().length > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Auto-guardado
            </span>
          )}
          <span className="editor-mode-label">{isEditing ? 'Editando nota' : 'Nueva nota'}</span>
        </div>
      </div>

      {/* Selector de Chips de Clasificación Rápida */}
      <div className="category-selector">
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = category === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-chip ${isSelected ? `selected-${cat.id}` : ''}`}
              onClick={() => handleToggleCategory(cat.id)}
              title={`Marcar apunte como ${cat.label}`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      <textarea
        ref={textareaRef}
        className={`note-textarea ${isAILoading ? 'ai-loading-active' : ''}`}
        placeholder="Escribe tu apunte aquí... (Enter para guardar, Shift+Enter para nueva línea)"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />

      {/* Barra de Asistencia con IA (Groq) */}
      <div className="ai-assistant-bar">
        <span className="ai-label">
          <Sparkles size={12} color="var(--primary)" /> IA:
        </span>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => handleAIEnhance('clarify')}
          disabled={!text.trim() || isAILoading}
          title="Clarificar y redactar apunte con IA"
        >
          {isAILoading ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}
          Mejorar
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => handleAIEnhance('bullets')}
          disabled={!text.trim() || isAILoading}
          title="Convertir a viñetas estructuradas"
        >
          <List size={11} /> Viñetas
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => handleAIEnhance('grammar')}
          disabled={!text.trim() || isAILoading}
          title="Corregir ortografía automáticamente"
        >
          <FileCheck size={11} /> Ortografía
        </button>
      </div>

      {/* Alerta de error de IA */}
      {aiError && (
        <div className="ai-error-banner">
          <span>{aiError}</span>
        </div>
      )}

      <div className="note-editor-actions">
        <span className="shortcut-hint">
          <code>Enter</code> guardar • <code>Esc</code> cancelar
        </span>
        <div className="editor-buttons-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting || isAILoading}
          >
            <X size={14} /> Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSubmit()}
            disabled={!text.trim() || isSubmitting || isAILoading}
          >
            <Check size={14} /> {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
