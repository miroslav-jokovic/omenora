import React from 'react'
import { SvgXml } from 'react-native-svg'

const LOGO_FILL = '#F2EDE5'
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 301.62 499.33">
  <polygon fill="${LOGO_FILL}" points="301.62 210.03 234.96 187.05 174.86 114.93 150.08 0 301.62 210.03"/>
  <polygon fill="${LOGO_FILL}" points="150.08 499.33 0 214 79.78 195.77 150.08 499.33"/>
  <path fill="${LOGO_FILL}" d="M301.62,210.03l-151.54,289.29c3.2-86.22,39.95-196.34,84.88-312.28l66.66,22.98Z" opacity="0.75"/>
  <polygon fill="${LOGO_FILL}" points="150.08 0 79.78 195.77 0 214 150.08 0" opacity="0.55"/>
  <polygon fill="${LOGO_FILL}" points="174.86 114.93 79.78 195.77 150.08 0 174.86 114.93" opacity="0.88"/>
  <path fill="${LOGO_FILL}" d="M234.96,187.05c-44.93,115.94-81.68,226.06-84.88,312.28L79.78,195.77l95.08-80.84,60.11,72.12Z" opacity="0.65"/>
</svg>`

export interface LogomarkProps {
  size?: number
  accessibilityLabel?: string
}

export const Logomark: React.FC<LogomarkProps> = ({ size = 40, accessibilityLabel = 'Omenora' }) => (
  <SvgXml xml={LOGO_SVG} width={size} height={size} accessibilityLabel={accessibilityLabel} />
)
