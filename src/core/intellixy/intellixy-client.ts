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

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Error de inicio de sesión (${response.status})`,
      }
    }

    // El token puede venir en data.token o data.accessToken o data.sessionToken
    const token = data.token || data.accessToken || data.jwt || data.session?.token
    const user: IntellixyUser = data.user || {
      id: data.userId || data.id,
      email: email.trim(),
      name: data.name || email.trim().split('@')[0],
    }

    if (!token && !document?.cookie) {
      // Si por alguna razón la API no devolvió token en el body
      console.warn('Advertencia: No se encontró token explícito en el JSON de respuesta')
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
      // Sesión expirada
      await logoutIntellixy()
      return { success: false, error: 'Tu sesión en Intellixy ha expirado. Por favor inicia sesión nuevamente.' }
    }

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `Error al obtener materias (${response.status})`,
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
 * Sube las notas capturadas a una materia seleccionada en Intellixy
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
  const { subjectId, videoTitle, videoId, notes } = params
  const session = await getIntellixySession()

  if (!session.connected || !session.token) {
    return { success: false, error: 'Inicia sesión en Intellixy para enviar tus notas.' }
  }

  // Estructurar el texto en Markdown claro con timestamps clickeables y categorías
  const lines: string[] = []
  lines.push(`# ${videoTitle || 'Apuntes de YouTube'}`)
  lines.push(`- **Video:** https://www.youtube.com/watch?v=${videoId}`)
  lines.push(`- **Fecha:** ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}`)
  lines.push(`- **Total de apuntes:** ${notes.length}\n`)
  lines.push(`---\n`)
  lines.push(`## Apuntes con Timestamps:\n`)

  for (const n of notes) {
    const catLabel = n.category ? ` [${n.category.toUpperCase()}]` : ''
    lines.push(`- **${n.formattedTime}**${catLabel}: ${n.text}`)
  }

  const payloadText = lines.join('\n')

  try {
    const response = await fetch(`${INTELLIXY_BASE_URL}/api/subjects/${subjectId}/materials/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        title: videoTitle ? `${videoTitle.substring(0, 80)} (YouTube)` : 'Apuntes de YouTube',
        text: payloadText,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Error al guardar material en Intellixy (${response.status})`,
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
