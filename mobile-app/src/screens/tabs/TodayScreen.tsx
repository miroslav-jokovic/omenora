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
import { MessageCircle, BookOpen, X, Heart, Calendar } from 'lucide-react-native'
import { Text, Button, DimensionIcon } from '../../components/atoms'
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
import { tokens, space, layout, radius } from '../../design/tokens'
import type { TodayScreenProps } from '../../navigation/types'
import { track } from '../../lib/analytics'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function TodayScreen({ navigation }: TodayScreenProps) {
  const { firstName, archetype, sunSign, languageOverride, hasSeenTodayIntro, setHasSeenTodayIntro, premiumTeaserDismissedAt, setPremiumTeaserDismissedAt } = useProfileStore()
  const { displayName } = useAuth()
  const { isPremium, presentPaywall } = usePurchases()

  const [data, setData]           = useState<GetDailyCacheResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const [storeHydrated, setStoreHydrated] = useState(false)

  useEffect(() => { track('today_opened') }, [])

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
    // Return only the user's own archetype content. If it is missing/unmatched
    // (e.g. no profile yet), return null and let the empty/error state render —
    // never fall back to a different archetype's reading. (UX-13)
    return data.archetypes[key] ?? null
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

  const showReturningTeaser =
    storeHydrated && !isPremium && hasSeenTodayIntro &&
    (premiumTeaserDismissedAt === null || Date.now() - premiumTeaserDismissedAt > SEVEN_DAYS_MS)

  useEffect(() => {
    if (showReturningTeaser) track('today_premium_teaser_shown')
  }, [showReturningTeaser])

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

        {/* ── 1b. Unlock pill — persistent re-entry for free users (W5) ─── */}
        {storeHydrated && !isPremium && (
          <Pressable
            onPress={() => {
              track('premium_teaser_opened', { source: 'today_header_pill' })
              navigation.navigate('PremiumTeaser')
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={archetype ? `Unlock ${archetype.charAt(0).toUpperCase()}${archetype.slice(1)}` : 'Unlock Premium'}
            style={styles.unlockPillWrapper}
          >
            <View style={styles.unlockPill}>
              <Text variant="micro" style={styles.unlockPillText}>
                {archetype ? `UNLOCK ${archetype.toUpperCase()}` : 'UNLOCK PREMIUM'}
              </Text>
            </View>
          </Pressable>
        )}

        {/* ── 2. Archetype insight — borderless, continuation of hero ──── */}
        <View style={styles.insightBlock}>
          <Text variant="caption" color="tertiary" style={[styles.sectionLabel, { textTransform: 'uppercase' }]}>
            {archetypeContent.theme}
          </Text>
          <Text variant="body" color="primary">
            {insightP1}
          </Text>
          {!isPremium && (
            <Text variant="micro" color="tertiary" style={styles.freeTag}>
              Your free reading for today
            </Text>
          )}
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

        {/* ── 6c. Returning-free-user premium teaser — frequency-capped (MC-2) ─── */}
        {showReturningTeaser && (
          <Card variant="glass" padding="default">
            <View style={styles.introHeader}>
              <Text variant="eyebrow" color="secondary">Your full chart awaits</Text>
              <Pressable
                onPress={() => setPremiumTeaserDismissedAt(Date.now())}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Dismiss"
                accessibilityRole="button"
              >
                <X size={18} color={tokens.text.tertiary} />
              </Pressable>
            </View>
            <Text variant="caption" color="secondary" style={styles.introBody}>
              Your full archetype portrait, every planet in your natal chart, your 90-day forecast, daily guidance written for your chart — and Counsel, your AI astrologer, on call.
            </Text>
            <Button
              label="Unlock Premium"
              variant="cta"
              fullWidth
              onPress={async () => { await presentPaywall('today_returning_user') }}
              style={styles.teaserCta}
            />
          </Card>
        )}

        {/* ── 7. Deeper insight — LockedCard for free users ─── */}
        {!isPremium && (
          <LockedCard
            placement="feature_archetype_today"
            title="Your Full Daily Reading"
            description="Today's full reading: the cosmic stage you're moving through, a reflection written for your archetype, and the planetary weather shaping your day."
            onUnlockPress={async () => { await presentPaywall('today_full_reading') }}
          />
        )}

        {/* ── 8. Today's Dimensions — LockedCard for free users (only if zodiac) ── */}
        {!isPremium && zodiacContent != null && (
          <LockedCard
            placement="feature_dimensions_today"
            title="Today's Life Dimensions"
            description="How today lands for your Love, Work, and Health — guidance for each, read from your chart and today's transits."
            onUnlockPress={async () => { await presentPaywall('today_dimensions') }}
          />
        )}
        {/* ── 8b. Calendar teaser — W4 funnel card (all free users) ─── */}
        {!isPremium && (
          <LockedCard
            placement="funnel_calendar_today"
            title="2026 Lucky Timing Calendar"
            description="Auspicious dates for love, work, money, and major decisions — all 12 months."
            ctaLabel="View Calendar"
            onUnlockPress={() => navigation.navigate('Calendar')}
          />
        )}

        {/* ── 9. Explore — surface the paid funnels for free users (MC-3) ─── */}
        {!isPremium && (
          <Card variant="content" padding="compact">
            <Text variant="micro" color="tertiary" style={styles.sectionLabel}>Explore</Text>
            <ListItem
              label="Compatibility"
              meta="See how your chart connects with someone"
              icon={Heart}
              showChevron
              onPress={() => { track('explore_tapped', { feature: 'compatibility' }); navigation.navigate('Compatibility') }}
            />
            <ListItem
              label="Lucky Timing Calendar"
              meta="Your luckiest dates in 2026"
              icon={Calendar}
              showChevron
              onPress={() => { track('explore_tapped', { feature: 'calendar' }); navigation.navigate('Calendar') }}
            />
          </Card>
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
  freeTag: {
    marginTop: space['2'],
  },
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
  teaserCta: {
    marginTop: space['4'],
  },
  unlockPillWrapper: {
    alignSelf: 'center',
    minHeight: layout.tapTarget,
    justifyContent: 'center',
  },
  unlockPill: {
    borderWidth: 1,
    borderColor: tokens.border.accent,
    borderRadius: radius.pill,
    paddingHorizontal: space['3'],
    paddingVertical: space['1.5'],
  },
  unlockPillText: {
    color: tokens.accent.emphasis,
  },
})
