import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import {
  NatalChartReadingSchema,
  type NatalChartReadingType,
  NatalChartReadingRequestSchema,
} from '~~/server/utils/ai-schemas'
import { withAiRetry } from '~~/server/utils/ai-retry'

/**
 * POST /api/reports/natal-chart
 *
 * Generates a natal chart reading for the authenticated premium user.
 * Guarded by requirePremiumWithUsage (cap: 1/month). Usage is incremented only
 * on successful LLM generation — failed attempts do not count against the cap.
 *
 * planets array MUST be exactly 8 entries (Mercury → Pluto). If Claude returns
 * fewer, NatalChartReadingSchema.safeParse fails → withAiRetry triggers.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requirePremiumWithUsage(event, 'natal_chart')

  const config = useRuntimeConfig()

  const rawBody    = await readBody(event)
  const bodyResult = NatalChartReadingRequestSchema.safeParse(rawBody)
  if (!bodyResult.success) {
    throw createError({
      statusCode: 400,
      message:    bodyResult.error.issues.map((i) => i.message).join(', '),
    })
  }

  const {
    firstName, archetype, element, lifePathNumber,
    sunSign, moonSign, risingSign, powerTraits, language,
  } = bodyResult.data

  const languageInstructions: Record<string, string> = {
    en: 'Respond entirely in English.',
    es: 'Responde completamente en español. Usa un tono cálido, poético y personal.',
    pt: 'Responda completamente em português brasileiro. Use tom caloroso e pessoal.',
    hi: 'पूरी तरह से हिंदी में जवाब दें।',
    ko: '전체적으로 한국어로 답변해 주세요.',
    zh: '完全用简体中文回答。',
  }
  const langInstruction = languageInstructions[language] ?? languageInstructions['en'] ?? ''

  const client = new Anthropic({ apiKey: config.anthropicApiKey as string })

  const prompt = `${langInstruction}

You are OMENORA, an AI destiny analysis system. Generate a natal chart reading for ${firstName}.

Their chart profile:
- Archetype: ${archetype}
- Element: ${element}
- Life Path: ${lifePathNumber}
- Sun: ${sunSign ?? 'unknown'}
- Moon: ${moonSign ?? 'unknown'}
- Rising: ${risingSign ?? 'unknown'}
- Power traits: ${powerTraits.join(', ')}

Rules:
- bigThree: Interpret ${firstName}'s Sun, Moon, and Rising. Each with sign, house (1-12), and ~100-word description grounding that placement in their lived experience.
- planets: Return EXACTLY 8 planets in this order: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto. Infer house placements from Sun sign (${sunSign ?? 'unknown'}) and Rising (${risingSign ?? 'unknown'}). Each with sign, house (1-12), retrograde (true/false), and ~70-word description specific to ${firstName}. Do not include fewer than 8.
- aspects: Include 5-8 of the most significant aspects in this chart. Each must have: from planet, to planet, type (conjunction/opposition/trine/square/sextile), orb (0-10 degrees), and ~60-word meaning. Choose aspects that most define this chart's story.
- dominantElement: The element (Fire/Earth/Air/Water) that predominates.
- dominantQuality: The quality (Cardinal/Fixed/Mutable) that predominates.
- interpretation: ~300-word synthesis. Tell the central story of ${firstName}'s chart — the core tension, the greatest gift, the life theme. Name specific planets and placements.

Return ONLY valid JSON, no markdown:
{
  "bigThree": {
    "sun":    { "sign": "[sign]", "house": 5, "description": "[~100 words]" },
    "moon":   { "sign": "[sign]", "house": 8, "description": "[~100 words]" },
    "rising": { "sign": "[sign]", "house": 1, "description": "[~100 words]" }
  },
  "planets": [
    { "planet": "Mercury", "sign": "[sign]", "house": 5, "retrograde": false, "description": "[~70 words]" },
    { "planet": "Venus",   "sign": "[sign]", "house": 6, "retrograde": false, "description": "[~70 words]" },
    { "planet": "Mars",    "sign": "[sign]", "house": 4, "retrograde": false, "description": "[~70 words]" },
    { "planet": "Jupiter", "sign": "[sign]", "house": 9, "retrograde": false, "description": "[~70 words]" },
    { "planet": "Saturn",  "sign": "[sign]", "house": 10, "retrograde": true,  "description": "[~70 words]" },
    { "planet": "Uranus",  "sign": "[sign]", "house": 11, "retrograde": false, "description": "[~70 words]" },
    { "planet": "Neptune", "sign": "[sign]", "house": 12, "retrograde": true,  "description": "[~70 words]" },
    { "planet": "Pluto",   "sign": "[sign]", "house": 8,  "retrograde": false, "description": "[~70 words]" }
  ],
  "aspects": [
    { "from": "[planet]", "to": "[planet]", "type": "trine", "orb": 2.5, "meaning": "[~60 words]" }
  ],
  "dominantElement": "Fire",
  "dominantQuality": "Fixed",
  "interpretation":  "[~300 words]"
}`

  const natalChartJsonSchema = {
    type: 'object',
    properties: {
      bigThree: {
        type: 'object',
        properties: {
          sun:    { type: 'object', properties: { sign: { type: 'string' }, house: { type: 'number' }, description: { type: 'string' } }, required: ['sign', 'house', 'description'] },
          moon:   { type: 'object', properties: { sign: { type: 'string' }, house: { type: 'number' }, description: { type: 'string' } }, required: ['sign', 'house', 'description'] },
          rising: { type: 'object', properties: { sign: { type: 'string' }, house: { type: 'number' }, description: { type: 'string' } }, required: ['sign', 'house', 'description'] },
        },
        required: ['sun', 'moon', 'rising'],
      },
      planets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            planet:      { type: 'string' },
            sign:        { type: 'string' },
            house:       { type: 'number' },
            retrograde:  { type: 'boolean' },
            description: { type: 'string' },
          },
          required: ['planet', 'sign', 'house', 'retrograde', 'description'],
        },
      },
      aspects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from:    { type: 'string' },
            to:      { type: 'string' },
            type:    { type: 'string', enum: ['conjunction', 'opposition', 'trine', 'square', 'sextile'] },
            orb:     { type: 'number' },
            meaning: { type: 'string' },
          },
          required: ['from', 'to', 'type', 'orb', 'meaning'],
        },
      },
      dominantElement: { type: 'string', enum: ['Fire', 'Earth', 'Air', 'Water'] },
      dominantQuality: { type: 'string', enum: ['Cardinal', 'Fixed', 'Mutable'] },
      interpretation:  { type: 'string' },
    },
    required: ['bigThree', 'planets', 'aspects', 'dominantElement', 'dominantQuality', 'interpretation'],
  } as const

  const message = await withAiRetry('natal-chart-reading', () =>
    client.messages.parse({
      model:      'claude-sonnet-4-6',
      max_tokens: 5000,
      system:     'You are writing a personal natal chart reading for a specific person. Your analysis draws from Western tropical astrology — signs, houses, aspects, and planetary dignity. Be precise. Name signs and houses explicitly. Every interpretation must be grounded in chart mechanics, not generic description. The planets array MUST contain exactly 8 entries in the specified order. Write at B2 English level. Short sentences. No cultural idioms.',
      messages:      [{ role: 'user', content: prompt }],
      output_config: { format: jsonSchemaOutputFormat(natalChartJsonSchema) },
    })
  )

  const rawParsed = message.parsed_output

  if (!rawParsed) {
    const firstContent = message.content[0]
    const rawText = firstContent?.type === 'text' ? firstContent.text : ''
    console.error('[natal-chart-reading] Structured output returned null parsed_output', {
      endpoint:           'natal-chart-reading',
      timestamp:          new Date().toISOString(),
      rawResponsePreview: (rawText || '').slice(0, 500),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to generate natal chart reading' })
  }

  const zodResult = NatalChartReadingSchema.safeParse(rawParsed)
  if (!zodResult.success) {
    console.error('[natal-chart-reading] Schema validation failed after structured output', {
      endpoint:  'natal-chart-reading',
      timestamp: new Date().toISOString(),
      zodErrors: zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to generate natal chart reading' })
  }

  const reading: NatalChartReadingType = zodResult.data

  await incrementUsage(ctx.userId, ctx.feature, ctx.period)

  return {
    success: true,
    reading,
    usage: { count: ctx.count + 1, cap: ctx.cap, period: ctx.period, resets_at: ctx.resetsAt },
  }
})
