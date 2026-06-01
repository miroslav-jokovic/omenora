import React from 'react'
import { View, ViewStyle } from 'react-native'
import { Text } from '../atoms'
import { Card } from './Card'
import { tokens, space } from '../../design/tokens'

export interface TransitCardProps {
  symbol: string
  title: string
  body: string
  timing?: string
  style?: ViewStyle
}

export const TransitCard: React.FC<TransitCardProps> = ({
  symbol,
  title,
  body,
  timing,
  style,
}) => {
  return (
    <Card variant="content" padding="compact" style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space['3'] }}>
        <Text
          variant="display2"
          style={{ lineHeight: 32, /* intentional: clamps display2 (40pt) glyph cell to match adjacent label row height */ minWidth: 28, textAlign: 'center', color: tokens.text.disabled }}
        >
          {symbol}
        </Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space['2'] }}>
            <Text variant="label" color="primary" style={{ flex: 1 }}>
              {title}
            </Text>
            {timing != null && (
              <Text variant="caption" color="tertiary">
                {timing}
              </Text>
            )}
          </View>
          <Text variant="body" color="secondary" style={{ marginTop: space['1'] }}>
            {body}
          </Text>
        </View>
      </View>
    </Card>
  )
}
