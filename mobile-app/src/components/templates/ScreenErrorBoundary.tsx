import React from 'react'
import { View, StyleSheet } from 'react-native'
import * as Sentry from '@sentry/react-native'
import { ErrorState } from './ErrorState'
import { tokens } from '../../design/tokens'

/**
 * Per-screen error boundary. Wraps each screen via the navigators' `screenLayout` 
 * prop so a render-phase crash in one screen shows a recoverable fallback instead
 * of taking down the whole app. Sentry.ErrorBoundary auto-reports the error.
 * (Event-handler/async errors are not caught by React boundaries — those are
 * reported via explicit Sentry.captureException and Sentry's global handler.)
 */
export const ScreenErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <View style={styles.root}>
        <ErrorState
          heading="Something went wrong"
          body="This screen ran into a problem. Try again, or go back."
          actionLabel="Try again"
          onActionPress={resetError}
        />
      </View>
    )}
  >
    {children}
  </Sentry.ErrorBoundary>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.surface.base },
})
