import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { CalendarSchema, type CalendarType } from '~~/server/utils/ai-schemas'
import { withAiRetry } from '~~/server/utils/ai-retry'
import { getLanguageInstruction } from '~~/server/utils/language-instructions'
import { requirePremiumOrEntitlement } from '~~/server/utils/entitlements'

/**
 * POST /api/generate-calendar
 *
 * Generates a 12-month lucky timing calendar for the authenticated user.
 * Guarded by requirePremiumOrEntitlement — requires an active 'premium'
 * subscription OR an active 'calendar_2026' entitlement (omenora_calendar_2026
 * non-consumable IAP). Calendar is a permanent unlock; no usage cap applies.
 */
export default defineEventHandler(async (event) => {
  await requirePremiumOrEntitlement(
    event,
    'calendar_2026',
    ['omenora_monthly', 'omenora_annual', 'omenora_calendar_2026'],
  )

  const config = useRuntimeConfig()

  const body = await readBody(event)

  const firstName      = sanitizeString(body.firstName, 50)
  const archetype      = sanitizeString(body.archetype, 30)
  const element        = sanitizeString(body.element, 20)
  const lifePathNumber = Number(body.lifePathNumber)
  const dateOfBirth    = sanitizeString(body.dateOfBirth, 10)
  const language       = sanitizeString(body.language || 'en', 5)
  const answers        = body.answers && typeof body.answers === 'object' ? body.answers : {}

  assertInput(!!firstName, 'firstName is required')
  assertInput(isValidArchetype(archetype), 'Invalid archetype')
  assertInput(isValidDateOfBirth(dateOfBirth), 'Invalid dateOfBirth')

  const langInstruction = getLanguageInstruction(language as string)

  const client = new Anthropic({
    apiKey: config.anthropicApiKey as string,
  })

  const birthMonth = new Date(dateOfBirth).toLocaleString('default', { month: 'long' })
  const birthSeason = (() => {
    const month = new Date(dateOfBirth).getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'autumn'
    return 'winter'
  })()

  const prompt = `${langInstruction}

You are OMENORA, an AI destiny system.
Generate a highly specific month-by-month lucky timing calendar for 2026 for ${firstName}.

Their profile:
- Archetype: ${archetype}
- Element: ${element}
- Life Path: ${lifePathNumber}
- Born in: ${birthSeason} (${birthMonth})
- Primary focus for 2026: ${answers?.p1 || 'growth'}
- Insight style: ${answers?.p2 || 'direct'}
- Reason for seeking this reading: ${answers?.p3 || 'self'}

Personalization instructions:
- Focus area '${answers?.p1 || 'growth'}': The 2-3 months that most directly touch this area (connection=spring/summer romantic windows, purpose=career-peak months, growth=introspective/turning-point months, creativity=generative/high-energy months) must be written with 2x the depth and specificity of other months.
- Insight style '${answers?.p2 || 'direct'}': direct=short declarative sentences, no hedging. gentle=softer language, acknowledge difficulty gently. detailed=explain the mechanism behind each forecast. intuitive=open sensory language, leave space for discovery.
- Reading reason '${answers?.p3 || 'self'}': situation → make every month entry feel actionable, what to do not just what will happen. self → emphasize internal shifts over external events. curiosity → exploratory tone, possibility-focused. recommended → earn trust with specificity, no generic statements.

Rules:
- Be SPECIFIC to this person — reference their archetype, element, and life path in predictions
- Each month must feel genuinely different and personal
- Use real 2026 astrological events as anchors (Mercury retrograde Jan 25-Feb 14, Eclipse Apr 8, Jupiter enters Cancer Jun 9, Saturn retrograde Jul 12, Eclipse Oct 14, Mercury retrograde Oct 23-Nov 12)
- Vary the energy levels — not every month is great, some are warning months, some are neutral
- Write directly to ${firstName} in second person

Return ONLY valid JSON, no markdown:
{
  "overallTheme": "One sentence about ${firstName}'s 2026 overall energy",
  "peakMonths": ["April", "September"],
  "cautionMonths": ["January", "October"],
  "months": [
    {
      "month": "January",
      "number": 1,
      "energyLevel": 65,
      "theme": "Short theme title (3-5 words)",
      "love": "One specific sentence about love/relationships",
      "money": "One specific sentence about money/finances",
      "career": "One specific sentence about career/purpose",
      "warning": "One specific caution or null if none",
      "luckyDays": [7, 14, 22],
      "color": "one hex color that represents this month energy"
    }
  ]
}

Generate all 12 months. Energy levels 0-100.
Peak months should be 75-95. Caution months 30-55.
Normal months 55-75. Make it feel like a real forecast.`

  const calendarJsonSchema = {
    type: 'object',
    properties: {
      overallTheme:  { type: 'string' },
      peakMonths:    { type: 'array', items: { type: 'string' } },
      cautionMonths: { type: 'array', items: { type: 'string' } },
      months: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            month:       { type: 'string' },
            number:      { type: 'number' },
            energyLevel: { type: 'number' },
            theme:       { type: 'string' },
            love:        { type: 'string' },
            money:       { type: 'string' },
            career:      { type: 'string' },
            warning:     { type: ['string', 'null'] },
            luckyDays:   { type: 'array', items: { type: 'number' } },
            color:       { type: 'string' },
          },
          required: ['month', 'number', 'energyLevel', 'theme', 'love', 'money', 'career', 'warning', 'luckyDays', 'color'],
        },
        minItems: 12,
        maxItems: 12,
      },
    },
    required: ['overallTheme', 'peakMonths', 'cautionMonths', 'months'],
  } as const

  const message = await withAiRetry('generate-calendar', () =>
    client.messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `You are writing a 12-month personal destiny calendar. Each month must feel specific to this exact person — their archetype, element, and life path. You are not writing horoscopes. You are mapping real astrological energy windows to this person's specific patterns. Write at B2 English level. Short sentences. Every month entry must give the reader one clear thing to understand about that period of their year.`,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: jsonSchemaOutputFormat(calendarJsonSchema) },
    })
  )

  const rawParsed = message.parsed_output

  if (!rawParsed) {
    const firstContent = message.content[0]
    const rawText = firstContent?.type === 'text' ? firstContent.text : ''
    console.error('[generate-calendar] Structured output returned null parsed_output', {
      endpoint: 'generate-calendar',
      timestamp: new Date().toISOString(),
      rawResponsePreview: (rawText || '').slice(0, 500),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to parse calendar' })
  }

  const zodResult = CalendarSchema.safeParse(rawParsed)
  if (!zodResult.success) {
    console.error('[generate-calendar] Schema validation failed after structured output', {
      endpoint: 'generate-calendar',
      timestamp: new Date().toISOString(),
      zodErrors: zodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to parse calendar' })
  }

  const calendarData: CalendarType = zodResult.data

  return { success: true, calendar: calendarData }
})
