import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Tipos para el microservicio
type Bindings = {
  GROQ_API_KEY: string
  RATE_LIMIT_KV?: KVNamespace
}

type AIAssistAction = 'clarify' | 'bullets' | 'expand' | 'grammar'

interface EnhanceRequest {
  text: string
  action: AIAssistAction
  videoTitle?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Habilitar CORS para permitir llamadas seguras desde extensiones de Chrome
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Endpoint de salud
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'IntelliMark AI Proxy' })
})

// Endpoint principal: POST /api/ai/enhance
app.post('/api/ai/enhance', async (c) => {
  const groqApiKey = c.env.GROQ_API_KEY
  if (!groqApiKey) {
    return c.json(
      { success: false, error: 'Servidor no configurado: falta GROQ_API_KEY en variables de entorno.' },
      500
    )
  }

  let body: EnhanceRequest
  try {
    body = await c.req.json<EnhanceRequest>()
  } catch {
    return c.json({ success: false, error: 'Cuerpo de petición inválido (JSON esperado).' }, 400)
  }

  const { text, action, videoTitle } = body
  if (!text || !text.trim()) {
    return c.json({ success: false, error: 'El texto de la nota no puede estar vacío.' }, 400)
  }

  // Protección anti-abuso: limitar tamaño del texto de entrada
  if (text.length > 3000) {
    return c.json({ success: false, error: 'El texto supera el límite permitido de 3000 caracteres.' }, 400)
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
    default:
      promptInstruction = 'Mejora la redacción y claridad de esta nota para estudio.'
  }

  const systemPrompt = `Eres el asistente de estudio oficial de IntelliMark para notas de YouTube.
Video de referencia: "${videoTitle || 'Clase o Video'}"
Instrucción: ${promptInstruction}
REGLA CRÍTICA: Responde ÚNICAMENTE con el texto de la nota mejorada. NO agregues saludos, explicaciones, introducciones ni comillas.`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}))
      return c.json(
        { success: false, error: err?.error?.message || `Error en el motor de IA (${groqRes.status})` },
        502
      )
    }

    const groqData = await groqRes.json()
    const enhancedText = groqData.choices?.[0]?.message?.content?.trim() || ''

    return c.json({
      success: true,
      enhancedText,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno de conexión'
    return c.json({ success: false, error: msg }, 500)
  }
})

export default app
