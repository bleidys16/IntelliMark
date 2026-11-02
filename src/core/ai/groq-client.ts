// Servicio de Asistencia con IA: Conecta al Microservicio Proxy o directo a Groq como fallback

const GROQ_API_KEY_STORAGE = 'intellimark_groq_api_key'
const CUSTOM_PROXY_URL_STORAGE = 'intellimark_proxy_url'

// URL oficial del microservicio en producción desplegado en Cloudflare Workers
export const DEFAULT_PROXY_URL = 'https://intellimark-ai-proxy.analyzor.workers.dev'

export interface EnhanceNoteResult {
  success: boolean
  enhancedText?: string
  error?: string
}

export type AIAssistAction = 'clarify' | 'bullets' | 'expand' | 'grammar'

export async function getGroqApiKey(): Promise<string> {
  if (!chrome.storage?.local) return ''
  const res = await chrome.storage.local.get([GROQ_API_KEY_STORAGE])
  return res[GROQ_API_KEY_STORAGE] || ''
}

export async function setGroqApiKey(apiKey: string): Promise<void> {
  if (!chrome.storage?.local) return
  await chrome.storage.local.set({ [GROQ_API_KEY_STORAGE]: apiKey.trim() })
}

export async function getProxyUrl(): Promise<string> {
  if (!chrome.storage?.local) return DEFAULT_PROXY_URL
  const res = await chrome.storage.local.get([CUSTOM_PROXY_URL_STORAGE])
  return res[CUSTOM_PROXY_URL_STORAGE] || DEFAULT_PROXY_URL
}

export async function setProxyUrl(url: string): Promise<void> {
  if (!chrome.storage?.local) return
  await chrome.storage.local.set({ [CUSTOM_PROXY_URL_STORAGE]: url.trim() })
}

/**
 * Mejora la nota.
 * Prioridad 1: Si el usuario configuró su propia clave personal de Groq (BYOK), la usa directo.
 * Prioridad 2: Si no tiene clave, usa automáticamente el Backend Proxy seguro de IntelliMark.
 */
export async function enhanceNoteWithGroq(
  text: string,
  action: AIAssistAction,
  videoTitle?: string
): Promise<EnhanceNoteResult> {
  const personalApiKey = await getGroqApiKey()

  // 1. Si el usuario proporcionó su propia clave, hacemos llamada directa (BYOK)
  if (personalApiKey) {
    return callGroqDirect(text, action, personalApiKey, videoTitle)
  }

  // 2. Si no tiene clave, llamamos al microservicio proxy oficial (Cero configuración para el usuario)
  return callProxyService(text, action, videoTitle)
}

/**
 * Llamada al Microservicio Proxy
 */
async function callProxyService(
  text: string,
  action: AIAssistAction,
  videoTitle?: string
): Promise<EnhanceNoteResult> {
  const proxyUrl = await getProxyUrl()
  const endpoint = proxyUrl.replace(/\/+$/, '') + '/api/ai/enhance'

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        action,
        videoTitle,
      }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Error del proxy (${response.status})`,
      }
    }

    return {
      success: true,
      enhancedText: data.enhancedText,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'No se pudo conectar con el servidor de IA.'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Fallback: Llamada directa a Groq con API Key del usuario
 */
async function callGroqDirect(
  text: string,
  action: AIAssistAction,
  apiKey: string,
  videoTitle?: string
): Promise<EnhanceNoteResult> {
  let promptInstruction = ''
  switch (action) {
    case 'clarify':
      promptInstruction =
        'Reescribe esta nota para que sea clara, concisa y fácil de repasar. Corrige cualquier error ortográfico o gramatical. Mantén el idioma original (español).'
      break
    case 'bullets':
      promptInstruction =
        'Convierte esta nota en una lista organizada de puntos clave (viñetas con guiones). Sé directo y elimina redundancias.'
      break
    case 'expand':
      promptInstruction =
        'Explica con un poco más de detalle el concepto mencionado en esta nota para fines de estudio, manteniendo un tono didáctico y directo.'
      break
    case 'grammar':
      promptInstruction =
        'Corrige la ortografía, puntuación y redacción de esta nota sin cambiar su significado.'
      break
  }

  const systemPrompt = `Eres un asistente de estudio para tomar notas eficientes de videos.
Video de referencia: "${videoTitle || 'Clase o Tutorial'}"
Instrucción: ${promptInstruction}
REGLA CRÍTICA: Responde ÚNICAMENTE con el texto de la nota mejorada. NO añadas introducciones como "Aquí tienes tu nota:" ni despedidas ni comillas.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      const msg = errJson?.error?.message || `Error ${response.status}: Fallo en la API de Groq.`
      return { success: false, error: msg }
    }

    const data = await response.json()
    const resultText = data.choices?.[0]?.message?.content?.trim() || ''

    return {
      success: true,
      enhancedText: resultText,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de conexión con Groq'
    return {
      success: false,
      error: message,
    }
  }
}
