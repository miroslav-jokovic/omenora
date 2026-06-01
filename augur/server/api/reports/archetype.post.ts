import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import {
  ArchetypeReadingSchema,
  type ArchetypeReadingType,
  ArchetypeReadingRequestSchema,
} from '~~/server/utils/ai-schemas'
import { withAiRetry } from '~~/server/utils/ai-retry'

/**
 * POST /api/reports/archetype
 *
 * Generates a 6-section archetype reading for the authenticated premium user.
 * Guarded by requirePremiumWithUsage (cap: 1/month). Usage is incremented only
 * on successful LLM generation — failed attempts do not count against the cap.
 */
export default defineEventHandler(async (event) => {
  const ctx = await requirePremiumWithUsage(event, 'archetype')

  const config = useRuntimeConfig()

  const rawBody    = await readBody(event)
  const bodyResult = ArchetypeReadingRequestSchema.safeParse(rawBody)
  if (!bodyResult.success) {
    throw createError({
      statusCode: 400,
      message:    bodyResult.error.issues.map((i) => i.message).join(', '),
    })
  }

  const {
    firstName, archetype, element, lifePathNumber,
    sunSign, moonSign, risingSign, powerTraits, language,
    answers: { p1, p2, p3 },
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

You are OMENORA, an AI destiny analysis system. Generate a 6-section archetype reading for ${firstName}.

Their chart profile:
- Archetype: ${archetype}
- Element: ${element}
- Life Path: ${lifePathNumber}
- Sun: ${sunSign ?? 'unknown'}
- Moon: ${moonSign ?? 'unknown'}
- Rising: ${risingSign ?? 'unknown'}
- Power traits: ${powerTraits.join(', ')}
- Primary focus: ${p1}
- Insight style: ${p2}
- Reading reason: ${p3}

Generate 6 sections. Every sentence must be specific to ${firstName}'s exact profile — never a generic template. Each section title must be evocative (3-5 words). Section content 120-180 words each.

Section guidance:
- identity: Who ${firstName} fundamentally is through this archetype — core nature, how others experience them, what drives them beneath the surface.
- science: The astrological mechanics confirming this archetype — which Sun, Moon, and Rising sign dynamics support this reading. Name signs explicitly. Explain the mechanism.
- shadow: The difficult expressions of this archetype — where ${firstName} may unconsciously undermine themselves. Honest, not softened.
- purpose: This archetype's soul calling in ${firstName}'s chart — what they are here to build, heal, or create.
- gift: The highest expression of this archetype — what ${firstName} offers the world when operating from their best self.
- affirmation: A single first-person intention sentence (not advice — a declaration). Ground it in ${archetype} and ${element} energy. ~20-30 words.

Return ONLY valid JSON, no markdown:
{
  "archetypeName": "${archetype}",
  "archetypeSymbol": "[1-2 char symbol representing ${archetype}]",
  "element": "${element}",
  "powerTraits": ${JSON.stringify(powerTraits)},
  "sections": {
    "identity":    { "title": "[evocative title]", "content": "[120-180 words]" },
    "science":     { "title": "[evocative title]", "content": "[120-180 words]" },
    "shadow":      { "title": "[evocative title]", "content": "[120-180 words]" },
    "purpose":     { "title": "[evocative title]", "content": "[120-180 words]" },
    "gift":        { "title": "[evocative title]", "content": "[120-180 words]" },
    "affirmation": { "title": "[evocative title]", "content": "[single intention sentence, ~20-30 words]" }
  }
}`

  const archetypeJsonSchema = {
    type: 'object',
    properties: {
      archetypeName:   { type: 'string' },
      archetypeSymbol: { type: 'string' },
      element:         { type: 'string', enum: ['Fire', 'Earth', 'Air', 'Water'] },
      powerTraits:     { type: 'array', items: { type: 'string' } },
      sections: {
        type: 'object',
        properties: {
          identity:    { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          science:     { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          shadow:      { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          purpose:     { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          gift:        { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          affirmation: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
        },
        required: ['identity', 'science', 'shadow', 'purpose', 'gift', 'affirmation'],
      },
    },
    required: ['archetypeName', 'element', 'powerTraits', 'sections'],
  } as const

  const message = await withAiRetry('archetype-reading', () =>
    client.messages.parse({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      system:     'You are writing a personal archetype reading for a specific person. Your analysis is grounded in Western tropical astrology and archetypal psychology. Every sentence must illuminate this exact person — not a generic template. Write at B2 English level. Short sentences. No cultural idioms. Make the reader feel their archetype has been truly seen for the first time.',
      messages:      [{ role: 'user', content: prompt }],
      output_config: { format: jsonSchemaOutputFormat(archetypeJsonSchema) },
    })
  )

  const rawParsed = message.parsed_output

  if (!rawParsed) {
    const firstContent = message.content[0]
    const rawText = firstContent?.type === 'text' ? firstContent.text : ''
    console.error('[archetype-reading] Structured output returned null parsed_output', {
      endpoint:           'archetype-reading',
      timestamp:          new Date().toISOString(),
      rawResponsePreview: (rawText || '').slice(0, 500),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to generate archetype reading' })
  }

  const zodResult = ArchetypeReadingSchema.safeParse(rawParsed)
  if (!zodResult.success) {
    console.error('[archetype-reading] Schema validation failed after structured output', {
      endpoint:  'archetype-reading',
      timestamp: new Date().toISOString(),
      zodErrors: zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to generate archetype reading' })
  }

  const reading: ArchetypeReadingType = zodResult.data

  await incrementUsage(ctx.userId, ctx.feature, ctx.period)

  return {
    success: true,
    reading,
    usage: { count: ctx.count + 1, cap: ctx.cap, period: ctx.period, resets_at: ctx.resetsAt },
  }
})
