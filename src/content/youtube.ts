import { ExtensionMessage, VideoStateResponse, ActionResponse } from '../shared/messages'
import { VideoState } from '../shared/types'
import { extractVideoId } from '../shared/youtube'

console.log('[IntelliMark] Content script cargado en YouTube.')

/**
 * Encuentra el elemento <video> principal del reproductor de YouTube.
 */
function getVideoElement(): HTMLVideoElement | null {
  return document.querySelector('video.html5-main-video') || document.querySelector('video')
}

/**
 * Detecta si actualmente se está reproduciendo un anuncio.
 * Durante los anuncios, video.currentTime pertenece al anuncio y no al video real.
 */
function isAdPlaying(): boolean {
  const moviePlayer = document.getElementById('movie_player')
  if (moviePlayer) {
    if (moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting')) {
      return true
    }
  }
  const adOverlay = document.querySelector('.ytp-ad-player-overlay, .ytp-ad-module')
  return !!adOverlay && adOverlay.children.length > 0
}

/**
 * Obtiene el título del video desde el DOM de YouTube con fallback a document.title.
 */
function getVideoTitle(): string {
  // Intentar selectores modernos de YouTube
  const titleEl = document.querySelector<HTMLElement>(
    'h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, ytd-watch-metadata #title'
  )
  if (titleEl && titleEl.textContent?.trim()) {
    return titleEl.textContent.trim()
  }

  // Fallback: Título de la pestaña limpiando " - YouTube"
  return document.title.replace(/ - YouTube$/, '').trim() || 'Video de YouTube'
}

/**
 * Construye el estado actual del video en este momento.
 */
function getCurrentVideoState(): VideoState {
  const videoId = extractVideoId(window.location.href)
  const video = getVideoElement()
  const isAd = isAdPlaying()

  return {
    videoId,
    title: getVideoTitle(),
    currentTime: video ? Math.floor(video.currentTime) : 0,
    duration: video && !isNaN(video.duration) ? Math.floor(video.duration) : 0,
    isPaused: video ? video.paused : true,
    isAd,
  }
}

/**
 * Escucha mensajes enviados desde el Side Panel o Service Worker.
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (res: VideoStateResponse | ActionResponse) => void) => {
    const video = getVideoElement()

    switch (message.type) {
      case 'GET_VIDEO_STATE': {
        const state = getCurrentVideoState()
        sendResponse({ success: true, data: state })
        break
      }

      case 'SEEK_TO': {
        if (!video) {
          sendResponse({ success: false, error: 'No se encontró el reproductor de video en la página.' })
          return
        }
        const target = Math.max(0, message.payload.seconds)
        video.currentTime = target
        sendResponse({ success: true })
        break
      }

      case 'PLAY_PAUSE': {
        if (!video) {
          sendResponse({ success: false, error: 'No se encontró el reproductor de video.' })
          return
        }
        if (video.paused) {
          video.play()
        } else {
          video.pause()
        }
        sendResponse({ success: true })
        break
      }

      case 'PAUSE_VIDEO': {
        if (!video) {
          sendResponse({ success: false, error: 'No se encontró el reproductor de video.' })
          return
        }
        if (!video.paused) {
          video.pause()
        }
        sendResponse({ success: true })
        break
      }

      case 'PLAY_VIDEO': {
        if (!video) {
          sendResponse({ success: false, error: 'No se encontró el reproductor de video.' })
          return
        }
        if (video.paused) {
          video.play()
        }
        sendResponse({ success: true })
        break
      }

      case 'ADJUST_TIME': {
        if (!video) {
          sendResponse({ success: false, error: 'No se encontró el reproductor de video.' })
          return
        }
        const newTime = Math.max(0, video.currentTime + message.payload.deltaSeconds)
        video.currentTime = newTime
        sendResponse({ success: true })
        break
      }

      default:
        sendResponse({ success: false, error: 'Mensaje no reconocido.' })
    }
  }
)

// Escuchar eventos de navegación interna de YouTube (SPA)
window.addEventListener('yt-navigate-finish', () => {
  console.log('[IntelliMark] Navegación SPA detectada en YouTube:', window.location.href)
})
