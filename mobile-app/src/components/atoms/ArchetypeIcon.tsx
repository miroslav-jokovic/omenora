import React from 'react'
import { ViewStyle } from 'react-native'
import { SvgProps } from 'react-native-svg'

import AlchemistSvg  from '../../../assets/symbols/archetypes/alchemist.svg'
import ArchitectSvg  from '../../../assets/symbols/archetypes/architect.svg'
import CatalystSvg   from '../../../assets/symbols/archetypes/catalyst.svg'
import GuardianSvg   from '../../../assets/symbols/archetypes/guardian.svg'
import LighthouseSvg from '../../../assets/symbols/archetypes/lighthouse.svg'
import MirrorSvg     from '../../../assets/symbols/archetypes/mirror.svg'
import SageSvg       from '../../../assets/symbols/archetypes/sage.svg'
import StormSvg      from '../../../assets/symbols/archetypes/storm.svg'
import VisionarySvg  from '../../../assets/symbols/archetypes/visionary.svg'
import WandererSvg   from '../../../assets/symbols/archetypes/wanderer.svg'
import WildfireSvg   from '../../../assets/symbols/archetypes/wildfire.svg'

const ARCHETYPES: Record<string, React.FC<SvgProps>> = {
  alchemist:  AlchemistSvg,
  architect:  ArchitectSvg,
  catalyst:   CatalystSvg,
  guardian:   GuardianSvg,
  lighthouse: LighthouseSvg,
  mirror:     MirrorSvg,
  // 'phoenix' archetype retains its name but uses the non-bird wildfire glyph —
  // phoenix/bird imagery is retired per the brand brief (assets/symbols/archetypes/phoenix.svg removed).
  phoenix:    WildfireSvg,
  sage:       SageSvg,
  storm:      StormSvg,
  visionary:  VisionarySvg,
  wanderer:   WandererSvg,
  wildfire:   WildfireSvg,
}

export interface ArchetypeIconProps {
  archetype: string
  size?: number
  opacity?: number
  fill?: string
  style?: ViewStyle
}

export const ArchetypeIcon: React.FC<ArchetypeIconProps> = ({
  archetype,
  size = 24,
  opacity = 0.65,
  fill,
  style,
}) => {
  const SvgComponent = ARCHETYPES[archetype.trim().toLowerCase()]
  if (!SvgComponent) return null
  const fillColor = fill ?? `rgba(255,255,255,${opacity})`
  const svgOpacity = fill !== undefined ? opacity : undefined
  return (
    <SvgComponent
      width={size}
      height={size}
      fill={fillColor}
      opacity={svgOpacity}
      style={style as SvgProps['style']}
    />
  )
}
