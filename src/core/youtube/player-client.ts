import { ExtensionMessage, VideoStateResponse, ActionResponse } from '../../shared/messages'
import { VideoState } from '../../shared/types'

/**
 * Obtiene la pestaña de YouTube actualmente activa y enfocada en la ventana actual.
 */
export async function getActiveYouTubeTab(): Promise<chrome.tabs.Tab | null> {
  if (!chrome.tabs) return null

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const activeTab = tabs[0]

  if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
    return activeTab
  }

  return null
}

/**
 * Envía un mensaje tipado a una pestaña específica y retorna su respuesta.
 */
async function sendMessageToTab<T>(tabId: number, message: ExtensionMessage): Promise<T | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message)
    return response as T
  } catch (err) {
    console.warn('[IntelliMark] No se pudo comunicar con el Content Script:', err)
    return null
  }
}

/**
 * Solicita el estado actual del video en la pestaña activa.
 */
export async function fetchCurrentVideoState(): Promise<VideoState | null> {
  const tab = await getActiveYouTubeTab()
  if (!tab?.id) return null

  const res = await sendMessageToTab<VideoStateResponse>(tab.id, { type: 'GET_VIDEO_STATE' })
  if (res?.success && res.data) {
    return res.data
  }
  return null
}

/**
 * Mueve el reproductor de YouTube al segundo indicado.
 */
export async function seekPlayerTo(seconds: number, autoPlay: boolean = true): Promise<boolean> {
  const tab = await getActiveYouTubeTab()
  if (!tab?.id) return false

  const res = await sendMessageToTab<ActionResponse>(tab.id, {
    type: 'SEEK_TO',
    payload: { seconds, autoPlay },
  })
  return !!res?.success
}

/**
 * Alterna entre reproducción y pausa en el video.
 */
export async function togglePlayerPlayPause(): Promise<boolean> {
  const tab = await getActiveYouTubeTab()
  if (!tab?.id) return false

  const res = await sendMessageToTab<ActionResponse>(tab.id, { type: 'PLAY_PAUSE' })
  return !!res?.success
}

/**
 * Pausa explícitamente el reproductor de YouTube.
 */
export async function pausePlayerVideo(): Promise<boolean> {
  const tab = await getActiveYouTubeTab()
  if (!tab?.id) return false

  const res = await sendMessageToTab<ActionResponse>(tab.id, { type: 'PAUSE_VIDEO' })
  return !!res?.success
}

/**
 * Reanuda explícitamente el reproductor de YouTube.
 */
export async function playPlayerVideo(): Promise<boolean> {
  const tab = await getActiveYouTubeTab()
  if (!tab?.id) return false

  const res = await sendMessageToTab<ActionResponse>(tab.id, { type: 'PLAY_VIDEO' })
  return !!res?.success
}

/**
 * Ajusta el tiempo del video hacia adelante o atrás (ej: +5s o -5s).
 */
export async function adjustPlayerTime(deltaSeconds: number): Promise<boolean> {
  const tab = await getActiveYouTubeTab()
  if (!tab?.id) return false

  const res = await sendMessageToTab<ActionResponse>(tab.id, {
    type: 'ADJUST_TIME',
    payload: { deltaSeconds },
  })
  return !!res?.success
}
