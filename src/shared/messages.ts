import { VideoState } from './types'

// Mensajes que el Side Panel envía al Content Script en la pestaña de YouTube
export type ExtensionMessage =
  | { type: 'GET_VIDEO_STATE' }
  | { type: 'SEEK_TO'; payload: { seconds: number; autoPlay?: boolean } }
  | { type: 'PLAY_PAUSE' }
  | { type: 'PAUSE_VIDEO' }
  | { type: 'PLAY_VIDEO' }
  | { type: 'ADJUST_TIME'; payload: { deltaSeconds: number } }

// Respuestas esperadas para cada mensaje
export type VideoStateResponse = {
  success: boolean
  data?: VideoState
  error?: string
}

export type ActionResponse = {
  success: boolean
  error?: string
}
