export const space = {
  '0.5': 2,  '1':   4,   '1.5': 6,
  '2':   8,  '3':  12,   '3.5': 14,
  '4':  16,  '5':  20,   '6':   24,
  '7':  28,  '8':  32,   '10':  40,
  '12': 48,  '16': 64,   '20':  80,
  '24': 96,
} as const

export const layout = {
  screenPadding:        20,   // HIG standard side margin
  cardPaddingCompact:   16,
  cardPaddingDefault:   20,
  cardPaddingPremium:   28,
  cardGap:              16,   // inter-card breathing room
  cardContentGap:       12,   // internal card content-row gap (icon + text, key-value rows)
  sectionGap:           32,   // between major content blocks
  sectionHeaderGap:     48,   // between section eyebrow/title and first content card
  tapTarget:            44,   // HIG minimum tap target
  bottomFloatPosition:  60,   // absolute bottom offset for floating zones
} as const
