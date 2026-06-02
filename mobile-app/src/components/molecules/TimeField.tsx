import React, { useRef, useState } from 'react'
import { Modal, Platform, Pressable, View, StyleSheet, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Clock } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Text, Button } from '../atoms'
import { tokens, space, layout, radius } from '../../design/tokens'

export interface TimeFieldProps {
  label?: string
  value: Date | null
  onChange: (time: Date | null) => void
  showUnknownToggle?: boolean
  unknownToggleLabel?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  style?: ViewStyle
}

export const TimeField: React.FC<TimeFieldProps> = ({
  label,
  value,
  onChange,
  showUnknownToggle = false,
  unknownToggleLabel = "I don't know my birth time",
  placeholder = 'Select time',
  error,
  hint,
  required = false,
  style,
}) => {
  const [showModal, setShowModal] = useState(false)
  const [tempValue, setTempValue] = useState<Date>(value ?? new Date())
  const pickedValueRef = useRef<Date | null>(null)
  const [unknownEnabled, setUnknownEnabled] = useState(showUnknownToggle && value === null)

  const resolvedLabel = label != null ? (required ? `${label} *` : label) : undefined

  const handleTap = () => {
    if (unknownEnabled) return
    Haptics.selectionAsync()

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'time',
        value: value ?? new Date(),
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date != null) {
            onChange(date)
          }
        },
      })
    } else {
      const seed = value ?? new Date()
      setTempValue(seed)
      pickedValueRef.current = null
      setShowModal(true)
    }
  }

  const handleDone = () => {
    onChange(pickedValueRef.current ?? tempValue)
    setShowModal(false)
  }

  const handleCancel = () => {
    setShowModal(false)
  }

  const handleToggle = (enabled: boolean) => {
    Haptics.selectionAsync()
    setUnknownEnabled(enabled)
    if (enabled) {
      onChange(null)
    }
  }

  const formattedValue = value != null
    ? value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null

  return (
    <View style={style}>
      {resolvedLabel != null && (
        <Text variant="label" style={styles.label}>
          {resolvedLabel}
        </Text>
      )}
      <Pressable onPress={handleTap} disabled={unknownEnabled}>
        <BlurView
          intensity={20}
          tint="dark"
          style={[
            styles.field,
            unknownEnabled && styles.fieldDisabled,
            error != null && styles.fieldError,
          ]}
        >
          <View style={styles.fieldTint} />
          {unknownEnabled ? (
            <Text variant="bodyLarge" style={styles.unknownText}>
              Unknown
            </Text>
          ) : (
            <Text
              variant="bodyLarge"
              style={[styles.displayText, { color: formattedValue != null ? tokens.text.primary : tokens.text.disabled }]}
            >
              {formattedValue ?? placeholder}
            </Text>
          )}
          <Clock size={20} color={tokens.text.secondary} />
        </BlurView>
      </Pressable>

      {showUnknownToggle && (
        <Pressable
          onPress={() => handleToggle(!unknownEnabled)}
          accessibilityRole="switch"
          accessibilityState={{ checked: unknownEnabled }}
          style={styles.toggleRow}
        >
          <View style={[styles.trackOuter, unknownEnabled && styles.trackActive]}>
            <View style={[styles.thumb, unknownEnabled && styles.thumbActive]} />
          </View>
          <Text variant="body" style={styles.toggleLabel}>
            {unknownToggleLabel}
          </Text>
        </Pressable>
      )}

      {error != null ? (
        <Text variant="caption" style={styles.errorText}>
          {error}
        </Text>
      ) : hint != null ? (
        <Text variant="caption" style={styles.hintText}>
          {hint}
        </Text>
      ) : null}

      {Platform.OS !== 'android' && (
        <Modal
          visible={showModal}
          animationType="fade"
          transparent={true}
          onRequestClose={handleCancel}
        >
          <View style={styles.modalBackdrop}>
            <BlurView intensity={24} tint="dark" style={styles.modalCard}>
              <View style={styles.modalTint} />
              <View style={styles.modalHeader}>
                <Button variant="tertiary" label="Cancel" onPress={handleCancel} />
                <Button variant="tertiary" label="Done" onPress={handleDone} />
              </View>
              <DateTimePicker
                value={tempValue}
                mode="time"
                display="spinner"
                themeVariant="dark"
                style={styles.picker}
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (date != null) pickedValueRef.current = date
                }}
              />
            </BlurView>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    color:        tokens.text.secondary,
    marginBottom: space['1'],
  },
  field: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   space['3'],
    paddingHorizontal: space['4'],
    borderRadius:      radius.md,
    overflow:          'hidden',
    borderWidth:       1,
    borderColor:       'transparent',
    minHeight:         layout.tapTarget,
  },
  fieldDisabled: {
    opacity: 0.4,
  },
  fieldError: {
    borderColor: tokens.state.danger,
  },
  fieldTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.specialty.glassTint,
  },
  displayText: {
    flex: 1,
  },
  unknownText: {
    flex:      1,
    color:     tokens.text.tertiary,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space['3'],
    marginTop:     space['2'],
  },
  toggleLabel: {
    flex:  1,
    color: tokens.text.secondary,
  },
  errorText: {
    color:     tokens.state.danger,
    marginTop: space['1'],
  },
  hintText: {
    color:     tokens.text.tertiary,
    marginTop: space['1'],
  },
  modalBackdrop: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: tokens.specialty.overlayScrim,
  },
  modalCard: {
    width:             '85%',
    borderRadius:      24,
    overflow:          'hidden',
    paddingVertical:   space['4'],
    paddingHorizontal: space['2'],
    borderWidth:       1,
    borderColor:       tokens.border.subtle,
  },
  modalTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.specialty.glassTint,
  },
  picker: {
    backgroundColor: 'transparent',
  },
  trackOuter: {
    width:           48,
    height:          26,
    borderRadius:    13,
    backgroundColor: tokens.border.default,
    padding:         3,
    justifyContent:  'center',
  },
  trackActive: {
    backgroundColor: tokens.accent.primary,
  },
  thumb: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: tokens.specialty.white,
    alignSelf:       'flex-start',
  },
  thumbActive: {
    alignSelf: 'flex-end',
  },
  modalHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   space['4'],
  },
})
