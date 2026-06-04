import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MessageCircle, BookOpen, X } from 'lucide-react-native'
import { Text, DimensionIcon } from '../../components/atoms'
import { Card, LockedCard } from '../../components/organisms'
import MoonPhaseHero from '../../components/hero/MoonPhaseHero'
import { AtmosphericBackground } from '../../components/atmosphere'
import { ErrorState } from '../../components/templates/ErrorState'
import { ListItem } from '../../components/molecules'
import { useProfileStore } from '../../stores/profileStore'
import { useAuth } from '../../context/useAuth'
import { usePurchases } from '../../context/usePurchases'
import api from '../../api/endpoints'
import type { GetDailyCacheResponse } from '../../api/endpoints'
import { tokens, space, layout } from '../../design/tokens'
import type { TodayScreenProps } from '../../navigation/types'

export default function TodayScreen({ navigation }: TodayScreenProps) {
  const { firstName, archetype, sunSign, languageOverride, hasSeenTodayIntro, setHasSeenTodayIntro } = useProfileStore()
  const { displayName } = useAuth()
  const { isPremium, presentPaywall } = usePurchases()

  const [data, setData]           = useState<GetDailyCacheResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const [storeHydrated, setStoreHydrated] = useState(false)

  const today = useMemo(() => new Date(), [])

  const greeting = useMemo(() => {
    const hour = today.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [today])

  // Use profileStore.firstName first (already in memory), then fall back to
  // displayName from auth context which covers provider metadata until the
  // server profile hydration completes after a re-authentication.
  const nameForGreeting = firstName || displayName
  const greetingLine = nameForGreeting ? `${greeting}, ${nameForGreeting}` : greeting

  const formattedDate = useMemo(() =>
    today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [today]
  )

  const fetchDailyCache = useCallback(async (isRefresh = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const dateStr = today.toISOString().split('T')[0]
      const response = await api.getDailyCache({
        date:     dateStr,
        language: languageOverride ?? 'en',
      })
      if (!controller.signal.aborted) {
        setData(response)
      }
    } catch (err: any) {
      if (controller.signal.aborted) return
      setError(err?.message ?? "Could not load today's reading")
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [languageOverride, today])

  useEffect(() => {
    fetchDailyCache()
    return () => { abortRef.current?.abort() }
  }, [fetchDailyCache])

  useEffect(() => {
    if (useProfileStore.persist.hasHydrated()) {
      setStoreHydrated(true)
      return
    }
    const unsub = useProfileStore.persist.onFinishHydration(() => setStoreHydrated(true))
    return unsub
  }, [])

  // ── Content selection ──────────────────────────────────────────────────────
  const archetypeContent = useMemo(() => {
    if (!data?.archetypes) return null
    const key = archetype?.toLowerCase() ?? ''
    if (data.archetypes[key]) return data.archetypes[key]
    const keys = Object.keys(data.archetypes)
    if (keys.length > 0) {
      console.warn(`[TodayScreen] archetype '${key}' not in cache — falling back to '${keys[0]}'`)
      return data.archetypes[keys[0]]
    }
    return null
  }, [data, archetype])

  const zodiacContent = useMemo(() => {
    if (!data?.zodiac) return null
    const key = sunSign?.toLowerCase() ?? ''
    return data.zodiac[key] ?? null
  }, [data, sunSign])

  // ── Paragraph split ────────────────────────────────────────────────────────
  const insightParagraphs = useMemo(
    () => (archetypeContent?.insight ?? '').split('\n\n'),
    [archetypeContent]
  )
  const insightP1 = insightParagraphs[0] ?? ''

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.root}>
        <AtmosphericBackground variant="standard" />
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator color={tokens.accent.primary} size="large" />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ── Error / missing content state ──────────────────────────────────────────
  if (error || !archetypeContent) {
    return (
      <View style={styles.root}>
        <AtmosphericBackground variant="standard" />
        <SafeAreaView edges={['top']} style={styles.safe}>
          <ErrorState
            heading="Couldn't load today"
            body={error ?? undefined}
            actionLabel="Try again"
            onActionPress={() => fetchDailyCache()}
          />
        </SafeAreaView>
      </View>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <AtmosphericBackground variant="standard" />
      <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDailyCache(true)}
            tintColor={tokens.accent.primary}
          />
        }
      >
        {/* ── 1. Hero — moon phase atmospheric image + greeting ──── */}
        <MoonPhaseHero
          moonPhase={archetypeContent.moon_phase && archetypeContent.moon_phase.length > 0 ? archetypeContent.moon_phase : 'New Moon'}
          archetypeName={archetype ?? ''}
          signName={sunSign}
          greeting={greetingLine}
          formattedDate={formattedDate}
          style={{ marginHorizontal: -layout.screenPadding }}
        />

        {/* ── 2. Archetype insight — borderless, continuation of hero ──── */}
        <View style={styles.insightBlock}>
          <Text variant="caption" color="tertiary" style={[styles.sectionLabel, { textTransform: 'uppercase' }]}>
            {archetypeContent.theme}
          </Text>
          <Text variant="body" color="primary">
            {insightP1}
          </Text>
        </View>

        {/* ── 3. Dimension cards — Love, Work, Health (zodiac only) — PREMIUM ── */}
        {isPremium && zodiacContent != null && (
          <>
            <Card variant="content" padding="default">
              <View style={styles.dimensionRow}>
                <DimensionIcon dimension="love" size={48} />
                <View style={styles.dimensionContent}>
                  <Text variant="caption" color="tertiary" style={styles.dimensionLabel}>Love</Text>
                  <Text variant="body" color="primary">{zodiacContent.love}</Text>
                </View>
              </View>
            </Card>
            <Card variant="content" padding="default">
              <View style={styles.dimensionRow}>
                <DimensionIcon dimension="work" size={48} />
                <View style={styles.dimensionContent}>
                  <Text variant="caption" color="tertiary" style={styles.dimensionLabel}>Work</Text>
                  <Text variant="body" color="primary">{zodiacContent.job}</Text>
                </View>
              </View>
            </Card>
            <Card variant="content" padding="default">
              <View style={styles.dimensionRow}>
                <DimensionIcon dimension="health" size={48} />
                <View style={styles.dimensionContent}>
                  <Text variant="caption" color="tertiary" style={styles.dimensionLabel}>Health</Text>
                  <Text variant="body" color="primary">{zodiacContent.health}</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ── 4. Reflection Card — PREMIUM ──────────────────────── */}
        {isPremium && (
          <Card variant="content" padding="default">
            <Text variant="micro" color="tertiary" style={styles.sectionLabel}>
              Reflection
            </Text>
            <Text variant="body" color="secondary" style={styles.reflectionText}>
              {archetypeContent.reflection}
            </Text>
          </Card>
        )}

        {/* ── 5. Planetary weather — PREMIUM (only if zodiac available) ─── */}
        {isPremium && zodiacContent != null && (
          <Card variant="content" padding="compact">
            <Text variant="micro" color="tertiary" style={styles.sectionLabel}>
              Today's cosmic stage
            </Text>
            <Text variant="body" color="secondary">
              {zodiacContent.planetary_weather}
            </Text>
          </Card>
        )}

        {/* ── 6. Premium-only CTAs ──────────────────────────── */}
        {isPremium && (
          <Card variant="content" padding="compact">
            <ListItem
              label="Ask Counsel about today"
              icon={MessageCircle}
              showChevron
              onPress={() => navigation.navigate('CounselTab')}
            />
            <ListItem
              label="What's coming next"
              icon={BookOpen}
              showChevron
              onPress={() => navigation.navigate('ReadingsTab')}
            />
          </Card>
        )}

        {/* ── 6b. First-run orientation card — show once for free users ─── */}
        {storeHydrated && !isPremium && !hasSeenTodayIntro && (
          <Card variant="glass" padding="default">
            <View style={styles.introHeader}>
              <Text variant="eyebrow" color="secondary">
                Welcome in{firstName ? `, ${firstName}` : ''}
              </Text>
              <Pressable
                onPress={() => setHasSeenTodayIntro(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Dismiss"
                accessibilityRole="button"
              >
                <X size={18} color={tokens.text.tertiary} />
              </Pressable>
            </View>
            <Text variant="caption" color="secondary" style={styles.introBody}>
              {'Your daily reading above is yours, free, every day. Your full chart — shadow, planets, timing, and guidance for love, work, and health — unlocks with Premium. Tap any locked card below to see what’s inside.'}
            </Text>
          </Card>
        )}

        {/* ── 7. Deeper insight — LockedCard for free users ─── */}
        {!isPremium && (
          <LockedCard
            placement="feature_archetype_today"
            title="Your Full Daily Reading"
            description="Today's full reading: the cosmic stage you're moving through, a reflection written for your archetype, and the planetary weather shaping your day."
            onUnlockPress={async () => { await presentPaywall() }}
          />
        )}

        {/* ── 8. Today's Dimensions — LockedCard for free users (only if zodiac) ── */}
        {!isPremium && zodiacContent != null && (
          <LockedCard
            placement="feature_dimensions_today"
            title="Today's Life Dimensions"
            description="How today lands for your Love, Work, and Health — guidance for each, read from your chart and today's transits."
            onUnlockPress={async () => { await presentPaywall() }}
          />
        )}
      </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: tokens.surface.deep,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom:     space['10'],
    gap:               layout.cardGap,
  },
  dimensionRow: {
    flexDirection: 'row',
    gap:           space['4'],
    alignItems:    'flex-start',
  },
  dimensionContent: {
    flex: 1,
  },
  dimensionLabel: {
    textTransform: 'uppercase' as const,
    marginBottom:  space['1'],
  },
  insightBlock: {},
  sectionLabel: {
    marginBottom: space['2'],
  },
  reflectionText: {
    fontStyle: 'italic',
  },
  introHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  introBody: {
    marginTop: space['3'],
  },
})
