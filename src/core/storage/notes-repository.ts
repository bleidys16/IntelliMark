import { Note, VideoMetadata, NoteDraft, NoteCategory } from '../../shared/types'
import { formatTimestamp } from '../../shared/time'

const VIDEOS_INDEX_KEY = 'videos:index'
const getNotesKey = (videoId: string) => `notes:${videoId}`
const getDraftKey = (videoId: string) => `draft:${videoId}`

/**
 * Obtiene todas las notas asociadas a un video específico, ordenadas cronológicamente por timestamp.
 */
export async function getNotesForVideo(videoId: string): Promise<Note[]> {
  if (!videoId || !chrome.storage?.local) return []

  const key = getNotesKey(videoId)
  const result = await chrome.storage.local.get([key])
  const notes: Note[] = result[key] || []

  // Ordenar cronológicamente por segundo del video
  return notes.sort((a, b) => a.timestampSec - b.timestampSec)
}

/**
 * Guarda una nueva nota asociada a un video.
 */
export async function saveNote(params: {
  videoId: string
  timestampSec: number
  text: string
  videoTitle?: string
  category?: NoteCategory
}): Promise<Note> {
  const { videoId, timestampSec, text, videoTitle, category } = params
  const now = Date.now()
  const key = getNotesKey(videoId)

  const newNote: Note = {
    id: `note_${now}_${Math.random().toString(36).substring(2, 7)}`,
    videoId,
    timestampSec: Math.max(0, Math.floor(timestampSec)),
    formattedTime: formatTimestamp(timestampSec),
    text: text.trim(),
    category,
    createdAt: now,
    updatedAt: now,
  }

  // 1. Obtener notas actuales y añadir la nueva
  const currentNotes = await getNotesForVideo(videoId)
  const updatedNotes = [...currentNotes, newNote].sort((a, b) => a.timestampSec - b.timestampSec)

  await chrome.storage.local.set({ [key]: updatedNotes })

  // 2. Actualizar el índice de videos
  await updateVideoIndex({
    videoId,
    title: videoTitle || 'Video de YouTube',
    lastAccessedAt: now,
  })

  return newNote
}

/**
 * Actualiza el texto o timestamp de una nota existente.
 */
export async function updateNote(
  videoId: string,
  noteId: string,
  updates: { text?: string; timestampSec?: number; category?: NoteCategory }
): Promise<Note | null> {
  const currentNotes = await getNotesForVideo(videoId)
  const index = currentNotes.findIndex((n) => n.id === noteId)
  if (index === -1) return null

  const existing = currentNotes[index]
  const updatedTimestamp = updates.timestampSec !== undefined ? Math.max(0, Math.floor(updates.timestampSec)) : existing.timestampSec

  const updatedNote: Note = {
    ...existing,
    text: updates.text !== undefined ? updates.text.trim() : existing.text,
    timestampSec: updatedTimestamp,
    formattedTime: formatTimestamp(updatedTimestamp),
    category: updates.category !== undefined ? updates.category : existing.category,
    updatedAt: Date.now(),
  }

  currentNotes[index] = updatedNote
  currentNotes.sort((a, b) => a.timestampSec - b.timestampSec)

  await chrome.storage.local.set({ [getNotesKey(videoId)]: currentNotes })
  return updatedNote
}

/**
 * Elimina una nota específica de un video.
 */
export async function deleteNote(videoId: string, noteId: string): Promise<boolean> {
  const currentNotes = await getNotesForVideo(videoId)
  const filtered = currentNotes.filter((n) => n.id !== noteId)

  await chrome.storage.local.set({ [getNotesKey(videoId)]: filtered })

  // Si ya no quedan notas en este video, actualizamos el índice
  if (filtered.length === 0) {
    const allVideos = await getAllVideos()
    const updatedVideos = allVideos.filter((v) => v.videoId !== videoId)
    await chrome.storage.local.set({ [VIDEOS_INDEX_KEY]: updatedVideos })
  }

  return true
}

/**
 * Obtiene el índice de todos los videos registrados en IntelliMark.
 */
export async function getAllVideos(): Promise<VideoMetadata[]> {
  if (!chrome.storage?.local) return []

  const result = await chrome.storage.local.get([VIDEOS_INDEX_KEY])
  const list: VideoMetadata[] = result[VIDEOS_INDEX_KEY] || []

  // Ordenar por último acceso (más recientes primero)
  return list.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
}

/**
 * Elimina un video completo y todas sus notas asociadas.
 */
export async function deleteVideoAndNotes(videoId: string): Promise<boolean> {
  await chrome.storage.local.remove([getNotesKey(videoId)])
  const allVideos = await getAllVideos()
  const filtered = allVideos.filter((v) => v.videoId !== videoId)
  await chrome.storage.local.set({ [VIDEOS_INDEX_KEY]: filtered })
  return true
}

/**
 * Función interna para actualizar el índice de videos guardados.
 */
async function updateVideoIndex(meta: { videoId: string; title: string; lastAccessedAt: number }) {
  const currentVideos = await getAllVideos()
  const existingIndex = currentVideos.findIndex((v) => v.videoId === meta.videoId)

  if (existingIndex >= 0) {
    // Si ya existe, actualizamos su título y fecha de último acceso
    currentVideos[existingIndex] = {
      ...currentVideos[existingIndex],
      title: meta.title || currentVideos[existingIndex].title,
      lastAccessedAt: meta.lastAccessedAt,
    }
  } else {
    // Si es un video nuevo, lo agregamos al índice
    currentVideos.unshift({
      videoId: meta.videoId,
      title: meta.title,
      lastAccessedAt: meta.lastAccessedAt,
    })
  }

  await chrome.storage.local.set({ [VIDEOS_INDEX_KEY]: currentVideos })
}

/**
 * Guarda un borrador de nota para un video en caso de cambio de pestaña o cierre involuntario.
 */
export async function saveNoteDraft(videoId: string, draft: NoteDraft): Promise<void> {
  if (!videoId || !chrome.storage?.local) return
  await chrome.storage.local.set({ [getDraftKey(videoId)]: draft })
}

/**
 * Recupera el borrador de nota para un video, si existe.
 */
export async function getNoteDraft(videoId: string): Promise<NoteDraft | null> {
  if (!videoId || !chrome.storage?.local) return null
  const key = getDraftKey(videoId)
  const result = await chrome.storage.local.get([key])
  return (result[key] as NoteDraft) || null
}

/**
 * Elimina el borrador de nota para un video tras guardar o cancelar.
 */
export async function clearNoteDraft(videoId: string): Promise<void> {
  if (!videoId || !chrome.storage?.local) return
  await chrome.storage.local.remove([getDraftKey(videoId)])
}

