import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ChevronLeft, Sun, BookOpen, Settings, Bell, Heart } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'

import {
  Text,
  Icon,
  Button,
  Chip,
  Badge,
  Divider,
  Skeleton,
  TextInput,
} from '../../components/atoms'

import {
  TextField,
  ListItem,
  ChipGroup,
  ProgressDots,
  Toast,
  DateField,
  TimeField,
  CityField,
} from '../../components/molecules'
import type { Place } from '../../api/nominatim'

import {
  Card,
  SectionHeader,
  Header,
  Modal,
  BottomSheet,
  ChatBubble,
  LockedCard,
  DailyCard,
  ReadingCard,
  TransitCard,
} from '../../components/organisms'

import {
  ScreenWrapper,
  EmptyState,
  ErrorState,
} from '../../components/templates'

import { Decor } from '../../components/atmosphere'
import type { DecorPattern, DecorTone } from '../../components/atmosphere'

import { space, layout, radius, tokens } from '../../design/tokens'

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={{ marginBottom: space['5'] }}>
    <Text variant="micro" color="tertiary" style={{ marginBottom: space['2'] }}>{label}</Text>
    {children}
  </View>
)

// Fixed-size swatch for previewing a Decor pattern on device.
const DecorTile: React.FC<{ pattern: DecorPattern; tone: DecorTone; bg: string }> = ({ pattern, tone, bg }) => {
  const W = 320
  const H = 132
  return (
    <View style={{ width: W, height: H, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: bg, marginBottom: space['3'] }}>
      <Decor pattern={pattern} tone={tone} intensity="presence" width={W} height={H} />
    </View>
  )
}

export const ComponentsScreen: React.FC = () => {
  const navigation = useNavigation()
  const [chipSelected, setChipSelected] = useState<string | null>('one')
  const [chipMulti, setChipMulti] = useState<string[]>(['a'])
  const [textValue, setTextValue] = useState('')
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<Date | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)

  return (
    <ScreenWrapper scroll padded>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={12}
        style={{ alignSelf: 'flex-start', minWidth: layout.tapTarget, minHeight: layout.tapTarget, alignItems: 'center', justifyContent: 'center', marginLeft: -space['2'], marginBottom: space['2'] }}
      >
        <ChevronLeft size={24} color={tokens.text.secondary} />
      </Pressable>

      <Text variant="display2" color="primary">Components</Text>

      <Text variant="body" color="secondary" style={{ marginTop: space['2'], marginBottom: space['8'] }}>
        Design system preview — dev only.
      </Text>

      {/* DECOR — generative guilloché (intensity bumped to 'presence' for visibility) */}
      <SectionHeader title="Decor — guilloché engine" rule />

      <Row label="rosette — gold on cosmic (premium / accent-navy cards)">
        <DecorTile pattern="rosette" tone="gold" bg={tokens.surface.deep} />
      </Row>
      <Row label="rosette — light on copper (featured / accent-rust cards)">
        <DecorTile pattern="rosette" tone="light" bg="#5A3A22" />
      </Row>
      <Row label="wave — gold lattice (screen backgrounds)">
        <DecorTile pattern="wave" tone="gold" bg={tokens.surface.base} />
      </Row>
      <Row label="rings — gold (alternate background option)">
        <DecorTile pattern="rings" tone="gold" bg={tokens.surface.base} />
      </Row>

      {/* ATOMS */}
      <SectionHeader title="Atoms" rule />

      <Row label="Text — variants">
        <Text variant="display1">Display 1</Text>
        <Text variant="display2">Display 2</Text>
        <Text variant="heading1">Heading 1</Text>
        <Text variant="heading2">Heading 2</Text>
        <Text variant="bodyLarge">Body large.</Text>
        <Text variant="body">Body text.</Text>
        <Text variant="label">LABEL</Text>
        <Text variant="caption">caption</Text>
        <Text variant="micro">MICRO</Text>
      </Row>

      <Row label="Icon">
        <View style={{ flexDirection: 'row', gap: space['3'] }}>
          <Icon icon={Sun} />
          <Icon icon={BookOpen} color="accent" />
          <Icon icon={Heart} color="primary" size={32} />
        </View>
      </Row>

      <Row label="Button — 4 variants">
        <View style={{ gap: space['2'] }}>
          <Button label="Primary" onPress={() => {}} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Tertiary" variant="tertiary" onPress={() => {}} />
          <Button label="Danger" variant="danger" onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
          <Button label="Loading" loading onPress={() => {}} />
        </View>
      </Row>

      <Row label="Chip — selection + label">
        <View style={{ flexDirection: 'row', gap: space['2'], flexWrap: 'wrap' }}>
          <Chip variant="selection" label="Unselected" selected={false} onPress={() => {}} />
          <Chip variant="selection" label="Selected" selected={true} onPress={() => {}} />
          <Chip variant="label" label="Info" />
        </View>
      </Row>

      <Row label="Badge — pro / new / count">
        <View style={{ flexDirection: 'row', gap: space['2'] }}>
          <Badge variant="pro" label="PRO" />
          <Badge variant="new" label="NEW" />
          <Badge variant="count" count={3} />
          <Badge variant="count" count={120} />
        </View>
      </Row>

      <Row label="Divider — default + gold">
        <Divider variant="default" />
        <Divider variant="gold" />
      </Row>

      <Row label="Skeleton">
        <Skeleton width="80%" height={16} />
        <View style={{ height: space['2'] }} />
        <Skeleton width="60%" height={12} />
      </Row>

      <Row label="TextInput">
        <TextInput
          label="First name"
          placeholder="Enter your name"
          value={textValue}
          onChangeText={setTextValue}
          hint="This is a hint."
        />
      </Row>

      {/* MOLECULES */}
      <SectionHeader title="Molecules" rule />

      <Row label="TextField — type=email">
        <TextField label="Email" type="email" placeholder="you@omenora.com" required />
      </Row>

      <Row label="ListItem — interactive with chevron + meta">
        <ListItem icon={Settings} label="Settings" meta="v1.0" onPress={() => {}} />
        <ListItem icon={Bell} label="Notifications" onPress={() => {}} />
        <ListItem label="Plain row" />
        <ListItem icon={Heart} label="Destructive" destructive onPress={() => {}} />
      </Row>

      <Row label="ChipGroup — single">
        <ChipGroup
          mode="single"
          options={[
            { id: 'one', label: 'One' },
            { id: 'two', label: 'Two' },
            { id: 'three', label: 'Three' },
          ]}
          value={chipSelected}
          onChange={setChipSelected}
        />
      </Row>

      <Row label="ChipGroup — multi">
        <ChipGroup
          mode="multi"
          options={[
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
            { id: 'c', label: 'Gamma' },
          ]}
          value={chipMulti}
          onChange={setChipMulti}
        />
      </Row>

      <Row label="ProgressDots — 4 dots, current=1">
        <ProgressDots total={4} current={1} />
      </Row>

      <Row label="Toast — tap to show">
        <Button label="Show success toast" variant="secondary" onPress={() => setToastVisible(true)} />
        <Toast
          variant="success"
          message="Saved successfully"
          visible={toastVisible}
          onDismiss={() => setToastVisible(false)}
        />
      </Row>

      <Row label="DateField">
        <DateField label="Birth date" value={date} onChange={setDate} />
      </Row>

      <Row label="TimeField — with unknown toggle">
        <TimeField label="Birth time" value={time} onChange={setTime} showUnknownToggle />
      </Row>

      <Row label="CityField — Nominatim autocomplete">
        <CityField label="Birth city" value={place} onChange={setPlace} />
      </Row>

      {/* ORGANISMS */}
      <SectionHeader title="Organisms" rule />

      <Row label="Card — 3 variants">
        <Card variant="default">
          <Text variant="body" color="primary">Default card</Text>
        </Card>
        <View style={{ height: space['2'] }} />
        <Card variant="raised">
          <Text variant="body" color="primary">Raised card</Text>
        </Card>
        <View style={{ height: space['2'] }} />
        <Card variant="premium">
          <Text variant="body" color="primary">Premium card</Text>
        </Card>
      </Row>

      <Row label="SectionHeader">
        <SectionHeader title="Section title" subtitle="Optional subtitle" actionLabel="See all" onActionPress={() => {}} />
      </Row>

      <Row label="Header — back + right action">
        <Header title="Title" onBack={() => {}} rightIcon={Settings} onRightPress={() => {}} />
      </Row>

      <Row label="Modal — tap to open">
        <Button label="Open modal" variant="secondary" onPress={() => setModalVisible(true)} />
        <Modal visible={modalVisible} onClose={() => setModalVisible(false)} title="Modal title">
          <View style={{ padding: space['5'] }}>
            <Text variant="body" color="primary">Modal content area.</Text>
          </View>
        </Modal>
      </Row>

      <Row label="BottomSheet — tap to open">
        <Button label="Open sheet" variant="secondary" onPress={() => setSheetVisible(true)} />
        <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
          <Text variant="heading2" color="primary">Sheet content</Text>
          <Text variant="body" color="secondary" style={{ marginTop: space['2'] }}>
            Drag down to dismiss, or tap the backdrop.
          </Text>
        </BottomSheet>
      </Row>

      <Row label="ChatBubble — 3 variants">
        <ChatBubble variant="user" message="A user message goes here." timestamp="2:14 PM" />
        <ChatBubble variant="counsel" message="A counsel response in golden subtle tone." timestamp="2:14 PM" />
        <ChatBubble variant="system" message="System note, centered." />
      </Row>

      <Row label="LockedCard — conversion card">
        <LockedCard
          placement="dev_preview"
          title="Premium Feature"
          description="This is a dev showcase of the LockedCard conversion pattern — eyebrow, headline, body copy, and CTA on a cosmic blue-violet premium card."
          onUnlockPress={() => {}}
        />
      </Row>

      <Row label="DailyCard">
        <DailyCard
          title="Today's reading"
          date={new Date()}
          body="Mercury enters Aries today, sharpening communication and decision-making."
          moonPhase="Waxing Crescent"
        />
      </Row>

      <Row label="ReadingCard — symbol + tappable">
        <ReadingCard
          symbol="☉"
          title="The Seeker"
          meta="Sun in Aries · Updated today"
          body="A pioneering archetype defined by bold initiative and purposeful action."
          onPress={() => {}}
        />
      </Row>

      <Row label="TransitCard">
        <TransitCard
          symbol="☿"
          title="Mercury enters Aries"
          body="Communications become more direct and decisive over the next two weeks."
          timing="Today"
        />
      </Row>

      {/* TEMPLATES */}
      <SectionHeader title="Templates" rule />

      <Row label="EmptyState — default illustration">
        <View style={{ height: 240 }}>
          <EmptyState
            heading="Nothing here yet"
            body="Empty state component with the default sacred-geometry SVG."
            actionLabel="Take action"
            onActionPress={() => {}}
          />
        </View>
      </Row>

      <Row label="ErrorState — danger themed">
        <View style={{ height: 240 }}>
          <ErrorState
            body="Couldn't load. Pull to retry, or try again below."
            onActionPress={() => {}}
          />
        </View>
      </Row>

      <View style={{ height: layout.sectionGap }} />
      <Text variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
        End of preview — {31} components rendered.
      </Text>
      <View style={{ height: layout.sectionGap }} />
    </ScreenWrapper>
  )
}
