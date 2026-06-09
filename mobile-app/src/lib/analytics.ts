import PostHog from 'posthog-react-native'
import type { PostHogEventProperties } from '@posthog/core'

const POSTHOG_KEY  = process.env.EXPO_PUBLIC_POSTHOG_KEY
// Match the web project host so web + mobile stitch into one PostHog project.
const POSTHOG_HOST = 'https://app.posthog.com'

let client: PostHog | null = null

/** Initialize the PostHog client once. No-ops if the key is unset (e.g. local dev). */
export function initAnalytics(): void {
  if (client || !POSTHOG_KEY) return
  client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST })
}

/** Identity bridge: use the Supabase user UUID so web + mobile share one identity. */
export function identifyUser(distinctId: string): void {
  client?.identify(distinctId)
}

/** Clear identity on sign-out (PostHog returns to a fresh anonymous distinct id). */
export function resetAnalytics(): void {
  client?.reset()
}

/**
 * Wire the "Share anonymous usage data" preference to capture. Persisted by PostHog.
 * optIn/optOut return Promise<void> in posthog-react-native v4 — fire-and-forget.
 */
export function setAnalyticsOptOut(optedOut: boolean): void {
  if (!client) return
  if (optedOut) void client.optOut()
  else void client.optIn()
}

/** Capture a product event. No-ops if analytics is uninitialized or opted out. */
export function track(event: string, properties?: PostHogEventProperties): void {
  client?.capture(event, properties)
}
