import { ViewStyle } from 'react-native'

// Shadow tokens. Each value is a complete ViewStyle fragment.
// iOS reads shadowColor/Offset/Opacity/Radius. Android reads elevation.

type ElevationLevel = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>

// Floating elements — bottom sheets, modals
export const elevation: Record<string, ElevationLevel> = {
  floating: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius:  36,
    elevation:     16,
  },
} as const

// Bronze glow — for primary CTA buttons and premium surfaces.
// Uses accent.primary (#A87D4E) as shadow color to suggest warm "lit" surface.
export const warmGlow: ElevationLevel = {
  shadowColor:   '#A87D4E',  // accent.primary — aged bronze
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius:  24,
  elevation:     0,
}
