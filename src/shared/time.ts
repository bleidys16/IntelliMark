/**
 * Convierte una cantidad de segundos a formato legible MM:SS o HH:MM:SS.
 * Ejemplos:
 *   75    -> "01:15"
 *   3675  -> "1:01:15"
 */
export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00'

  const totalSec = Math.floor(seconds)
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const paddedMins = mins.toString().padStart(2, '0')
  const paddedSecs = secs.toString().padStart(2, '0')

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`
  }

  return `${paddedMins}:${paddedSecs}`
}

/**
 * Convierte un texto de tiempo en formato "MM:SS" o "HH:MM:SS" a segundos numéricos.
 * Ejemplos:
 *   "01:15"   -> 75
 *   "1:01:15" -> 3675
 */
export function parseTimestamp(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.trim().split(':').map(Number)
  if (parts.some(isNaN)) return 0

  if (parts.length === 3) {
    const [hrs, mins, secs] = parts
    return hrs * 3600 + mins * 60 + secs
  }

  if (parts.length === 2) {
    const [mins, secs] = parts
    return mins * 60 + secs
  }

  if (parts.length === 1) {
    return parts[0]
  }

  return 0
}
