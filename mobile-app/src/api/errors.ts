// errors.ts — centralized backend error parsing for the mobile API client.
// Every screen-level catch block for axios errors should pass the caught
// error to parseBackendError() and switch on the returned discriminated
// union, instead of doing ad-hoc err.response.data.error extraction.
//
// The error shapes returned by Phase 1 backend endpoints:
//   403 access_required    — free user, no subscription, no credits
//   403 subscription_required — free user (pre-Phase-1 shape, legacy)
//   429 monthly_limit_reached — premium user, cap exhausted, no credits
//   429 daily_limit_reached   — legacy shape; counsel is now monthly
//   401 auth required (rare in normal flows; auth is upstream)
import { getErrorBody } from './client'

export type BackendError =
  | {
      kind: 'subscription_required'
      subscriptionRequired: boolean
      creditsRequired: boolean
      creditBalance: number
      suggestedProducts: string[]
    }
  | {
      kind: 'cap_reached'
      period: 'monthly' | 'daily'
      cap: number
      used: number
      resetsAt: string
      creditBalance: number
      suggestedProducts: string[]
    }
  | {
      kind: 'auth_required'
    }
  | {
      kind: 'network'
    }
  | {
      kind: 'unknown'
      message: string
    }

export function parseBackendError(err: unknown): BackendError {
  const body = getErrorBody(err)

  if (body === null) {
    const msg = typeof (err as Record<string, unknown>)?.message === 'string'
      ? (err as Record<string, unknown>).message as string
      : undefined

    if (msg !== undefined && (msg === 'Authentication required' || msg.startsWith('Auth'))) {
      return { kind: 'auth_required' }
    }

    if (msg !== undefined && (msg.includes('Network') || msg.includes('timeout'))) {
      return { kind: 'network' }
    }

    return { kind: 'unknown', message: msg ?? String(err) ?? 'Unknown error' }
  }

  const { status, data } = body

  const d = data !== null && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null

  if (status === 401) {
    return { kind: 'auth_required' }
  }

  if (status === 403) {
    return {
      kind: 'subscription_required',
      subscriptionRequired: typeof d?.subscription_required === 'boolean' ? d.subscription_required : true,
      creditsRequired: typeof d?.credits_required === 'boolean' ? d.credits_required : false,
      creditBalance: typeof d?.credit_balance === 'number' ? d.credit_balance : 0,
      suggestedProducts: Array.isArray(d?.suggested_products)
        ? (d!.suggested_products as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
    }
  }

  if (status === 429) {
    const errorStr = typeof d?.error === 'string' ? d.error : ''
    const period: 'monthly' | 'daily' =
      errorStr.includes('monthly') ? 'monthly'
      : errorStr.includes('daily') ? 'daily'
      : 'monthly'

    return {
      kind: 'cap_reached',
      period,
      cap: typeof d?.cap === 'number' ? d.cap : 0,
      used: typeof d?.used === 'number' ? d.used : 0,
      resetsAt: typeof d?.resets_at === 'string' ? d.resets_at : '',
      creditBalance: typeof d?.credit_balance === 'number' ? d.credit_balance : 0,
      suggestedProducts: Array.isArray(d?.suggested_products)
        ? (d!.suggested_products as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
    }
  }

  const fallbackMsg =
    typeof d?.message === 'string' ? d.message
    : typeof d?.error === 'string' ? d.error
    : 'Request failed'

  return { kind: 'unknown', message: fallbackMsg }
}
