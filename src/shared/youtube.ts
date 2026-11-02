/**
 * Extrae el ID de 11 caracteres de un video de YouTube desde diversas variantes de URL.
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)

    // Formato estándar: youtube.com/watch?v=XXXXXXXXXXX
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        const v = parsed.searchParams.get('v')
        if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) {
          return v
        }
      }
      // Formato embed o shorts: youtube.com/embed/XXXXXXXXXXX o youtube.com/shorts/XXXXXXXXXXX
      const pathSegments = parsed.pathname.split('/').filter(Boolean)
      if (pathSegments[0] === 'embed' || pathSegments[0] === 'shorts') {
        const id = pathSegments[1]
        if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
          return id
        }
      }
    }

    // Formato acortado: youtu.be/XXXXXXXXXXX
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '')
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
        return id
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Genera la URL canónica de YouTube con el parámetro de tiempo &t=XXs
 */
export function buildTimestampUrl(videoId: string, seconds: number): string {
  const cleanSec = Math.max(0, Math.floor(seconds))
  return `https://www.youtube.com/watch?v=${videoId}&t=${cleanSec}s`
}
