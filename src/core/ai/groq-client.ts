// Servicio de Asistencia con IA ultrarrápida usando Groq API (Llama 3.3 70B Versatile o 8B Instant)

const GROQ_API_KEY_STORAGE = 'intellimark_groq_api_key'

export interface EnhanceNoteResult {
  success: boolean
  enhancedText?: string
  error?: string
}

export type AIAssistAction = 'clarify' | 'bullets' | 'expand' | 'grammar'

/**
 * Obtiene la API Key de Groq guardada en chrome.storage.local
 */
export async function getGroqApiKey(): Promise<string> {
  if (!chrome.storage?.local) return ''
  const res = await chrome.storage.local.get([GROQ_API_KEY_STORAGE])
  return res[GROQ_API_KEY_STORAGE] || ''
}

/**
 * Guarda o actualiza la API Key de Groq en chrome.storage.local
 */
export async function setGroqApiKey(apiKey: string): Promise<void> {
  if (!chrome.storage?.local) return
  await chrome.storage.local.set({ [GROQ_API_KEY_STORAGE]: apiKey.trim() })
}

/**
 * Envía el borrador de la nota a Groq para mejorarla, estructurarla o resumirla.
 */
export async function enhanceNoteWithGroq(
  text: string,
  action: AIAssistAction,
  videoTitle?: string
): Promise<EnhanceNoteResult> {
  const apiKey = await getGroqApiKey()
  if (!apiKey) {
    return {
      success: false,
      error: 'Por favor configura tu API Key gratuita de Groq en Ajustes.',
    }
  }

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
        model: 'llama-3.3-70b-versatile',
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
