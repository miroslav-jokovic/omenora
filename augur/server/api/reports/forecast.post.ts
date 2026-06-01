import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import {
  ForecastReadingSchema,
  type ForecastReadingType,
  ForecastReadingRequestSchema,
} from '~~/server/utils/ai-schemas'
import { withAiRetry } from '~~/server/utils/ai-retry'

/**
 * POST /api/reports/forecast
 *
 * Generates a 90-day astrological forecast for the authenticated premium user.
 * Guarded by requirePremiumWithUsage (cap: 4/month). Usage is incremented only
 * on successful LLM generation — failed attempts do not count against the cap.
 *
 * period.start = today (ISO date). period.end = today + 90 days.
 * monthlyHighlights MUST contain exactly 3 entries per ForecastReadingSchema.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requirePremiumWithUsage(event, 'forecast')

  const config = useRuntimeConfig()

  const rawBody    = await readBody(event)
  const bodyResult = ForecastReadingRequestSchema.safeParse(rawBody)
  if (!bodyResult.success) {
    throw createError({
      statusCode: 400,
      message:    bodyResult.error.issues.map((i) => i.message).join(', '),
    })
  }

  const {
    firstName, archetype, element, lifePathNumber,
    sunSign, moonSign, risingSign, language,
    answers: { p1, p2, p3 },
  } = bodyResult.data

  // ── 90-day forecast window ─────────────────────────────────────────────────
  const today       = new Date()
  const endDate     = new Date(today)
  endDate.setDate(endDate.getDate() + 90)
  const periodStart = today.toISOString().slice(0, 10)
  const periodEnd   = endDate.toISOString().slice(0, 10)

  const languageInstructions: Record<string, string> = {
    en: 'Respond entirely in English.',
    es: 'Responde completamente en español. Usa un tono cálido, poético y personal.',
    pt: 'Responda completamente em português brasileiro. Use tom caloroso e pessoal.',
    hi: 'पूरी तरह से हिंदी में जवाब दें।',
    ko: '전체적으로 한국어로 답변해 주세요.',
    zh: '完全用简体中文回答。',
  }
  const langInstruction = languageInstructions[language] ?? languageInstructions['en'] ?? ''

  const toneInstruction =
    p2 === 'gentle'    ? 'warm and gentle — acknowledge difficulty softly'
    : p2 === 'detailed'  ? 'detailed and mechanistic — explain the astrological mechanism behind each point'
    : p2 === 'intuitive' ? 'open and exploratory — sensory language, leave space for personal discovery'
    : 'direct and declarative — short sentences, no hedging'

  const client = new Anthropic({ apiKey: config.anthropicApiKey as string })

  const prompt = `${langInstruction}

You are OMENORA, an AI destiny analysis system. Generate a 90-day astrological forecast for ${firstName}.

Their chart profile:
- Archetype: ${archetype}
- Element: ${element}
- Life Path: ${lifePathNumber}
- Sun: ${sunSign ?? 'unknown'}
- Moon: ${moonSign ?? 'unknown'}
- Rising: ${risingSign ?? 'unknown'}
- Primary focus: ${p1}
- Insight style: ${p2}
- Reading reason: ${p3}

Forecast window: ${periodStart} through ${periodEnd}

Rules:
- overallTheme: 1-2 sentences capturing the dominant energy of this 90-day window for ${firstName}. Reference their archetype and element specifically.
- keyTransits: Between 6-10 significant planetary events within ${periodStart}–${periodEnd}. Each transit must have: date (YYYY-MM-DD format, within the window), planet name, aspect or station description, area most affected (relationships/career/identity/home/finance/spiritual), and ~60-word personal meaning specific to ${firstName}. Use real astrological events — do not fabricate transit dates outside the window.
- monthlyHighlights: EXACTLY 3 entries — one per calendar month in the 90-day window. Each with: month name (e.g., "May 2026"), theme sentence, caution (null if no notable caution applies, otherwise a concise string), opportunity sentence. Vary the energy — not every month is positive.
- advice: ~250-word practical synthesis. Translate the forecast into 3-5 concrete moves ${firstName} can make. Ground each in specific transits from keyTransits. Tone: ${toneInstruction}.

Return ONLY valid JSON, no markdown:
{
  "period": { "start": "${periodStart}", "end": "${periodEnd}" },
  "overallTheme": "[1-2 sentences]",
  "keyTransits": [
    { "date": "${periodStart}", "planet": "[planet]", "aspect": "[aspect description]", "area": "identity", "meaning": "[~60 words]" }
  ],
  "monthlyHighlights": [
    { "month": "[Month YYYY]", "theme": "[theme sentence]", "caution": null, "opportunity": "[opportunity sentence]" },
    { "month": "[Month YYYY]", "theme": "[theme sentence]", "caution": "[caution or null]", "opportunity": "[opportunity sentence]" },
    { "month": "[Month YYYY]", "theme": "[theme sentence]", "caution": null, "opportunity": "[opportunity sentence]" }
  ],
  "advice": "[~250 words]"
}`

  const forecastJsonSchema = {
    type: 'object',
    properties: {
      period: {
        type: 'object',
        properties: {
          start: { type: 'string' },
          end:   { type: 'string' },
        },
        required: ['start', 'end'],
      },
      overallTheme: { type: 'string' },
      keyTransits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date:    { type: 'string' },
            planet:  { type: 'string' },
            aspect:  { type: 'string' },
            area:    { type: 'string', enum: ['relationships', 'career', 'identity', 'home', 'finance', 'spiritual'] },
            meaning: { type: 'string' },
          },
          required: ['date', 'planet', 'aspect', 'area', 'meaning'],
        },
      },
      monthlyHighlights: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            month:       { type: 'string' },
            theme:       { type: 'string' },
            caution:     {},
            opportunity: { type: 'string' },
          },
          required: ['month', 'theme', 'caution', 'opportunity'],
        },
      },
      advice: { type: 'string' },
    },
    required: ['period', 'overallTheme', 'keyTransits', 'monthlyHighlights', 'advice'],
  } as const

  const message = await withAiRetry('forecast-reading', () =>
    client.messages.parse({
      model:      'claude-sonnet-4-6',
      max_tokens: 5000,
      system:     'You are writing a personal 90-day astrological forecast for a specific person. Ground the forecast in real planetary transits occurring in the specified window. Name planets, aspects, and dates explicitly. Vary the energy across months — not every month is a positive one. The monthlyHighlights array MUST contain exactly 3 entries. Write at B2 English level. Short sentences. No cultural idioms.',
      messages:      [{ role: 'user', content: prompt }],
      output_config: { format: jsonSchemaOutputFormat(forecastJsonSchema) },
    })
  )

  const rawParsed = message.parsed_output

  if (!rawParsed) {
    const firstContent = message.content[0]
    const rawText = firstContent?.type === 'text' ? firstContent.text : ''
    console.error('[forecast-reading] Structured output returned null parsed_output', {
      endpoint:           'forecast-reading',
      timestamp:          new Date().toISOString(),
      rawResponsePreview: (rawText || '').slice(0, 500),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to generate forecast reading' })
  }

  const zodResult = ForecastReadingSchema.safeParse(rawParsed)
  if (!zodResult.success) {
    console.error('[forecast-reading] Schema validation failed after structured output', {
      endpoint:  'forecast-reading',
      timestamp: new Date().toISOString(),
      zodErrors: zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to generate forecast reading' })
  }

  const reading: ForecastReadingType = zodResult.data

  await incrementUsage(ctx.userId, ctx.feature, ctx.period)

  return {
    success: true,
    reading,
    usage: { count: ctx.count + 1, cap: ctx.cap, period: ctx.period, resets_at: ctx.resetsAt },
  }
})
