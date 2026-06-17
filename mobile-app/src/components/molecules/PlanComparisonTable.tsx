import React, { useState } from 'react'
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native'
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native'
import { Text } from '../atoms'
import { tokens, space } from '../../design/tokens'

// Enable LayoutAnimation on Android (no-op on iOS — it's already enabled)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// Row content verified against server/utils/entitlements.ts:
//   compatibility cap: 10/month  (entitlements.ts line 30)
//   counsel       cap: 30/month  (entitlements.ts line 31)
const ROWS: { label: string; free: boolean; premium: boolean }[] = [
  { label: 'Daily reading & moon phase',                       free: true,  premium: true  },
  { label: 'Love, Work & Health guidance',                     free: false, premium: true  },
  { label: 'Full archetype portrait & natal chart (all 10 planets)', free: false, premium: true  },
  { label: '90-day forecast',                                  free: false, premium: true  },
  { label: 'Counsel — 30 conversations/month',                 free: false, premium: true  },
  { label: 'Compatibility — 10 readings/month',                free: false, premium: true  },
]

const COL_LABEL_FLEX = 2
const COL_TIER_WIDTH = 52

const CheckMark = () => (
  <Check size={16} color={tokens.accent.emphasis} />
)

const Dash = () => (
  <Text variant="caption" color="tertiary" style={styles.dash}>—</Text>
)

export const PlanComparisonTable: React.FC = () => {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((v) => !v)
  }

  return (
    <View style={styles.root}>
      {/* Trigger row */}
      <Pressable
        onPress={toggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse feature comparison' : 'See everything inside'}
        accessibilityState={{ expanded }}
        style={styles.trigger}
      >
        <Text variant="label" style={styles.triggerText}>See everything inside</Text>
        {expanded
          ? <ChevronUp size={16} color={tokens.accent.emphasis} />
          : <ChevronDown size={16} color={tokens.accent.emphasis} />
        }
      </Pressable>

      {/* Collapsible table */}
      {expanded && (
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.row}>
            <View style={{ flex: COL_LABEL_FLEX }} />
            <View style={[styles.tierCol, styles.headerTierCol]}>
              <Text variant="subMicro" color="tertiary" style={styles.headerLabel}>FREE</Text>
            </View>
            <View style={[styles.tierCol, styles.headerTierCol]}>
              <Text variant="subMicro" style={styles.headerPremium}>PRO</Text>
            </View>
          </View>

          {ROWS.map((row, idx) => (
            <View
              key={idx}
              style={[
                styles.row,
                idx < ROWS.length - 1 && styles.rowWithSeparator,
              ]}
            >
              <View style={{ flex: COL_LABEL_FLEX }}>
                <Text variant="caption" color="secondary">{row.label}</Text>
              </View>
              <View style={[styles.tierCol, styles.dataCell]}>
                {row.free ? <CheckMark /> : <Dash />}
              </View>
              <View style={[styles.tierCol, styles.dataCell]}>
                {row.premium ? <CheckMark /> : <Dash />}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    marginTop: space['5'],
  },
  trigger: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            space['1.5'],
  },
  triggerText: {
    color: tokens.accent.emphasis,
  },
  table: {
    marginTop: space['4'],
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: space['3'],
  },
  rowWithSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  headerTierCol: {
    paddingBottom: space['1'],
  },
  tierCol: {
    width:          COL_TIER_WIDTH,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dataCell: {
    paddingTop: space['0.5'],
  },
  headerLabel: {
    textAlign: 'center',
  },
  headerPremium: {
    textAlign: 'center',
    color:     tokens.accent.emphasis,
  },
  dash: {
    lineHeight: 16,
  },
})
