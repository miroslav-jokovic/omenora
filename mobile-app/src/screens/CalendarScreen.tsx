import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ScrollView, View, Pressable, ActivityIndicator, Alert, Dimensions, StyleSheet } from 'react-native'
import { X, AlertTriangle } from 'lucide-react-native'
import { Text, Button, Chip } from '../components/atoms'
import { Card, LockedCard, Header, BottomSheet } from '../components/organisms'
import { ScreenWrapper, ErrorState } from '../components/templates'
import { CalendarIAPSheet, Toast } from '../components/molecules'
import { useProfileStore } from '../stores/profileStore'
import { usePurchases } from '../context/usePurchases'
import api from '../api/endpoints'
import { tokens, space, layout, radius } from '../design/tokens'
import type { CalendarScreenProps } from '../navigation/types'
import { remapAnswersForBackend } from '../utils/answers'
import type { CalendarData, CalendarMonth } from '../types/calendar'

// ── Module-level constants ────────────────────────────────────────────────────

const SHEET_HEIGHT  = Math.round(Dimensions.get('window').height * 0.75)

// ── State machine ─────────────────────────────────────────────────────────────

type ScreenState =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'result'; data: CalendarData }
  | { kind: 'error'; message: string }

// ── Month detail (rendered inside BottomSheet) ────────────────────────────────

function MonthDetail({ month, onClose }: { month: CalendarMonth; onClose: () => void }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
      <View style={detail.header}>
        <Text variant="display2" style={detail.monthName}>{month.month}</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <X size={24} color={tokens.text.secondary} />
        </Pressable>
      </View>

      <Text variant="micro" style={detail.label}>THEME</Text>
      <Text variant="body" style={detail.value}>{month.theme}</Text>

      <View style={detail.energyRow}>
        <Text variant="micro" style={detail.label}>ENERGY</Text>
        <View style={detail.energyBarWrap}>
          <View
            style={[
              detail.energyBarFill,
              { width: `${month.energyLevel}%`, backgroundColor: month.color },
            ]}
          />
        </View>
      </View>

      <Card variant="default" padding="compact" style={detail.dimCard}>
        <Text variant="micro" style={detail.label}>LOVE</Text>
        <Text variant="body" style={detail.cardBody}>{month.love}</Text>
      </Card>
      <Card variant="default" padding="compact" style={detail.dimCard}>
        <Text variant="micro" style={detail.label}>MONEY</Text>
        <Text variant="body" style={detail.cardBody}>{month.money}</Text>
      </Card>
      <Card variant="default" padding="compact" style={detail.dimCard}>
        <Text variant="micro" style={detail.label}>CAREER</Text>
        <Text variant="body" style={detail.cardBody}>{month.career}</Text>
      </Card>

      {month.warning != null && (
        <Card variant="default" padding="compact" style={detail.warningCard}>
          <View style={detail.warningHeader}>
            <AlertTriangle size={14} color={tokens.state.warning} />
            <Text variant="micro" style={[detail.label, detail.warningLabel]}>WARNING</Text>
          </View>
          <Text variant="body" style={detail.warningBody}>{month.warning}</Text>
        </Card>
      )}

      <Text variant="micro" style={[detail.label, detail.luckyLabel]}>LUCKY DAYS</Text>
      <View style={detail.luckyDaysRow}>
        {month.luckyDays.map((day) => (
          <Chip key={day} variant="label" label={String(day)} />
        ))}
      </View>
    </ScrollView>
  )
}

const detail = StyleSheet.create({
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space['3'] },
  monthName:    { color: tokens.text.primary },
  label:        { color: tokens.text.accent, marginBottom: space['1'] },
  value:        { color: tokens.text.secondary, marginBottom: space['4'] },
  energyRow:    { marginBottom: space['4'] },
  energyBarWrap: {
    height:          6,
    backgroundColor: tokens.surface.overlay,
    borderRadius:    radius.xs,
    overflow:        'hidden',
  },
  energyBarFill: {
    height:       '100%',
    borderRadius: radius.xs,
  },
  dimCard:       { marginBottom: space['2'] },
  cardBody:      { color: tokens.text.secondary },
  warningCard:   { marginBottom: space['2'] },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: space['1'], marginBottom: space['1'] },
  warningLabel:  { color: tokens.state.warning },
  warningBody:   { color: tokens.state.warning },
  luckyLabel:    { marginTop: space['2'] },
  luckyDaysRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
})

// ── Component ─────────────────────────────────────────────────────────────────

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const firstName        = useProfileStore((s) => s.firstName)
  const dateOfBirth      = useProfileStore((s) => s.dateOfBirth)
  const lifePathNumber   = useProfileStore((s) => s.lifePathNumber)
  const archetype        = useProfileStore((s) => s.archetype)
  const languageOverride = useProfileStore((s) => s.languageOverride)
  const report           = useProfileStore((s) => s.report)
  const answers          = useProfileStore((s) => s.answers)
  const calendarData     = useProfileStore((s) => s.calendarData)
  const setCalendarData  = useProfileStore((s) => s.setCalendarData)

  const { hasCalendar } = usePurchases()

  const [iapSheetVisible, setIapSheetVisible] = useState(false)
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const prevHasCalendar   = useRef(hasCalendar)
  const sheetWasOpen      = useRef(false)

  useEffect(() => {
    if (!prevHasCalendar.current && hasCalendar && sheetWasOpen.current) {
      setToast({ visible: true, message: 'Purchases restored' })
    }
    prevHasCalendar.current = hasCalendar
  }, [hasCalendar])

  const [state, setState] = useState<ScreenState>(
    // TODO: v1.1 — detect calendar.year mismatch vs current year and prompt
    // regeneration instead of using potentially stale cached data.
    calendarData != null ? { kind: 'result', data: calendarData } : { kind: 'initial' }
  )
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const expandedMonthData = useMemo<CalendarMonth | null>(() => {
    if (state.kind !== 'result' || expandedMonth === null) return null
    return state.data.months.find((m) => m.number === expandedMonth) ?? null
  }, [state, expandedMonth])

  const handleGenerate = useCallback(async () => {
    if (!firstName || !archetype || !report?.element || lifePathNumber === null || !dateOfBirth) {
      setState({ kind: 'error', message: 'Complete your profile first to generate a calendar.' })
      return
    }

    setExpandedMonth(null)
    setState({ kind: 'loading' })

    try {
      const response = await api.generateCalendar({
        firstName,
        archetype,
        element:        report.element,
        lifePathNumber,
        dateOfBirth,
        language:       languageOverride ?? 'en',
        answers: remapAnswersForBackend(answers ?? {}),
      })

      if (response.success && response.calendar) {
        setCalendarData(response.calendar)
        setState({ kind: 'result', data: response.calendar })
      } else {
        setState({ kind: 'error', message: 'Something went wrong. Please try again.' })
      }
    } catch (err: unknown) {
      const status   = (err as { response?: { status?: number } })?.response?.status
      const errorKey = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (status === 429 || errorKey === 'monthly_limit_reached') {
        setState({ kind: 'error', message: "You've reached your monthly calendar limit. Resets next month." })
      } else if (status === 403 || errorKey === 'subscription_required') {
        setState({ kind: 'error', message: 'Calendar requires Premium. Tap below to unlock.' })
      } else {
        setState({ kind: 'error', message: "Couldn't generate the calendar. Please try again." })
      }
    }
  }, [firstName, archetype, report, lifePathNumber, dateOfBirth, languageOverride, answers, setCalendarData])

  const handleUnlockPress = useCallback(() => {
    sheetWasOpen.current = true
    setIapSheetVisible(true)
  }, [])

  const handleRegeneratePress = useCallback(() => {
    Alert.alert(
      'Regenerate calendar?',
      'Your current calendar will be replaced.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: handleGenerate },
      ]
    )
  }, [handleGenerate])

  return (
    <View style={styles.root}>
      <ScreenWrapper scroll={false} padded={false} background="base">
        <Header title="Lucky Timing 2026" onBack={() => navigation.goBack()} />

        {state.kind === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={tokens.accent.primary} />
            <Text variant="body" style={styles.loadingText}>Mapping 2026 for you…</Text>
            <Text variant="caption" style={styles.loadingHint}>
              Reading planetary alignments through the year.
            </Text>
          </View>

        ) : state.kind === 'error' ? (
          <ErrorState
            heading="Couldn't generate the calendar"
            body={state.message}
            actionLabel="Try again"
            onActionPress={() => setState({ kind: 'initial' })}
          />

        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="body" style={styles.intro}>
              See the energy of every month in 2026 — when to push, when to pause,{' '}
              when luck favors you.
            </Text>

            {state.kind === 'result' ? (
              <>
                <Card variant="premium" padding="premium">
                  <Text variant="heading2" style={styles.themeHeading}>
                    {state.data.overallTheme}
                  </Text>
                  <View style={styles.themeMeta}>
                    <Text variant="caption" style={styles.peakText}>
                      Peak months: {state.data.peakMonths.join(', ')}
                    </Text>
                    <Text variant="caption" style={styles.cautionText}>
                      Caution months: {state.data.cautionMonths.join(', ')}
                    </Text>
                  </View>
                </Card>

                <View style={styles.grid}>
                  {state.data.months.map((month) => (
                    <Pressable
                      key={month.number}
                      style={({ pressed }) => [styles.cellWrap, pressed && styles.cellPressed]}
                      onPress={() => setExpandedMonth(month.number)}
                    >
                      <Card variant="default" padding="compact" style={styles.cell}>
                        <View style={styles.cellTop}>
                          <Text variant="micro" style={styles.cellMonth}>
                            {month.month.slice(0, 3).toUpperCase()}
                          </Text>
                          {month.warning != null && (
                            <AlertTriangle size={10} color={tokens.state.warning} />
                          )}
                        </View>
                        <View style={styles.energyTrack}>
                          <View
                            style={[
                              styles.energyFill,
                              { width: `${month.energyLevel}%`, backgroundColor: month.color },
                            ]}
                          />
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>

                <Button
                  label="Regenerate calendar"
                  variant="secondary"
                  fullWidth
                  onPress={handleRegeneratePress}
                />
                {/* TODO: v1.1 — detect calendar.year mismatch vs current year and
                    prompt regeneration instead of using stale cached data. */}
              </>

            ) : hasCalendar ? (
              <>
                <Button
                  label="Generate your 2026 calendar"
                  variant="primary"
                  fullWidth
                  onPress={handleGenerate}
                />
                <Text variant="caption" style={styles.generateHint}>
                  Takes about 30 seconds. We'll cache the result so you can return anytime.
                </Text>
              </>

            ) : (
              <LockedCard
                placement="feature_calendar"
                title="Your 2026 Lucky Timing"
                description="12 months of peak periods, caution dates, and lucky windows — mapped to your personal chart."
                onUnlockPress={handleUnlockPress}
              />
            )}
          </ScrollView>
        )}
      </ScreenWrapper>

      <BottomSheet
        visible={expandedMonth !== null}
        onClose={() => setExpandedMonth(null)}
        height={SHEET_HEIGHT}
      >
        {expandedMonthData != null && (
          <MonthDetail month={expandedMonthData} onClose={() => setExpandedMonth(null)} />
        )}
      </BottomSheet>
      <CalendarIAPSheet
        visible={iapSheetVisible}
        onDismiss={() => {
          sheetWasOpen.current = false
          setIapSheetVisible(false)
        }}
        onPurchaseSuccess={() => {
          setToast({ visible: true, message: '2026 Calendar unlocked' })
        }}
      />
      <Toast
        variant="success"
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['4'],
    paddingBottom:     space['8'],
    gap:               space['4'],
  },
  intro:        { color: tokens.text.secondary },
  centered: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPadding,
    gap:               space['4'],
  },
  loadingText:  { color: tokens.text.secondary, textAlign: 'center' },
  loadingHint:  { color: tokens.text.tertiary,  textAlign: 'center' },
  generateHint: { color: tokens.text.tertiary,  textAlign: 'center' },
  themeHeading: { color: tokens.text.primary },
  themeMeta:    { gap: space['1'], marginTop: space['2'] },
  peakText:     { color: tokens.text.accent },
  cautionText:  { color: tokens.state.warning },
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    rowGap:         space['2'],
  },
  cellWrap:    { width: '31.5%' },
  cellPressed: { opacity: 0.7 },
  cell:        { gap: space['1'] },
  cellTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  cellMonth:   { color: tokens.text.secondary },
  energyTrack: {
    height:          4,
    backgroundColor: tokens.surface.overlay,
    borderRadius:    radius.xs,
    overflow:        'hidden',
  },
  energyFill: {
    height:       '100%',
    borderRadius: radius.xs,
  },
})
