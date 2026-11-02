import React, { useState, useEffect, useRef } from 'react'
import { Clock, Check, X, RotateCcw, RotateCw, Sparkles, List, FileCheck, Loader2 } from 'lucide-react'
import { formatTimestamp } from '../../shared/time'
import { enhanceNoteWithGroq, AIAssistAction } from '../../core/ai/groq-client'

interface NoteEditorProps {
  initialTimestampSec: number
  initialText?: string
  videoTitle?: string
  isEditing?: boolean
  onSave: (text: string, timestampSec: number) => Promise<void>
  onCancel: () => void
  onOpenSettings?: () => void
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  initialTimestampSec,
  initialText = '',
  videoTitle = '',
  isEditing = false,
  onSave,
  onCancel,
  onOpenSettings,
}) => {
  const [timestamp, setTimestamp] = useState<number>(initialTimestampSec)
  const [text, setText] = useState<string>(initialText)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isAILoading, setIsAILoading] = useState<boolean>(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleAdjustTime = (delta: number) => {
    setTimestamp((prev) => Math.max(0, prev + delta))
  }

  const handleAIEnhance = async (action: AIAssistAction) => {
    if (!text.trim() || isAILoading) return
    setIsAILoading(true)
    setAiError(null)

    const result = await enhanceNoteWithGroq(text, action, videoTitle)
    setIsAILoading(false)

    if (result.success && result.enhancedText) {
      setText(result.enhancedText)
    } else if (result.error) {
      setAiError(result.error)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!text.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSave(text.trim(), timestamp)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="note-editor-card">
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
        <span className="editor-mode-label">{isEditing ? 'Editando nota' : 'Nueva nota'}</span>
      </div>

      <textarea
        ref={textareaRef}
        className="note-textarea"
        placeholder="Escribe tu apunte aquí... (Enter para guardar, Shift+Enter para nueva línea)"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (aiError) setAiError(null)
        }}
        onKeyDown={handleKeyDown}
        rows={3}
      />

      {/* Barra de Asistencia con IA (Groq) */}
      <div className="ai-assistant-bar">
        <span className="ai-label">
          <Sparkles size={12} color="var(--primary)" /> IA Groq:
        </span>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => handleAIEnhance('clarify')}
          disabled={!text.trim() || isAILoading}
          title="Clarificar y resumir nota con IA"
        >
          {isAILoading ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}
          Mejorar
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => handleAIEnhance('bullets')}
          disabled={!text.trim() || isAILoading}
          title="Convertir a viñetas"
        >
          <List size={11} /> Viñetas
        </button>
        <button
          type="button"
          className="ai-chip-btn"
          onClick={() => handleAIEnhance('grammar')}
          disabled={!text.trim() || isAILoading}
          title="Corregir ortografía"
        >
          <FileCheck size={11} /> Ortografía
        </button>
      </div>

      {/* Alerta de error de IA con enlace a configuración si falta la Key */}
      {aiError && (
        <div className="ai-error-banner">
          <span>{aiError}</span>
          {onOpenSettings && (
            <button
              type="button"
              className="chip-btn"
              style={{ fontSize: '10px', padding: '2px 6px' }}
              onClick={onOpenSettings}
            >
              Ajustes
            </button>
          )}
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
            onClick={onCancel}
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
