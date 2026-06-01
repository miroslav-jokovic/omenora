import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Chip, Button, ZodiacSymbol } from '../../components/atoms'
import { Card, ReadingCard, TransitCard, SectionHeader, ReadingFeatureCard } from '../../components/organisms'
import ReadingHero from '../../components/hero/ReadingHero'
import { useProfileStore } from '../../stores/profileStore'
import { usePurchases } from '../../context/usePurchases'
import api from '../../api/endpoints'
import type { ArchetypeReading, NatalChartReading, ForecastReading } from '../../api/endpoints'
import { remapAnswersForBackend } from '../../utils/answers'
import { isPastDate } from '../../utils/time'
import { tokens, space, layout } from '../../design/tokens'
import { AtmosphericBackground } from '../../components/atmosphere'
import type { ReadingsScreenProps } from '../../navigation/types'

// ── Section state (discriminated union) ───────────────────────────────────

type SectionState<T> =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'result'; data: T }
  | { kind: 'error'; message: string }

// ── Constants ─────────────────────────────────────────────────────────────

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
}

const ARCHETYPE_SECTIONS = [
  'identity', 'science', 'shadow', 'purpose', 'gift', 'affirmation',
] as const

// ── Component ─────────────────────────────────────────────────────────────

export default function ReadingsScreen({ navigation: _navigation }: ReadingsScreenProps) {
  const firstName        = useProfileStore((s) => s.firstName)
  const dateOfBirth      = useProfileStore((s) => s.dateOfBirth)
  const lifePathNumber   = useProfileStore((s) => s.lifePathNumber)
  const archetype        = useProfileStore((s) => s.archetype)
  const languageOverride = useProfileStore((s) => s.languageOverride)
  const report           = useProfileStore((s) => s.report)
  const answers          = useProfileStore((s) => s.answers)
  const sunSign          = useProfileStore((s) => s.sunSign)
  const moonSign         = useProfileStore((s) => s.moonSign)
  const risingSign       = useProfileStore((s) => s.risingSign)

  const archetypeReading     = useProfileStore((s) => s.archetypeReading)
  const natalChartReading    = useProfileStore((s) => s.natalChartReading)
  const forecastReading      = useProfileStore((s) => s.forecastReading)
  const setArchetypeReading  = useProfileStore((s) => s.setArchetypeReading)
  const setNatalChartReading = useProfileStore((s) => s.setNatalChartReading)
  const setForecastReading   = useProfileStore((s) => s.setForecastReading)

  const { isPremium, presentPaywall } = usePurchases()

  // ── Derived ───────────────────────────────────────────────────────────

  const profileReady = !!firstName && !!archetype && !!report?.element && lifePathNumber !== null && !!dateOfBirth

  const archetypeDisplayName = useMemo(() => {
    if (report?.archetypeName) return report.archetypeName
    if (archetype) return `The ${archetype.charAt(0).toUpperCase() + archetype.slice(1)}`
    return null
  }, [report, archetype])

  const identityTeaser = useMemo(
    () => report?.sections?.identity?.content ?? null,
    [report]
  )

  // ── Section states (initialised from cache) ───────────────────────────

  const [archetypeState,  setArchetypeState]  = useState<SectionState<ArchetypeReading>>(
    archetypeReading  !== null ? { kind: 'result', data: archetypeReading  } : { kind: 'initial' }
  )
  const [natalChartState, setNatalChartState] = useState<SectionState<NatalChartReading>>(
    natalChartReading !== null ? { kind: 'result', data: natalChartReading } : { kind: 'initial' }
  )
  const [forecastState,   setForecastState]   = useState<SectionState<ForecastReading>>(
    forecastReading   !== null ? { kind: 'result', data: forecastReading   } : { kind: 'initial' }
  )

  // Forecast staleness — computed once per render from current state
  const forecastStale   = forecastState.kind === 'result' ? isPastDate(forecastState.data.period.end) : false
  const sortedTransits  = forecastState.kind === 'result'
    ? [...forecastState.data.keyTransits].sort((a, b) => a.date.localeCompare(b.date))
    : []

  // ── Shared request builder ────────────────────────────────────────────

  const buildRequest = useCallback(() => ({
    firstName,
    archetype:      archetype ?? '',
    element:        report?.element ?? '',
    lifePathNumber: lifePathNumber ?? 1,
    dateOfBirth,
    language:       languageOverride ?? 'en',
    powerTraits:    report?.powerTraits ?? [],
    sunSign,
    moonSign,
    risingSign,
    answers:        remapAnswersForBackend(answers ?? {}),
  }), [firstName, archetype, report, lifePathNumber, dateOfBirth, languageOverride, answers, sunSign, moonSign, risingSign])

  // ── Generate handlers ─────────────────────────────────────────────────

  const generateArchetypeReading = useCallback(async () => {
    if (!profileReady) {
      setArchetypeState({ kind: 'error', message: 'Complete your profile to generate this reading.' })
      return
    }
    setArchetypeState({ kind: 'loading' })
    try {
      const response = await api.getArchetypeReading(buildRequest())
      if (response.success && response.reading) {
        setArchetypeReading(response.reading)
        setArchetypeState({ kind: 'result', data: response.reading })
      } else {
        setArchetypeState({ kind: 'error', message: 'Something went wrong. Please try again.' })
      }
    } catch (err: unknown) {
      const status   = (err as { response?: { status?: number } })?.response?.status
      const errorKey = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (status === 429 || errorKey === 'monthly_limit_reached') {
        setArchetypeState({ kind: 'error', message: "You've reached this month's archetype reading limit. Resets next month." })
      } else if (status === 403 || errorKey === 'subscription_required') {
        setArchetypeState({ kind: 'error', message: 'Premium required.' })
      } else {
        setArchetypeState({ kind: 'error', message: "Couldn't generate the reading. Please try again." })
      }
    }
  }, [profileReady, buildRequest, setArchetypeReading])

  const generateNatalChart = useCallback(async () => {
    if (!profileReady) {
      setNatalChartState({ kind: 'error', message: 'Complete your profile to generate this reading.' })
      return
    }
    setNatalChartState({ kind: 'loading' })
    try {
      const response = await api.getNatalChart(buildRequest())
      if (response.success && response.reading) {
        setNatalChartReading(response.reading)
        setNatalChartState({ kind: 'result', data: response.reading })
      } else {
        setNatalChartState({ kind: 'error', message: 'Something went wrong. Please try again.' })
      }
    } catch (err: unknown) {
      const status   = (err as { response?: { status?: number } })?.response?.status
      const errorKey = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (status === 429 || errorKey === 'monthly_limit_reached') {
        setNatalChartState({ kind: 'error', message: "You've reached this month's natal chart limit. Resets next month." })
      } else if (status === 403 || errorKey === 'subscription_required') {
        setNatalChartState({ kind: 'error', message: 'Premium required.' })
      } else {
        setNatalChartState({ kind: 'error', message: "Couldn't generate the reading. Please try again." })
      }
    }
  }, [profileReady, buildRequest, setNatalChartReading])

  const generateForecast = useCallback(async () => {
    if (!profileReady) {
      setForecastState({ kind: 'error', message: 'Complete your profile to generate this reading.' })
      return
    }
    setForecastState({ kind: 'loading' })
    try {
      const response = await api.getForecast(buildRequest())
      if (response.success && response.reading) {
        setForecastReading(response.reading)
        setForecastState({ kind: 'result', data: response.reading })
      } else {
        setForecastState({ kind: 'error', message: 'Something went wrong. Please try again.' })
      }
    } catch (err: unknown) {
      const status   = (err as { response?: { status?: number } })?.response?.status
      const errorKey = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (status === 429 || errorKey === 'monthly_limit_reached') {
        setForecastState({ kind: 'error', message: "You've reached this month's forecast limit. Resets next month." })
      } else if (status === 403 || errorKey === 'subscription_required') {
        setForecastState({ kind: 'error', message: 'Premium required.' })
      } else {
        setForecastState({ kind: 'error', message: "Couldn't generate the forecast. Please try again." })
      }
    }
  }, [profileReady, buildRequest, setForecastReading])

  // ── Regenerate handlers (Alert-confirmed) ────────────────────────────

  const handleRegenerateArchetype = useCallback(() => {
    Alert.alert(
      'Regenerate reading?',
      'Your current archetype reading will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: generateArchetypeReading },
      ]
    )
  }, [generateArchetypeReading])

  const handleRegenerateNatalChart = useCallback(() => {
    Alert.alert(
      'Regenerate reading?',
      'Your current natal chart will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: generateNatalChart },
      ]
    )
  }, [generateNatalChart])

  const handleRegenerateForecast = useCallback(() => {
    Alert.alert(
      'Regenerate forecast?',
      'Your current forecast will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: generateForecast },
      ]
    )
  }, [generateForecast])

  const handleUnlockPress = useCallback(async () => {
    try {
      await presentPaywall()
    } catch (err) {
      console.warn('[ReadingsScreen] presentPaywall threw:', err)
    }
  }, [presentPaywall])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <AtmosphericBackground variant="muted" />
      <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Reading hero — archetype identity anchor ────────── */}
        <ReadingHero
          archetypeKey={archetype}
          archetypeDisplayName={archetypeDisplayName}
          element={report?.element ?? null}
          powerTraits={report?.powerTraits ?? null}
          identityTeaser={identityTeaser}
        />

        {/* ── 2. Big-Three Card ──────────────────────────────────────── */}
        <Card variant="premium" padding="default">
          <Text variant="micro" color="tertiary" style={styles.cardLabel}>Your Chart</Text>
          {[
            { label: 'Sun',    value: sunSign    },
            { label: 'Moon',   value: moonSign   },
            { label: 'Rising', value: risingSign },
          ].map(({ label, value }) => (
            <View key={label} style={styles.bigThreeRow}>
              <ZodiacSymbol sign={value ?? ''} size={28} opacity={0.60} style={styles.glyphContainer} />
              <View style={styles.bigThreeText}>
                <Text variant="caption" color="tertiary">{label}</Text>
                <Text variant="heading2" color="primary">{value ?? '—'}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* ── 4. Full archetype reading — PREMIUM ────────────────────── */}
        <View>
          {isPremium ? (
            <>
              {archetypeState.kind === 'initial' && (
                <Card variant="default" padding="default">
                  <Text variant="body" color="secondary">
                    Your complete psychological framework — how you move through the world, your shadow, your purpose, and your gifts.
                  </Text>
                  <Text variant="caption" color="tertiary" style={styles.capNote}>
                    1 per month · Cached after first generation.
                  </Text>
                  <Button
                    variant="primary"
                    label="Generate Archetype Reading"
                    onPress={generateArchetypeReading}
                    fullWidth
                    style={styles.generateButton}
                  />
                </Card>
              )}
              {archetypeState.kind === 'loading' && (
                <Card variant="default" padding="default">
                  <View style={styles.sectionLoader}>
                    <ActivityIndicator size="small" color={tokens.accent.primary} />
                    <Text variant="caption" color="tertiary" style={styles.loadingText}>
                      Generating your archetype reading…
                    </Text>
                  </View>
                </Card>
              )}
              {archetypeState.kind === 'error' && (
                <Card variant="default" padding="default">
                  <Text variant="body" color="tertiary">{archetypeState.message}</Text>
                  {!archetypeState.message.includes('limit') && !archetypeState.message.includes('required') && (
                    <Text variant="body" color="accent" onPress={generateArchetypeReading} style={styles.retryLink}>
                      Try again.
                    </Text>
                  )}
                </Card>
              )}
              {archetypeState.kind === 'result' && (
                <>
                  <Card variant="default" padding="default">
                    <Text variant="heading2" color="primary" style={styles.readingHero}>
                      {archetypeState.data.archetypeName}
                    </Text>
                    <View style={styles.chipRow}>
                      <Chip variant="label" label={archetypeState.data.element} />
                    </View>
                    <View style={styles.chipRow}>
                      {archetypeState.data.powerTraits.map((trait) => (
                        <Chip key={trait} variant="label" label={trait} />
                      ))}
                    </View>
                  </Card>
                  {ARCHETYPE_SECTIONS.map((key) => {
                    const section = archetypeState.data.sections[key]
                    return (
                      <ReadingCard
                        key={key}
                        title={section.title}
                        body={section.content}
                      />
                    )
                  })}
                  <Button
                    variant="secondary"
                    label="Regenerate"
                    onPress={handleRegenerateArchetype}
                    fullWidth
                    style={styles.regenerateButton}
                  />
                </>
              )}
            </>
          ) : (
            <ReadingFeatureCard
              variant="flagship"
              placement="feature_archetype"
              eyebrow="Full Archetype Reading"
              title="Shadow, gifts, and the patterns that shape your life"
              description="The complete psychological framework of your archetype — how you move through the world, your shadow side, your core gifts, and how you show up in love and work."
              onUnlockPress={handleUnlockPress}
            />
          )}
        </View>

        {/* ── 5. Full natal chart — PREMIUM ──────────────────────────── */}
        <View>
          {isPremium ? (
            <>
              {natalChartState.kind === 'initial' && (
                <Card variant="default" padding="default">
                  <Text variant="body" color="secondary">
                    All 10 planets in your chart — their signs, houses, aspects, and what each placement means for you.
                  </Text>
                  <Text variant="caption" color="tertiary" style={styles.capNote}>
                    1 per month · Cached after first generation.
                  </Text>
                  <Button
                    variant="primary"
                    label="Generate Natal Chart"
                    onPress={generateNatalChart}
                    fullWidth
                    style={styles.generateButton}
                  />
                </Card>
              )}
              {natalChartState.kind === 'loading' && (
                <Card variant="default" padding="default">
                  <View style={styles.sectionLoader}>
                    <ActivityIndicator size="small" color={tokens.accent.primary} />
                    <Text variant="caption" color="tertiary" style={styles.loadingText}>
                      Calculating your natal chart…
                    </Text>
                  </View>
                </Card>
              )}
              {natalChartState.kind === 'error' && (
                <Card variant="default" padding="default">
                  <Text variant="body" color="tertiary">{natalChartState.message}</Text>
                  {!natalChartState.message.includes('limit') && !natalChartState.message.includes('required') && (
                    <Text variant="body" color="accent" onPress={generateNatalChart} style={styles.retryLink}>
                      Try again.
                    </Text>
                  )}
                </Card>
              )}
              {natalChartState.kind === 'result' && (
                <>
                  <Card variant="default" padding="default">
                    <View style={styles.natalHeroRow}>
                      <View style={styles.natalHeroItem}>
                        <Text variant="caption" color="tertiary">Dominant element</Text>
                        <Text variant="heading2" color="primary">
                          {natalChartState.data.dominantElement}
                        </Text>
                      </View>
                      <View style={styles.natalHeroItem}>
                        <Text variant="caption" color="tertiary">Dominant quality</Text>
                        <Text variant="heading2" color="primary">
                          {natalChartState.data.dominantQuality}
                        </Text>
                      </View>
                    </View>
                  </Card>
                  <SectionHeader title="The Big Three" style={styles.subSectionHeader} />
                  {[
                    { key: 'sun',    label: 'Sun',    d: natalChartState.data.bigThree.sun    },
                    { key: 'moon',   label: 'Moon',   d: natalChartState.data.bigThree.moon   },
                    { key: 'rising', label: 'Rising', d: natalChartState.data.bigThree.rising },
                  ].map(({ key, label, d }) => (
                    <ReadingCard
                      key={key}
                      symbol={d.sign}
                      title={label}
                      meta={`${d.sign} · House ${d.house}`}
                      body={d.description}
                    />
                  ))}
                  <SectionHeader title="Planets" style={styles.subSectionHeader} />
                  {natalChartState.data.planets.map((planet) => (
                    <ReadingCard
                      key={planet.planet}
                      symbol={PLANET_GLYPHS[planet.planet] ?? '✦'}
                      title={planet.planet}
                      meta={`${planet.sign} · House ${planet.house}${planet.retrograde ? ' · ℞' : ''}`}
                      body={planet.description}
                    />
                  ))}
                  <SectionHeader title="Aspects" style={styles.subSectionHeader} />
                  {natalChartState.data.aspects.map((aspect, idx) => (
                    <Card key={idx} variant="default" padding="compact" style={styles.aspectCard}>
                      <View style={styles.aspectHeader}>
                        <Text variant="label" color="primary">{aspect.from} → {aspect.to}</Text>
                        <Chip variant="label" label={aspect.type} />
                      </View>
                      <Text variant="body" color="secondary">{aspect.meaning}</Text>
                    </Card>
                  ))}
                  <SectionHeader title="Synthesis" style={styles.subSectionHeader} />
                  <Card variant="premium" padding="default">
                    <Text variant="body" color="secondary">
                      {natalChartState.data.interpretation}
                    </Text>
                  </Card>
                  <Button
                    variant="secondary"
                    label="Regenerate"
                    onPress={handleRegenerateNatalChart}
                    fullWidth
                    style={styles.regenerateButton}
                  />
                </>
              )}
            </>
          ) : (
            <ReadingFeatureCard
              variant="standard"
              placement="feature_natal_chart"
              eyebrow="Complete Natal Chart"
              title="Every planet. Every house. Your full birth chart."
              description="All 10 planets in your chart — their signs, houses, aspects, and what each placement means for you personally."
              onUnlockPress={handleUnlockPress}
            />
          )}
        </View>

        {/* ── 6. 90-day forecast — PREMIUM ───────────────────────────── */}
        <View>
          {isPremium ? (
            <>
              {forecastState.kind === 'initial' && (
                <Card variant="default" padding="default">
                  <Text variant="body" color="secondary">
                    Your 90-day planetary forecast — key transits, monthly themes, and how to move through each phase.
                  </Text>
                  <Text variant="caption" color="tertiary" style={styles.capNote}>
                    4 per month · Cached after first generation.
                  </Text>
                  <Button
                    variant="primary"
                    label="Generate 90-Day Forecast"
                    onPress={generateForecast}
                    fullWidth
                    style={styles.generateButton}
                  />
                </Card>
              )}
              {forecastState.kind === 'loading' && (
                <Card variant="default" padding="default">
                  <View style={styles.sectionLoader}>
                    <ActivityIndicator size="small" color={tokens.accent.primary} />
                    <Text variant="caption" color="tertiary" style={styles.loadingText}>
                      Mapping the next 90 days for you…
                    </Text>
                  </View>
                </Card>
              )}
              {forecastState.kind === 'error' && (
                <Card variant="default" padding="default">
                  <Text variant="body" color="tertiary">{forecastState.message}</Text>
                  {!forecastState.message.includes('limit') && !forecastState.message.includes('required') && (
                    <Text variant="body" color="accent" onPress={generateForecast} style={styles.retryLink}>
                      Try again.
                    </Text>
                  )}
                </Card>
              )}
              {forecastState.kind === 'result' && (
                <>
                  <Card
                    variant="default"
                    padding="compact"
                    style={forecastStale ? { backgroundColor: tokens.specialty.forecastStaleSurface } : undefined}
                  >
                    <Text variant="caption" color={forecastStale ? 'tertiary' : 'secondary'}>
                      {`This forecast covers ${forecastState.data.period.start} – ${forecastState.data.period.end}.`}
                    </Text>
                    {forecastStale && (
                      <Text
                        variant="caption"
                        color="accent"
                        onPress={handleRegenerateForecast}
                        style={styles.staleLink}
                      >
                        Generate a new forecast for the next 90 days.
                      </Text>
                    )}
                  </Card>
                  <Card variant="default" padding="default" style={forecastStale ? styles.staleContent : undefined}>
                    <Text variant="heading2" color="primary">
                      {forecastState.data.overallTheme}
                    </Text>
                  </Card>
                  <SectionHeader title="Key Transits" style={styles.subSectionHeader} />
                  {sortedTransits.map((transit, idx) => (
                    <TransitCard
                      key={idx}
                      symbol={PLANET_GLYPHS[transit.planet] ?? '✦'}
                      title={`${transit.aspect} · ${transit.area}`}
                      body={transit.meaning}
                      timing={transit.date}
                      style={forecastStale ? styles.staleContent : undefined}
                    />
                  ))}
                  <SectionHeader title="Monthly Highlights" style={styles.subSectionHeader} />
                  {forecastState.data.monthlyHighlights.map((highlight, idx) => (
                    <ReadingCard
                      key={idx}
                      title={highlight.month}
                      meta={highlight.theme}
                      body={highlight.caution != null
                        ? `${highlight.opportunity}\n\nCaution: ${highlight.caution}`
                        : highlight.opportunity
                      }
                      style={forecastStale ? styles.staleContent : undefined}
                    />
                  ))}
                  <SectionHeader title="Advice" style={styles.subSectionHeader} />
                  <Card variant="premium" padding="default" style={forecastStale ? styles.staleContent : undefined}>
                    <Text variant="body" color="secondary">
                      {forecastState.data.advice}
                    </Text>
                  </Card>
                  <Button
                    variant="secondary"
                    label="Regenerate"
                    onPress={handleRegenerateForecast}
                    fullWidth
                    style={styles.regenerateButton}
                  />
                </>
              )}
            </>
          ) : (
            /* TODO: swap phoenix glyph for planet composite icon when assets/symbols/planets/ ships in a future cluster */
            <ReadingFeatureCard
              variant="standard"
              placement="feature_forecast"
              eyebrow="90-Day Forecast"
              title="The major themes, transits, and timing ahead"
              description="Month-by-month planetary guidance — key transits, peak periods, and how to move through each phase with your chart in mind."
              onUnlockPress={handleUnlockPress}
            />
          )}
        </View>

        {/*
         * TODO (Phase 5): Daily insight history
         * Depends on daily_user_insights table (not yet created).
         * Will show personalized daily insight streak and history.
         */}

        {/*
         * TODO (Phase 5): Transit timeline
         * Depends on transit calculation backend (not yet built).
         * Will show upcoming planetary transits affecting the user's chart.
         */}
      </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: tokens.surface.base,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['6'],
    paddingBottom:     space['10'],
    gap:               layout.cardGap,
  },
  cardLabel: {
    marginBottom: space['3'],
  },
  bigThreeRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             space['4'],
    paddingVertical: space['2'],
  },
  glyphContainer: {
    width:  28,
    height: 28,
  },
  bigThreeText: {
    flex: 1,
    gap:  space['0.5'],
  },
  capNote: {
    marginTop: space['2'],
  },
  generateButton: {
    marginTop: space['4'],
  },
  sectionLoader: {
    paddingVertical: space['4'],
    alignItems:      'center',
    gap:             space['2'],
  },
  loadingText: {
    textAlign: 'center',
  },
  retryLink: {
    marginTop: space['1'],
  },
  stubText: {
    fontStyle: 'italic',
  },
  readingHero: {
    marginBottom: space['3'],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           space['2'],
    marginTop:     space['2'],
  },
  natalHeroRow: {
    flexDirection: 'row',
    gap:           space['6'],
  },
  natalHeroItem: {
    flex: 1,
    gap:  space['0.5'],
  },
  subSectionHeader: {
    marginTop: space['2'],
  },
  aspectCard: {
    marginBottom: space['1'],
  },
  aspectHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   space['2'],
  },
  staleLink: {
    marginTop: space['1'],
  },
  staleContent: {
    opacity: 0.65,
  },
  regenerateButton: {
    marginTop: space['2'],
  },
})
