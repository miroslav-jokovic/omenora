/**
 * Entitlement & rate-limit guards for paid endpoints.
 *
 * Premium status is read from public.subscriptions (populated by RC webhook).
 * Rate limits are enforced via public.feature_usage with atomic increment RPC.
 *
 * Pattern for endpoint usage:
 *   const ctx = await requirePremiumWithUsage(event, 'archetype')
 *   // ... do the work ...
 *   await incrementUsage(ctx.userId, ctx.feature, ctx.period)
 *
 * Throws:
 *   401 if no JWT (via requireAuth)
 *   403 { error: 'subscription_required' } if no active premium
 *   429 { error: 'monthly_limit_reached' | 'daily_limit_reached', resets_at, cap, used }
 */
import type { H3Event } from 'h3'
import { requireAuth, createSupabaseAdmin } from './auth'
import { getCreditBalance } from './credits'

type FeatureCap = {
  cap: number
  period: 'monthly' | 'daily'
}

const FEATURE_CAPS: Record<string, FeatureCap> = {
  archetype:     { cap: 1,  period: 'monthly' },
  natal_chart:   { cap: 1,  period: 'monthly' },
  forecast:      { cap: 4,  period: 'monthly' },
  compatibility: { cap: 10, period: 'monthly' },
  counsel:       { cap: 30, period: 'monthly' },
}

const SUGGESTED_PRODUCTS_FREE: Record<'counsel' | 'compatibility', string[]> = {
  counsel:       ['omenora_monthly', 'omenora_annual', 'omenora_counsel_spark', 'omenora_counsel_insight', 'omenora_counsel_ascend'],
  compatibility: ['omenora_monthly', 'omenora_annual', 'omenora_compatibility_single'],
}

const SUGGESTED_PRODUCTS_PREMIUM_CAP: Record<'counsel' | 'compatibility', string[]> = {
  counsel:       ['omenora_counsel_spark', 'omenora_counsel_insight', 'omenora_counsel_ascend'],
  compatibility: ['omenora_compatibility_single'],
}

function periodKey(now: Date, kind: 'monthly' | 'daily'): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  if (kind === 'monthly') return `${yyyy}-${mm}`
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function nextResetAt(now: Date, kind: 'monthly' | 'daily'): string {
  if (kind === 'monthly') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}

export interface EntitlementContext {
  userId: string
  feature: string
  period: string
  count: number
  cap: number
  resetsAt: string
}

export type AccessContext =
  | {
      source: 'premium'
      userId: string
      feature: 'counsel' | 'compatibility'
      period: string
      count: number
      cap: number
      resetsAt: string
    }
  | {
      source: 'credit'
      userId: string
      feature: 'counsel' | 'compatibility'
      creditBalance: number
    }

export async function requirePremiumWithUsage(
  event: H3Event,
  feature: keyof typeof FEATURE_CAPS,
): Promise<EntitlementContext> {
  // requireAuth returns the full User object — extract id
  const user = await requireAuth(event)
  const userId = user.id

  const cfg = FEATURE_CAPS[feature]
  if (!cfg) {
    throw createError({ statusCode: 500, message: `unknown feature: ${feature}` })
  }

  const supabaseAdmin = createSupabaseAdmin()

  // 1. Entitlement check — read latest premium subscription
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', userId)
    .eq('entitlement_id', 'premium')
    .order('expires_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (subErr) {
    console.error('[entitlements] subscription read failed:', subErr.message, { userId, feature })
    throw createError({ statusCode: 500, message: 'Failed to verify subscription' })
  }

  const now = new Date()
  const isActive = !!sub
    && (sub.status === 'active' || sub.status === 'in_grace_period')
    && (!sub.expires_at || new Date(sub.expires_at) > now)

  if (!isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'subscription_required',
      data: { error: 'subscription_required' },
    })
  }

  // 2. Rate limit check
  const period = periodKey(now, cfg.period)
  const resetsAt = nextResetAt(now, cfg.period)

  const { data: usage } = await supabaseAdmin
    .from('feature_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period', period)
    .maybeSingle()

  const currentCount = usage?.count ?? 0

  if (currentCount >= cfg.cap) {
    throw createError({
      statusCode: 429,
      statusMessage: cfg.period === 'monthly' ? 'monthly_limit_reached' : 'daily_limit_reached',
      data: {
        error: cfg.period === 'monthly' ? 'monthly_limit_reached' : 'daily_limit_reached',
        resets_at: resetsAt,
        cap: cfg.cap,
        used: currentCount,
      },
    })
  }

  return { userId, feature, period, count: currentCount, cap: cfg.cap, resetsAt }
}

/**
 * Atomic increment via SECURITY DEFINER RPC. Best-effort — errors are
 * logged but not thrown so a successful feature delivery is not punished
 * by an accounting failure.
 */
export async function incrementUsage(
  userId: string,
  feature: string,
  period: string,
): Promise<void> {
  const supabaseAdmin = createSupabaseAdmin()
  const { error } = await supabaseAdmin.rpc('increment_feature_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period: period,
  })

  if (error) {
    console.error('[entitlements] increment failed:', error.message, { userId, feature, period })
  }
}

/**
 * Guards an endpoint that is accessible by EITHER:
 *   (a) an active 'premium' subscription, OR
 *   (b) an active row for the given entitlementKey in public.subscriptions.
 *
 * Designed for permanent-unlock features (e.g. calendar_2026 IAP) that are
 * not credit-based and carry no rate cap. Returns { userId } on success.
 *
 * Throws:
 *   401 if no JWT (via requireAuth)
 *   403 { error: 'entitlement_required', entitlement: entitlementKey,
 *          suggested_products: [...] } if neither entitlement is active
 */
export async function requirePremiumOrEntitlement(
  event: H3Event,
  entitlementKey: string,
  suggestedProducts: string[],
): Promise<{ userId: string }> {
  const user = await requireAuth(event)
  const userId = user.id

  const supabaseAdmin = createSupabaseAdmin()
  const now = new Date()

  const { data: rows, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('entitlement_id, status, expires_at')
    .eq('user_id', userId)
    .in('entitlement_id', ['premium', entitlementKey])

  if (subErr) {
    console.error('[entitlements] subscription read failed:', subErr.message, { userId, entitlementKey })
    throw createError({ statusCode: 500, message: 'Failed to verify subscription' })
  }

  const isEntitlementActive = (row: { status: string; expires_at: string | null }): boolean =>
    (row.status === 'active' || row.status === 'in_grace_period')
    && (!row.expires_at || new Date(row.expires_at) > now)

  const hasAccess = (rows ?? []).some(isEntitlementActive)

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'entitlement_required',
      data: {
        error: 'entitlement_required',
        entitlement: entitlementKey,
        suggested_products: suggestedProducts,
      },
    })
  }

  return { userId }
}

/**
 * Grants access if the user has an active premium subscription with remaining
 * cap, OR if they have a positive credit balance for the given credit type.
 *
 * Returns an AccessContext discriminated by source: 'premium' | 'credit'.
 * Callers use the source field to decide whether to call incrementUsage (premium)
 * or consumeCredit (credit) after successful feature delivery.
 */
export async function requirePremiumOrCreditAccess(
  event: H3Event,
  feature: 'counsel' | 'compatibility',
  creditType: 'counsel' | 'compat',
): Promise<AccessContext> {
  // Resolve userId once up-front so the catch block can use it without re-parsing JWT
  const user = await requireAuth(event)
  const userId = user.id

  try {
    const ctx = await requirePremiumWithUsage(event, feature)
    return {
      source: 'premium',
      userId: ctx.userId,
      feature: ctx.feature as 'counsel' | 'compatibility',
      period: ctx.period,
      count: ctx.count,
      cap: ctx.cap,
      resetsAt: ctx.resetsAt,
    }
  }
  catch (err) {
    const h3err = err as { statusCode?: number; statusMessage?: string; data?: Record<string, unknown> }

    if (h3err.statusCode === 403 && h3err.statusMessage === 'subscription_required') {
      const balance = await getCreditBalance(userId, creditType)
      if (balance > 0) {
        return { source: 'credit', userId, feature, creditBalance: balance }
      }
      throw createError({
        statusCode: 403,
        statusMessage: 'access_required',
        data: {
          error: 'access_required',
          subscription_required: true,
          credits_required: true,
          credit_balance: 0,
          suggested_products: SUGGESTED_PRODUCTS_FREE[feature],
        },
      })
    }

    if (h3err.statusCode === 429) {
      const balance = await getCreditBalance(userId, creditType)
      if (balance > 0) {
        return { source: 'credit', userId, feature, creditBalance: balance }
      }
      throw createError({
        statusCode: 429,
        statusMessage: h3err.statusMessage,
        data: {
          ...h3err.data,
          credit_balance: 0,
          suggested_products: SUGGESTED_PRODUCTS_PREMIUM_CAP[feature],
        },
      })
    }

    throw err
  }
}
