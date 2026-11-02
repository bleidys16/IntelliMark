import { Note } from '../../shared/types'

export const INTELLIXY_BASE_URL = 'https://intellixy-web.vercel.app'

const STORAGE_KEY_TOKEN = 'intellimark_intellixy_token'
const STORAGE_KEY_USER = 'intellimark_intellixy_user'

export interface IntellixyUser {
  id?: string
  email: string
  name?: string
}

export interface IntellixySubject {
  id: string
  name: string
  description?: string
  createdAt?: string
}

export interface IntellixySession {
  connected: boolean
  token?: string
  user?: IntellixyUser | null
}

/**
 * Convierte de manera segura cualquier error devuelto por la API (incluidos objetos de Zod o Next.js)
 * en una cadena legible de texto plano, evitando que React intente renderizar objetos en el DOM.
 */
export function formatApiError(data: unknown, fallback: string): string {
  if (!data) return fallback
  if (typeof data === 'string') return data

  const obj = (typeof data === 'object' && data !== null && 'error' in data)
    ? (data as { error: unknown }).error
    : data

  if (typeof obj === 'string') return obj

  if (obj && typeof obj === 'object') {
    const errorRecord = obj as Record<string, unknown>

    // 1. Manejar formato de Zod flatten(): { formErrors: [...], fieldErrors: { field: [...] } }
    const fieldErrors = errorRecord.fieldErrors || errorRecord.errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      const messages: string[] = []
      for (const [field, msgs] of Object.entries(fieldErrors as Record<string, unknown>)) {
        if (Array.isArray(msgs) && msgs.length > 0) {
          messages.push(`${field}: ${msgs.join(', ')}`)
        } else if (typeof msgs === 'string') {
          messages.push(`${field}: ${msgs}`)
        }
      }
      if (messages.length > 0) return messages.join(' | ')
    }

    if (Array.isArray(errorRecord.formErrors) && errorRecord.formErrors.length > 0) {
      return (errorRecord.formErrors as string[]).join(', ')
    }

    // 2. Error estándar { message: '...' }
    if (typeof errorRecord.message === 'string' && errorRecord.message.trim().length > 0) {
      return errorRecord.message
    }

    // 3. Serializar como JSON si no es vacío
    try {
      const str = JSON.stringify(obj)
      if (str !== '{}') return str
    } catch {
      // Ignorar fallo de stringify
    }
  }

  return fallback
}

/**
 * Obtiene la sesión guardada de Intellixy en chrome.storage.local
 */
export async function getIntellixySession(): Promise<IntellixySession> {
  if (!chrome.storage?.local) {
    return { connected: false }
  }

  const result = await chrome.storage.local.get([STORAGE_KEY_TOKEN, STORAGE_KEY_USER])
  const token = result[STORAGE_KEY_TOKEN]
  const user = result[STORAGE_KEY_USER]

  if (token) {
    return {
      connected: true,
      token,
      user: user || null,
    }
  }

  return { connected: false }
}

/**
 * Inicia sesión directamente en la API de Intellixy
 */
export async function loginToIntellixy(
  email: string,
  password: string
): Promise<{ success: boolean; user?: IntellixyUser; error?: string }> {
  try {
    const response = await fetch(`${INTELLIXY_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    })

    const raw = await response.text().catch(() => '')
    let data: any = {}
    try {
      data = JSON.parse(raw)
    } catch {
      data = { rawText: raw }
    }

    if (!response.ok) {
      return {
        success: false,
        error: formatApiError(data, `Error de inicio de sesión (${response.status})`),
      }
    }

    // El token puede venir en data.token o data.accessToken o data.sessionToken
    const token = data.token || data.accessToken || data.jwt || data.session?.token
    const user: IntellixyUser = data.user || {
      id: data.userId || data.id,
      email: email.trim(),
      name: data.name || email.trim().split('@')[0],
    }

    if (chrome.storage?.local) {
      await chrome.storage.local.set({
        [STORAGE_KEY_TOKEN]: token || 'session_active',
        [STORAGE_KEY_USER]: user,
      })
    }

    return {
      success: true,
      user,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al conectar con Intellixy.'
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * Cierra la sesión de Intellixy en la extensión
 */
export async function logoutIntellixy(): Promise<void> {
  if (chrome.storage?.local) {
    await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER])
  }
}

/**
 * Obtiene la lista de materias (subjects) del usuario desde Intellixy
 */
export async function getIntellixySubjects(): Promise<{
  success: boolean
  subjects?: IntellixySubject[]
  error?: string
}> {
  const session = await getIntellixySession()
  if (!session.connected || !session.token) {
    return { success: false, error: 'No has iniciado sesión en Intellixy.' }
  }

  try {
    const response = await fetch(`${INTELLIXY_BASE_URL}/api/subjects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
    })

    if (response.status === 401) {
      await logoutIntellixy()
      return { success: false, error: 'Tu sesión en Intellixy ha expirado. Por favor inicia sesión nuevamente.' }
    }

    const raw = await response.text().catch(() => '')
    let data: any = null
    try {
      data = JSON.parse(raw)
    } catch {
      data = null
    }

    if (!response.ok) {
      return {
        success: false,
        error: formatApiError(data, `Error al obtener materias (${response.status})`),
      }
    }

    // data puede ser un array directo o un objeto { subjects: [...] } o { data: [...] }
    const list: IntellixySubject[] = Array.isArray(data)
      ? data
      : data?.subjects || data?.data || []

    return {
      success: true,
      subjects: list,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al conectar con la API de materias.'
    return { success: false, error: msg }
  }
}

/**
 * Sube las notas capturadas como material de texto a una materia de Intellixy.
 * Compatible con el esquema pasteTextSchema del backend de Intellixy:
 * - name: string (mínimo 1 carácter)
 * - text: string (mínimo 50 caracteres)
 */
export async function uploadNotesToIntellixy(params: {
  subjectId: string
  videoTitle: string
  videoId: string
  notes: Note[]
}): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const { subjectId, videoTitle, videoId, notes = [] } = params
    const session = await getIntellixySession()

    if (!session.connected || !session.token) {
      return { success: false, error: 'Inicia sesión en Intellixy para enviar tus notas.' }
    }

    const cleanTitle = (videoTitle?.trim() || 'Apuntes de YouTube').substring(0, 100)

    // Estructurar el texto en Markdown con metadatos del video y timestamps
    const lines: string[] = []
    lines.push(`# ${cleanTitle}`)
    if (videoId) {
      lines.push(`- **Video:** https://www.youtube.com/watch?v=${videoId}`)
    }
    lines.push(`- **Fecha:** ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}`)
    lines.push(`- **Total de apuntes:** ${notes.length}\n`)
    lines.push(`---\n`)
    lines.push(`## Apuntes con Timestamps:\n`)

    for (const n of notes) {
      const time = n.formattedTime || '00:00'
      const catLabel = n.category ? ` [${n.category.toUpperCase()}]` : ''
      lines.push(`- **${time}**${catLabel}: ${n.text}`)
    }

    let payloadText = lines.join('\n')

    // El backend de Intellixy exige al menos 50 caracteres (z.string().min(50))
    if (payloadText.length < 50) {
      payloadText += '\n\n*Apuntes sincronizados desde la extensión IntelliMark para YouTube.*'
    }

    const response = await fetch(`${INTELLIXY_BASE_URL}/api/subjects/${subjectId}/materials/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      // Se envían tanto 'name' (esperado por el backend de Intellixy) como 'title' para máxima compatibilidad
      body: JSON.stringify({
        name: cleanTitle,
        title: cleanTitle,
        text: payloadText,
      }),
    })

    const raw = await response.text().catch(() => '')
    let data: any = {}
    try {
      data = JSON.parse(raw)
    } catch {
      data = { rawText: raw }
    }

    if (!response.ok) {
      return {
        success: false,
        error: formatApiError(data, `Error al guardar material en Intellixy (${response.status})`),
      }
    }

    return {
      success: true,
      data,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al enviar material a Intellixy.'
    return {
      success: false,
      error: msg,
    }
  }
}
