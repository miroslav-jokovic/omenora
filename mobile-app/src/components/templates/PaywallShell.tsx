import React from 'react'
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScreenWrapper } from './ScreenWrapper'
import { tokens, space, layout } from '../../design/tokens'

export interface PaywallShellProps {
  hero: React.ReactNode
  features: React.ReactNode
  planSelector?: React.ReactNode
  primaryCta: React.ReactNode
  ctaSubline?: React.ReactNode
  footerAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  legalFooter?: React.ReactNode
  style?: ViewStyle
}

export const PaywallShell: React.FC<PaywallShellProps> = ({
  hero,
  features,
  planSelector,
  primaryCta,
  ctaSubline,
  footerAction,
  secondaryAction,
  legalFooter,
  style,
}) => {
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, space['4'])

  return (
    <ScreenWrapper scroll={false} padded={false} background="base" style={style}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: layout.screenPadding }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', paddingVertical: space['6'] }}>
          {hero}
        </View>
        <View style={{ marginTop: space['6'] }}>
          {features}
        </View>
        {planSelector != null && (
          <View style={{ marginTop: space['8'] }}>
            {planSelector}
          </View>
        )}
        {secondaryAction != null && (
          <View style={{ marginTop: space['4'], alignItems: 'center' }}>
            {secondaryAction}
          </View>
        )}
        {legalFooter != null && (
          <View style={{ marginTop: space['8'], paddingTop: space['4'], borderTopWidth: 0.5, borderTopColor: tokens.border.subtle }}>
            {legalFooter}
          </View>
        )}
        <View style={{ height: space['8'] }} />
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad,
            paddingHorizontal: layout.screenPadding,
          },
        ]}
      >
        {primaryCta}
        {ctaSubline != null && (
          <View style={{ marginTop: space['2'], alignItems: 'center' }}>
            {ctaSubline}
          </View>
        )}
        {footerAction != null && (
          <View style={{ marginTop: space['3'], alignItems: 'center' }}>
            {footerAction}
          </View>
        )}
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: space['3'],
    backgroundColor: tokens.surface.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.border.subtle,
  },
})
