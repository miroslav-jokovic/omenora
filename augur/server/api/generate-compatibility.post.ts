import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { CompatibilitySectionsSchema, PreviewCompatibilitySchema, type CompatibilityReceiptType } from '~~/server/utils/ai-schemas'
import { withAiRetry } from '~~/server/utils/ai-retry'
import { getSunSign, getLifePathNumber } from '~~/server/utils/quick-signs'
import { getPlanetaryTransits } from '~~/server/utils/planetaryTransits'
import { getLanguageInstruction } from '~~/server/utils/language-instructions'
import { calculateNatalChart, assignArchetypeFromChart } from '~~/app/utils/natalChart'

// ── Inline quiz answers type (mirrors CompatibilityQuizAnswers in analysisStore) ──
// Declared inline rather than imported from app/stores to avoid pulling Pinia
// (a client-only plugin) into the server bundle.

interface QuizAnswers {
  q1_intent?:         'specific_person' | 'new_curiosity' | 'pattern' | 'exploring'
  q2_feeling?:        'curiosity' | 'hope' | 'confusion' | 'longing' | 'unnamed'
  q3_duration?:       'recent' | 'weeks' | 'months' | 'long'
  q4_approach?:       'lead_feelings' | 'observe_first' | 'match_energy' | 'take_time'
  q5_communication?:  'direct' | 'show_through_action' | 'wait_to_notice' | 'write_first'
  q6_closeness?:      'crave' | 'need_space' | 'on_my_terms' | 'figuring_out'
  q7_conflict?:       'head_on' | 'give_air' | 'middle_ground' | 'wait_pass'
  q8_intimacy?:       'known' | 'understood' | 'both' | 'neither'
  q9_value?:          'trust' | 'excitement' | 'steadiness' | 'mutual_growth' | 'being_seen'
  q14_descriptor?:    'magnetic' | 'confusing' | 'intense' | 'easy' | 'healing' | 'challenging' | 'distant' | 'activating'
  q15_chapter?:       'new_unfolding' | 'first_test' | 'long_steady' | 'confusing_between' | 'ending_shifting'
  q16_season?:        'spring' | 'summer' | 'autumn' | 'winter'
  q17_pattern?:       'close_pull_back' | 'fast_slow' | 'misunderstand' | 'sync_stuck' | 'no_pattern'
  q18_trust_texture?: 'stone' | 'water' | 'glass' | 'silk'
  q19_curiosity?:     'why_feels' | 'what_become' | 'whether_invest' | 'not_seeing'
  q23_time_of_day?:   'dawn' | 'noon' | 'dusk' | 'night'
  q24_helpfulness?:   'clarity' | 'self_insight' | 'possibility' | 'reflection'
  q25_agency?:        'happen_to_me' | 'i_make' | 'through_me' | 'depends'
}

// ── Thematic block builders ──────────────────────────────────────────────────
// Each function returns a formatted block string or '' when no data is present.
// Empty blocks are omitted from the prompt via template-literal interpolation.

function buildBlock1(q: QuizAnswers): string {
  const Q1: Record<string, string> = {
    specific_person: 'seeking to understand a specific person',
    new_curiosity:   'curious about a new connection',
    pattern:         'noticing a pattern across relationships',
    exploring:       'just exploring',
  }
  const Q19: Record<string, string> = {
    why_feels:      'wants to understand why it feels the way it does',
    what_become:    'wants to understand what it could become',
    whether_invest: 'wants to understand whether to keep investing',
    not_seeing:     'wants to understand what they\'re not seeing',
  }
  const Q24: Record<string, string> = {
    clarity:      'most needs clarity about the connection',
    self_insight: 'most needs insight about themselves in it',
    possibility:  'most needs a sense of what\'s possible',
    reflection:   'most needs to be reflected back',
  }
  const lines: string[] = []
  if (q.q1_intent  && Q1[q.q1_intent])   lines.push(`User is ${Q1[q.q1_intent]}.`)
  if (q.q19_curiosity && Q19[q.q19_curiosity]) lines.push(`They ${Q19[q.q19_curiosity]}.`)
  if (q.q24_helpfulness && Q24[q.q24_helpfulness]) lines.push(`They ${Q24[q.q24_helpfulness]}.`)
  if (lines.length === 0) return ''
  return `WHY THEY'RE HERE:\n${lines.join('\n')}`
}

function buildBlock2(q: QuizAnswers): string {
  const Q2: Record<string, string> = {
    curiosity: 'first feeling: curiosity',
    hope:      'first feeling: hope',
    confusion: 'first feeling: confusion',
    longing:   'first feeling: longing',
    unnamed:   'first feeling: something unnamed',
  }
  const Q16: Record<string, string> = {
    spring: 'spring',
    summer: 'summer',
    autumn: 'autumn',
    winter: 'winter',
  }
  const Q18: Record<string, string> = {
    stone: 'stone (solid, weathered)',
    water: 'water (fluid, finding its level)',
    glass: 'glass (clear but fragile)',
    silk:  'silk (soft, present)',
  }
  const Q23: Record<string, string> = {
    dawn:  'dawn (something just beginning)',
    noon:  'noon (clear, present, visible)',
    dusk:  'dusk (warm, ending, golden)',
    night: 'night (quiet, hidden, deep)',
  }
  const lines: string[] = []
  if (q.q2_feeling     && Q2[q.q2_feeling])                       lines.push(`${Q2[q.q2_feeling]}.`)
  if (q.q14_descriptor)                                           lines.push(`in one word: ${q.q14_descriptor}.`)
  if (q.q16_season     && Q16[q.q16_season])                      lines.push(`feels like the season of ${Q16[q.q16_season]}.`)
  if (q.q18_trust_texture && Q18[q.q18_trust_texture])            lines.push(`trust has the texture of ${Q18[q.q18_trust_texture]}.`)
  if (q.q23_time_of_day   && Q23[q.q23_time_of_day])              lines.push(`feels like the time of ${Q23[q.q23_time_of_day]}.`)
  if (lines.length === 0) return ''
  return `HOW THE CONNECTION FEELS (METAPHORICAL):\n${lines.join('\n')}\nUSE THESE METAPHORS in section copy — weave the imagery naturally; do not list them.`
}

function buildBlock3(q: QuizAnswers): string {
  const Q4: Record<string, string> = {
    lead_feelings:  'leads with their feelings',
    observe_first:  'observes first, then opens up',
    match_energy:   'matches the other person\'s energy',
    take_time:      'is careful — takes their time',
  }
  const Q5: Record<string, string> = {
    direct:               'expresses what matters by saying it directly',
    show_through_action:  'expresses what matters by showing it through action',
    wait_to_notice:       'expresses what matters by waiting for the other to notice',
    write_first:          'expresses what matters by writing before speaking',
  }
  const Q6: Record<string, string> = {
    crave:        'wants a lot of closeness',
    need_space:   'needs space to recharge',
    on_my_terms:  'wants closeness on their own terms',
    figuring_out: 'is still figuring out how they like to feel close',
  }
  const Q7: Record<string, string> = {
    head_on:       'addresses tension head-on',
    give_air:      'gives tension some air before addressing',
    middle_ground: 'finds the middle ground in tension',
    wait_pass:     'waits to see if tension passes',
  }
  const Q8: Record<string, string> = {
    known:      'wants to be deeply known',
    understood: 'wants to be deeply understood',
    both:       'wants to be both known and understood, equally',
    neither:    'doesn\'t strongly want either to be known or understood',
  }
  const lines: string[] = []
  if (q.q4_approach     && Q4[q.q4_approach])     lines.push(`${Q4[q.q4_approach]}.`)
  if (q.q5_communication && Q5[q.q5_communication]) lines.push(`${Q5[q.q5_communication]}.`)
  if (q.q6_closeness    && Q6[q.q6_closeness])    lines.push(`${Q6[q.q6_closeness]}.`)
  if (q.q7_conflict     && Q7[q.q7_conflict])     lines.push(`${Q7[q.q7_conflict]}.`)
  if (q.q8_intimacy     && Q8[q.q8_intimacy])     lines.push(`${Q8[q.q8_intimacy]}.`)
  if (lines.length === 0) return ''
  return `HOW PERSON 1 SHOWS UP IN CONNECTION:\n${lines.join('\n')}`
}

function buildBlock4(q: QuizAnswers): string {
  const Q3: Record<string, string> = {
    recent: 'person has only recently been on their mind',
    weeks:  'person has been on their mind a few weeks',
    months: 'person has been on their mind for months',
    long:   'person has been on their mind longer than they\'ll admit',
  }
  const Q15: Record<string, string> = {
    new_unfolding:     'currently in a new, unfolding chapter',
    first_test:        'currently in the first real test of the connection',
    long_steady:       'currently in a long, steady season',
    confusing_between: 'currently in a confusing in-between',
    ending_shifting:   'currently ending or shifting',
  }
  const lines: string[] = []
  if (q.q3_duration && Q3[q.q3_duration])   lines.push(`${Q3[q.q3_duration]}.`)
  if (q.q15_chapter && Q15[q.q15_chapter])  lines.push(`${Q15[q.q15_chapter]}.`)
  if (lines.length === 0) return ''
  return `WHERE THE CONNECTION IS:\n${lines.join('\n')}`
}

function buildBlock5(q: QuizAnswers): string {
  const Q9: Record<string, string> = {
    trust:         'most values trust',
    excitement:    'most values excitement',
    steadiness:    'most values steadiness',
    mutual_growth: 'most values mutual growth',
    being_seen:    'most values being seen',
  }
  const Q17: Record<string, string> = {
    close_pull_back: 'pattern: they come close, then pull back',
    fast_slow:       'pattern: they move fast, then slow',
    misunderstand:   'pattern: they misunderstand each other often',
    sync_stuck:      'pattern: they\'re in sync but stuck',
    no_pattern:      'no clear pattern yet',
  }
  const Q25: Record<string, string> = {
    happen_to_me: 'currently feels: things happen to me',
    i_make:       'currently feels: I make things happen',
    through_me:   'currently feels: things happen through me',
    depends:      'currently feels: depends on the day',
  }
  const lines: string[] = []
  if (q.q9_value    && Q9[q.q9_value])    lines.push(`${Q9[q.q9_value]}.`)
  if (q.q17_pattern && Q17[q.q17_pattern]) lines.push(`${Q17[q.q17_pattern]}.`)
  if (q.q25_agency  && Q25[q.q25_agency]) lines.push(`${Q25[q.q25_agency]}.`)
  if (lines.length === 0) return ''
  return `WHAT THEY'RE WORKING WITH:\n${lines.join('\n')}`
}

// ── Ascendant helper ─────────────────────────────────────────────────────────
// Returns "- Rising sign (ascendant): [SignName]" or '' when not computable.
// Silent degradation: no fallback text when birth time or coords are missing.

function computeAscendantLine(
  dob: string,
  timeOfBirth: string | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): string {
  if (!timeOfBirth || !lat || !lng || !dob) return ''
  try {
    const chart = calculateNatalChart({
      dateOfBirth:       dob,
      timeOfBirth:       timeOfBirth,
      utcOffsetMinutes:  0,
      city:              '',
      lat:               lat,
      lon:               lng,
    })
    if (!chart.ascendant) return ''
    return `- Rising sign (ascendant): ${chart.ascendant.sign}`
  } catch {
    return ''
  }
}

// ── Rarity block builder ─────────────────────────────────────────────────────
// Returns a RARITY: block string when both elements are known, else ''.

function buildRarityBlock(elementA: string, elementB: string): string {
  if (!elementA || !elementB || elementA === 'Unknown' || elementB === 'Unknown') return ''
  const qualifier = elementA === elementB
    ? 'Same-element pairings carry a doubling quality — strengths and shadows both amplify.'
    : 'Cross-element pairings carry a tension-and-translation quality — energies don\'t automatically speak the same language.'
  return `RARITY:\nThis ${elementA} + ${elementB} pairing is one of 16 possible element combinations (each ~6.25%). ${qualifier}`
}

// ── Thematic block assembly ───────────────────────────────────────────────────
// Joins non-empty blocks with double newlines for clean prompt formatting.

function joinBlocks(...blocks: string[]): string {
  const present = blocks.filter(b => b.length > 0)
  if (present.length === 0) return ''
  return '\n\n' + present.join('\n\n')
}

// ── Deterministic compatibility score ────────────────────────────────────────
// Combines life-path harmony and elemental synastry into a 0-100 score.
// No AI involved — runs in microseconds.

function computeCompatibilityScore(
  lifePathA: number,
  lifePathB: number,
  elementA: string,
  elementB: string,
): number {
  const ELEMENT_AFFINITY: Record<string, Record<string, number>> = {
    Fire:  { Fire: 70, Earth: 55, Air: 85, Water: 60 },
    Earth: { Fire: 55, Earth: 75, Air: 60, Water: 85 },
    Air:   { Fire: 85, Earth: 60, Air: 70, Water: 60 },
    Water: { Fire: 60, Earth: 85, Air: 60, Water: 75 },
  }
  const elementScore = ELEMENT_AFFINITY[elementA]?.[elementB] ?? 65

  const diff = Math.abs(lifePathA - lifePathB)
  const lifePathScore =
    diff === 0 ? 72
    : diff <= 2 ? 82
    : diff <= 4 ? 68
    : diff <= 6 ? 58
    : 50

  const raw = Math.round(elementScore * 0.55 + lifePathScore * 0.45)
  return Math.min(99, Math.max(28, raw))
}

// ── Deterministic compatibility title ────────────────────────────────────────
// Template-based from archetype pair — no AI needed.

function computeCompatibilityTitle(archetypeA: string, archetypeB: string, elementA: string, elementB: string): string {
  const ELEMENT_PHRASE: Record<string, Record<string, string>> = {
    Fire:  { Fire: 'two flames seeking direction', Earth: 'spark meets stone', Air: 'the fire that thought ignites', Water: 'steam and depth' },
    Earth: { Fire: 'the ground that holds the flame', Earth: 'roots intertwined', Air: 'the field that lifts the wind', Water: 'the riverbed and its current' },
    Air:   { Fire: 'the breath behind the blaze', Earth: 'sky above solid ground', Air: 'minds in orbit', Water: 'wind over still water' },
    Water: { Fire: 'depth meets intensity', Earth: 'the river finds its banks', Air: 'intuition meets logic', Water: 'two currents, one sea' },
  }
  const phrase = ELEMENT_PHRASE[elementA]?.[elementB] ?? 'a meeting of forces'
  const a = archetypeA || 'The Seeker'
  const b = archetypeB || 'The Mirror'
  return `${a} & ${b} — ${phrase}`
}

export default defineEventHandler(async (event) => {
  const ctx = await requirePremiumOrCreditAccess(event, 'compatibility', 'compat')

  const config = useRuntimeConfig()

  const body = await readBody(event)

  // ── Raw field extraction ─────────────────────────────────────────────────

  const firstName      = sanitizeString(body.firstName, 50)
  const partnerName    = sanitizeString(body.partnerName, 50)
  const partnerDob     = sanitizeString(body.partnerDob, 10)
  const partnerCity    = sanitizeString(body.partnerCity, 100)
  const language       = sanitizeString(body.language || 'en', 5)
  const previewMode    = body.previewMode === true

  // New optional quiz personalisation fields (Build 4 expansion)
  const quizAnswers:         QuizAnswers       = (body.quizAnswers && typeof body.quizAnswers === 'object') ? body.quizAnswers as QuizAnswers : {}
  const timeOfBirth:         string | undefined = typeof body.timeOfBirth === 'string' && body.timeOfBirth ? body.timeOfBirth : undefined
  const partnerTimeOfBirth:  string | undefined = typeof body.partnerTimeOfBirth === 'string' && body.partnerTimeOfBirth ? body.partnerTimeOfBirth : undefined
  const userCityLat:         number | null      = typeof body.cityLat === 'number' ? body.cityLat : null
  const userCityLng:         number | null      = typeof body.cityLng === 'number' ? body.cityLng : null
  const partnerCityLatRaw:   number | null      = typeof body.partnerCityLat === 'number' ? body.partnerCityLat : null
  const partnerCityLngRaw:   number | null      = typeof body.partnerCityLng === 'number' ? body.partnerCityLng : null

  // Optional archetype-reading fields (CASE 1) vs. standalone fields (CASE 2)
  const rawArchetype      = body.archetype  != null ? sanitizeString(body.archetype, 30)  : null
  const rawElement        = body.element    != null ? sanitizeString(body.element, 20)    : null
  const rawLifePathNumber = body.lifePathNumber != null ? Number(body.lifePathNumber)      : null
  const rawPowerTraits    = Array.isArray(body.powerTraits)
    ? (body.powerTraits as unknown[]).slice(0, 5).map((t) => sanitizeString(String(t ?? ''), 80))
    : null
  const rawDateOfBirth    = body.dateOfBirth != null ? sanitizeString(body.dateOfBirth, 10) : null

  // ── Input validation ─────────────────────────────────────────────────────

  if (!previewMode) {
    assertInput(!!firstName,  'firstName is required')
    assertInput(!!partnerName, 'partnerName is required')
  }
  assertInput(isValidDateOfBirth(partnerDob), 'Invalid partner date of birth')

  // CASE 1: archetype-reading data present — validate it
  // CASE 2: standalone mode — dateOfBirth (User A) is required instead
  const standaloneMode = rawArchetype === null || rawArchetype === ''
  if (!standaloneMode) {
    assertInput(isValidArchetype(rawArchetype!), 'Invalid archetype')
  } else {
    assertInput(
      rawDateOfBirth !== null && isValidDateOfBirth(rawDateOfBirth),
      'dateOfBirth is required when archetype is not provided',
    )
  }

  // ── Resolve Person 1 fields ──────────────────────────────────────────────

  let archetype:      string
  let element:        string
  let lifePathNumber: number
  let powerTraits:    string[]
  let person1Dob:     string

  if (!standaloneMode) {
    // CASE 1: use caller-supplied values verbatim
    archetype      = rawArchetype!
    element        = rawElement ?? ''
    lifePathNumber = rawLifePathNumber ?? 0
    powerTraits    = rawPowerTraits ?? []
    person1Dob     = rawDateOfBirth ?? ''
  } else {
    // CASE 2: derive everything from dateOfBirth using deterministic calculations
    person1Dob = rawDateOfBirth!

    const person1LifePathResult = getLifePathNumber(person1Dob)
    lifePathNumber = person1LifePathResult.number

    const person1SunSign = getSunSign(person1Dob)
    // Element from quick-signs is Title Case (Fire/Earth/Air/Water) — matches prompt expectations
    element = person1SunSign.element

    // Derive archetype via Swiss Ephemeris natal chart (same pipeline as calculate-chart.post.ts).
    // With lat=0/lon=0 and no time, ascendant is null — archetype resolves from Sun+Moon elements only.
    const chart  = calculateNatalChart({ dateOfBirth: person1Dob, timeOfBirth: null, utcOffsetMinutes: 0, city: '', lat: 0, lon: 0 })
    archetype    = assignArchetypeFromChart(chart)

    powerTraits = rawPowerTraits ?? []
  }

  // ── Partner calculations ─────────────────────────────────────────────────

  const partnerLifePath = getLifePathNumber(partnerDob).number
  const partnerSunSign  = getSunSign(partnerDob)
  const partnerElement  = partnerSunSign.element

  const partnerSeason = (() => {
    const month = new Date(partnerDob).getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'autumn'
    return 'winter'
  })()

  // ── Synastry element notes (deterministic, server-side) ──────────────
  //
  // Derives meaningful elemental synastry notes from both people's elements.
  // These are factual, rule-based statements — not AI invention.

  const ELEMENT_PAIRS: Record<string, Record<string, string>> = {
    Fire: {
      Fire:  'Fire + Fire: high passion, risk of burnout without space',
      Earth: 'Fire + Earth: drive meets stability — grounding tension',
      Air:   'Fire + Air: Air fans the flame — mentally stimulating match',
      Water: 'Fire + Water: intense chemistry, steam when pressure builds',
    },
    Earth: {
      Fire:  'Earth + Fire: stability challenged by spontaneity',
      Earth: 'Earth + Earth: reliable foundation, slow to change',
      Air:   'Earth + Air: practicality vs. ideas — communication gap risk',
      Water: 'Earth + Water: Water nourishes Earth — naturally complementary',
    },
    Air: {
      Fire:  'Air + Fire: ideas ignite action — fast-moving connection',
      Earth: 'Air + Earth: vision vs. structure — needs shared goals',
      Air:   'Air + Air: strong mental bond, may lack emotional grounding',
      Water: 'Air + Water: logical meets intuitive — requires translation',
    },
    Water: {
      Fire:  'Water + Fire: deep feeling meets boldness — intense polarity',
      Earth: 'Water + Earth: Water finds its container — stabilising bond',
      Air:   'Water + Air: emotion vs. logic — empathy bridges the gap',
      Water: 'Water + Water: profound emotional depth, boundary blurring risk',
    },
  }

  const p1Element = element || 'Unknown'
  const p2Element = partnerElement
  const elementNote = ELEMENT_PAIRS[p1Element]?.[p2Element]
    ?? `${p1Element} + ${p2Element}: elemental interplay shapes the dynamic`

  const lifePathNote = (() => {
    const diff = Math.abs(lifePathNumber - partnerLifePath)
    if (diff === 0)  return `Life Path ${lifePathNumber} + ${partnerLifePath}: shared number — mirrored life mission, risk of echo chamber`
    if (diff <= 2)   return `Life Path ${lifePathNumber} + ${partnerLifePath}: compatible rhythm — goals align with natural variance`
    if (diff <= 5)   return `Life Path ${lifePathNumber} + ${partnerLifePath}: moderate contrast — complementary if communication is strong`
    return           `Life Path ${lifePathNumber} + ${partnerLifePath}: significant contrast — different life missions require intentional bridging`
  })()

  // ── Language instruction ──────────────────────────────────────────────────

  const langInstruction = getLanguageInstruction(language)

  // ── Anthropic client ──────────────────────────────────────────────────────

  const client = new Anthropic({
    apiKey: config.anthropicApiKey as string,
  })

  // ── Shared context strings (used by both preview and full prompts) ─────────

  const p1AscendantLine = computeAscendantLine(person1Dob, timeOfBirth, userCityLat, userCityLng)
  const p2AscendantLine = computeAscendantLine(partnerDob, partnerTimeOfBirth, partnerCityLatRaw, partnerCityLngRaw)

  const rarityBlock  = buildRarityBlock(element || 'Unknown', partnerElement)

  const block1 = buildBlock1(quizAnswers)
  const block2 = buildBlock2(quizAnswers)
  const block3 = buildBlock3(quizAnswers)
  const block4 = buildBlock4(quizAnswers)
  const block5 = buildBlock5(quizAnswers)

  const thematicBlocks = joinBlocks(block1, block2, block3, block4, block5)

  const personContext = `Person 1 (the user):
- Archetype: ${archetype}
- Element: ${element}
- Life Path: ${lifePathNumber}${p1AscendantLine ? '\n' + p1AscendantLine : ''}

Person 2 (their person):
- Born: ${partnerSeason} season
- Element: ${partnerElement}
- Life Path: ${partnerLifePath}
- Sun sign: ${partnerSunSign.name}${p2AscendantLine ? '\n' + p2AscendantLine : ''}

ELEMENTAL SYNASTRY:
${elementNote}${rarityBlock ? '\n\n' + rarityBlock : ''}

NUMEROLOGY:
${lifePathNote}${thematicBlocks}`

  // ── PREVIEW PATH ──────────────────────────────────────────────────────────
  // Generate ONLY the challenge (tension) section.
  // Score and title are computed deterministically — no AI needed for them.
  // This reduces preview latency from 15-20 seconds to ~3-5 seconds.

  if (previewMode) {
    if (ctx.source === 'credit') {
      console.log('[compatibility] credit-source user requested preview mode; serving full mode instead', { userId: ctx.userId })
      // fall through to full-mode path below
    }
    else {
    const compatibilityScore = computeCompatibilityScore(lifePathNumber, partnerLifePath, element || 'Unknown', partnerElement)
    const compatibilityTitle = computeCompatibilityTitle(archetype, partnerSunSign.name, element || 'Unknown', partnerElement)

    const previewPrompt = `${langInstruction}

You are OMENORA, an AI destiny analysis system. Write ONE section of a compatibility reading.
Be specific, poetic, and honest. Reference their archetypes, life paths, and elements.
Never be generic.

${personContext}

Generate ONLY the challenge section: the core friction between their elemental and archetypal energies, taking into account WHAT THEY'RE WORKING WITH (pattern, value, agency) when available. Be honest, not softened. 2-3 sentences.

Return ONLY valid JSON, no markdown:
{
  "challenge": {
    "title": "The Tension You Must Navigate",
    "content": "[2-3 sentences: the core friction — honest, specific to this pairing]"
  }
}`

    const previewJsonSchema = {
      type: 'object',
      properties: {
        challenge: {
          type: 'object',
          properties: {
            title:   { type: 'string' },
            content: { type: 'string' },
          },
          required: ['title', 'content'],
        },
      },
      required: ['challenge'],
    } as const

    const previewMessage = await withAiRetry('generate-compatibility-preview', () =>
      client.messages.parse({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: `You are writing the tension section of a compatibility reading. Be grounded and precise. Every sentence must be specific to this exact pairing. Write at B2 English level. Short sentences. No cultural idioms.`,
        messages: [{ role: 'user', content: previewPrompt }],
        output_config: { format: jsonSchemaOutputFormat(previewJsonSchema) },
      })
    )

    const previewRawParsed = previewMessage.parsed_output

    if (!previewRawParsed) {
      const firstContent = previewMessage.content[0]
      const rawText = firstContent?.type === 'text' ? firstContent.text : ''
      console.error('[generate-compatibility] Preview structured output returned null parsed_output', {
        endpoint: 'generate-compatibility-preview',
        timestamp: new Date().toISOString(),
        rawResponsePreview: (rawText || '').slice(0, 500),
        archetype,
        language,
      })
      throw createError({ statusCode: 500, message: 'Failed to parse compatibility preview' })
    }

    const previewZodResult = PreviewCompatibilitySchema.safeParse(previewRawParsed)
    if (!previewZodResult.success) {
      console.error('[generate-compatibility] Preview schema validation failed', {
        endpoint: 'generate-compatibility-preview',
        timestamp: new Date().toISOString(),
        zodErrors: previewZodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        archetype,
        language,
      })
      throw createError({ statusCode: 500, message: 'Failed to parse compatibility preview' })
    }

    const challengeSection = previewZodResult.data.challenge

    return {
      success: true,
      compatibility: {
        compatibilityScore,
        compatibilityTitle,
        sections: {
          bond:          { title: 'The Bond That Holds You Together',      content: '[locked]' },
          strength:      { title: 'Your Greatest Strength Together',       content: '[locked]' },
          challenge:     challengeSection,
          communication: { title: 'The Communication Pattern',             content: '[locked]' },
          powerDynamic:  { title: 'The Power Dynamic',                     content: '[locked]' },
          forecast:      { title: 'The Next 7 Days',                       content: '[locked]' },
          advice:        { title: 'The One Move That Changes Everything',   content: '[locked]' },
        },
        previewMode: true,
      },
    }
    } // end premium preview branch
  }

  // ── FULL PATH (post-payment) ───────────────────────────────────────────────
  // Generates all 7 sections. Only reached when previewMode === false.
  // Score and title are computed deterministically (same functions as preview path)
  // so users see identical values before and after payment.

  const compatibilityScore = computeCompatibilityScore(lifePathNumber, partnerLifePath, element || 'Unknown', partnerElement)
  const compatibilityTitle = computeCompatibilityTitle(archetype, partnerSunSign.name, element || 'Unknown', partnerElement)

  const todayDate  = new Date().toISOString().split('T')[0]!
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const forecastEndDate = sevenDaysFromNow.toISOString().split('T')[0]!

  const currentTransits  = getPlanetaryTransits(todayDate)
  const forecastTransits = getPlanetaryTransits(forecastEndDate)

  const fullPrompt = `${langInstruction}

You are OMENORA, an AI destiny analysis system. Generate a 7-section compatibility report between two people.
Be specific, poetic, and personal. Reference their actual names, archetypes, life paths, and elements throughout.
Never be generic. Write in second person to ${firstName || 'the user'}.

Person 1 (the user):
- Name: ${firstName || '(not provided — address as "you")'}
- Archetype: ${archetype}
- Element: ${element}
- Life Path: ${lifePathNumber}
- Traits: ${powerTraits?.join(', ') || 'not provided'}

Person 2 (their person):
- Name: ${partnerName || '(not provided — refer to as "your partner")'}
- Born: ${partnerSeason} season
- Element: ${partnerElement}
- Life Path: ${partnerLifePath}
- Sun sign: ${partnerSunSign.name}
- City: ${partnerCity}

ELEMENTAL SYNASTRY:
${elementNote}

NUMEROLOGY:
${lifePathNote}

CURRENT PLANETARY WINDOW (${todayDate} – ${forecastEndDate}):
- Sun: ${currentTransits.sun.sign} ${currentTransits.sun.degree}° → ${forecastTransits.sun.sign} ${forecastTransits.sun.degree}°
- Moon: ${currentTransits.moon.sign} ${currentTransits.moon.degree}° → ${forecastTransits.moon.sign} ${forecastTransits.moon.degree}° (${currentTransits.moonPhaseName})
- Mercury: ${currentTransits.mercury.sign} ${currentTransits.mercury.degree}° → ${forecastTransits.mercury.sign} ${forecastTransits.mercury.degree}°
- Venus: ${currentTransits.venus.sign} ${currentTransits.venus.degree}° → ${forecastTransits.venus.sign} ${forecastTransits.venus.degree}°
- Mars: ${currentTransits.mars.sign} ${currentTransits.mars.degree}° → ${forecastTransits.mars.sign} ${forecastTransits.mars.degree}°

PRE-COMPUTED VALUES (do not change these — write sections that match this framing):
- Compatibility Score: ${compatibilityScore}
- Compatibility Title: ${compatibilityTitle}

Generate exactly 7 sections. Each section MUST be specific to this exact pairing — never a generic template.
The title above frames the dynamic — write sections that are tonally consistent with it.

Return ONLY valid JSON, no markdown:
{
  "sections": {
    "bond": {
      "title": "The Bond That Holds You Together",
      "content": "[3-4 sentences: SENTENCE 1 = why these two connect at a fundamental level — specific to their archetypes and elements. SENTENCE 2 = naturally weave in the rarity framing (translate the rarity context into editorial language — do NOT use the exact phrase 'one of 16 possible combinations'; say something like 'their pairing is uncommon in its specific texture' or similar). REMAINING SENTENCES = continue the bond narrative grounded in their actual chart data.]"
    },
    "strength": {
      "title": "Your Greatest Strength Together",
      "content": "[2-3 sentences: the specific advantage this pairing creates that neither person has alone. Ground the strength specifically in HOW PERSON 1 SHOWS UP IN CONNECTION and WHAT THEY'RE WORKING WITH when those blocks are present. Do not list quiz answers; weave them naturally.]"
    },
    "challenge": {
      "title": "The Tension You Must Navigate",
      "content": "[2-3 sentences: the core friction between their elemental and archetypal energies — honest, not softened]"
    },
    "communication": {
      "title": "The Communication Pattern",
      "content": "[3 sentences: how these two people talk, process conflict, and repair — what works, what breaks down, what heals it. Ground in Mercury position and their elements. Reference HOW PERSON 1 SHOWS UP IN CONNECTION (Person 1's communication and conflict style) when available. If that block is absent, fall back to archetype + element + Mercury position only.]"
    },
    "powerDynamic": {
      "title": "The Power Dynamic",
      "content": "[3 sentences: who leads, who follows, where the balance tips and why — be precise, name the archetype that tends to dominate and in which situations]"
    },
    "forecast": {
      "title": "The Next 7 Days",
      "content": "[3 sentences: use the actual planetary window above to describe what this specific couple will feel in the coming week. Name the planets and signs explicitly. Be a real forecast, not generic.]"
    },
    "advice": {
      "title": "The One Move That Changes Everything",
      "content": "[1-2 sentences: one concrete, specific action that fits Person 1's stated need (WHY THEY'RE HERE — what would help them most) and respects their stated agency frame (WHAT THEY'RE WORKING WITH — how they currently feel about agency). The action must be rooted in both charts AND match their stated need. Do NOT give generic relationship advice. If the WHY THEY'RE HERE block is absent, fall back to a chart-grounded action without reference to stated need.]"
    }
  }
}`

  const compatibilityJsonSchema = {
    type: 'object',
    properties: {
      sections: {
        type: 'object',
        properties: {
          bond:          { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          strength:      { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          challenge:     { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          communication: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          powerDynamic:  { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          forecast:      { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
          advice:        { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
        },
        required: ['bond', 'strength', 'challenge', 'communication', 'powerDynamic', 'forecast', 'advice'],
      },
    },
    required: ['sections'],
  } as const

  const message = await withAiRetry('generate-compatibility', () =>
    client.messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `You are writing a personal relationship compatibility reading between two specific people. Your analysis is grounded, honest, and precise. You name real dynamics — not flattering generalities. Every sentence must be specific to these two people's actual combination. Write at B2 English level. Short sentences. No cultural idioms. Make the reader feel their relationship has just been seen clearly for the first time.`,
      messages: [{ role: 'user', content: fullPrompt }],
      output_config: { format: jsonSchemaOutputFormat(compatibilityJsonSchema) },
    })
  )

  const rawParsed = message.parsed_output

  if (!rawParsed) {
    const firstContent = message.content[0]
    const rawText = firstContent?.type === 'text' ? firstContent.text : ''
    console.error('[generate-compatibility] Structured output returned null parsed_output', {
      endpoint: 'generate-compatibility',
      timestamp: new Date().toISOString(),
      rawResponsePreview: (rawText || '').slice(0, 500),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to parse compatibility report' })
  }

  const zodResult = CompatibilitySectionsSchema.safeParse(rawParsed)
  if (!zodResult.success) {
    console.error('[generate-compatibility] Schema validation failed after structured output', {
      endpoint: 'generate-compatibility',
      timestamp: new Date().toISOString(),
      zodErrors: zodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      archetype,
      firstName,
      language,
    })
    throw createError({ statusCode: 500, message: 'Failed to parse compatibility report' })
  }

  const sectionsData = zodResult.data.sections

  // ── Calculation receipt ───────────────────────────────────────────────────

  const person1SunSign = person1Dob && isValidDateOfBirth(person1Dob)
    ? getSunSign(person1Dob)
    : null

  const calculationReceipt: CompatibilityReceiptType = {
    person1: {
      name:           firstName,
      dateOfBirth:    person1Dob,
      sunSign:        person1SunSign?.name ?? '',
      element:        element || person1SunSign?.element || '',
      lifePathNumber: lifePathNumber,
      archetype:      archetype,
    },
    person2: {
      name:           partnerName,
      dateOfBirth:    partnerDob,
      sunSign:        partnerSunSign.name,
      element:        partnerElement,
      lifePathNumber: partnerLifePath,
    },
    synastryNotes: [
      elementNote,
      lifePathNote,
    ],
    tradition:         'Western (Tropical)',
    calculationSource: 'Swiss Ephemeris',
    generatedAt:       new Date().toISOString(),
  }

  let usagePayload: Record<string, unknown>
  if (ctx.source === 'premium') {
    await incrementUsage(ctx.userId, ctx.feature, ctx.period)
    usagePayload = { source: 'premium', count: ctx.count + 1, cap: ctx.cap, period: ctx.period, resets_at: ctx.resetsAt }
  }
  else {
    const newBalance = await consumeCredit(ctx.userId, 'compat')
    usagePayload = { source: 'credit', credit_balance_remaining: newBalance }
  }

  return {
    success: true,
    compatibility: {
      compatibilityScore,
      compatibilityTitle,
      sections: sectionsData,
      calculationReceipt,
    },
    usage: usagePayload,
  }
})
