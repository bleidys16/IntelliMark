// Tipos de datos fundamentales de IntelliMark (Core)

export interface Note {
  id: string                    // Identificador único (UUID o timestamp)
  videoId: string               // ID del video de YouTube (ej. dQw4w9WgXcQ)
  timestampSec: number          // Segundo exacto del video (ej. 125 para 02:05)
  formattedTime: string         // Representación legible (ej. "02:05" o "1:02:05")
  text: string                  // Contenido de la nota escrita por el usuario
  createdAt: number             // Fecha de creación (milisegundos Unix)
  updatedAt: number             // Fecha de última modificación
}

export interface VideoMetadata {
  videoId: string               // ID de 11 caracteres de YouTube
  title: string                 // Título del video
  channelName?: string          // Nombre del canal (opcional)
  durationSec?: number          // Duración total en segundos
  lastAccessedAt: number        // Última vez que se vio en IntelliMark
}

export interface VideoState {
  videoId: string | null        // ID actual o null si no estamos en /watch?v=
  title: string                 // Título del video actual
  currentTime: number           // Segundo actual de reproducción
  duration: number              // Duración total del video
  isPaused: boolean             // ¿Está pausado?
  isAd: boolean                 // ¿Se está reproduciendo un anuncio?
}

export interface NoteDraft {
  text: string                  // Contenido del borrador
  timestampSec: number          // Segundo capturado del video
  editingNoteId?: string | null // ID si se estaba editando una nota existente
  updatedAt: number             // Timestamp de última escritura
}

