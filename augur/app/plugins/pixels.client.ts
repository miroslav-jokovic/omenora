import posthog from 'posthog-js'
import type { Session } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const tiktokPixelId = config.public.tiktokPixelId as string
  const metaPixelId = config.public.metaPixelId as string
  const posthogKey = config.public.posthogKey as string
  // GA4: window.gtag is defined by the inline bootstrap script injected in
  // nuxt.config.ts app.head (production only). On dev/server it is undefined
  // and calls are silently skipped by the safeGtag wrapper below.
  function safeGtag(...args: [string, ...unknown[]]) {
    try {
      if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        ;(window as any).gtag(...args)
      }
    } catch (err) {
      console.warn('[GA4] gtag error:', err)
    }
  }

  // ── PostHog ─────────────────────────────────────────────────────────────
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      persistence: 'localStorage+cookie',
    })

    // Identity bridge: stitch web <-> mobile to one PostHog identity via the Supabase
    // user id. `session` is the shared Nuxt useState ref also used by useAuth().
    const authSession = useState<Session | null>('omenora-auth-session', () => null)
    watch(
      authSession,
      (s, prev) => {
        const uid = s?.user?.id
        if (uid) {
          posthog.identify(uid)
        } else if (prev?.user?.id) {
          // logged-in -> logged-out transition only (avoid churning anon id on load)
          posthog.reset()
        }
      },
      { immediate: true },
    )
  }

  // ─── TikTok Pixel ──────────────────────────────────────────────────────────
  if (tiktokPixelId) {
    ;(function (w: any, d: Document, t: string) {
      w.TiktokAnalyticsObject = t
      const ttq: any = (w[t] = w[t] || [])
      ttq.methods = [
        'page', 'track', 'identify', 'instances', 'debug',
        'on', 'off', 'once', 'ready', 'alias', 'group',
        'enableCookie', 'disableCookie',
      ]
      ttq.setAndDefer = function (obj: any, method: string) {
        obj[method] = function () {
          obj.push([method].concat(Array.prototype.slice.call(arguments, 0)))
        }
      }
      ttq.methods.forEach((method: string) => ttq.setAndDefer(ttq, method))
      ttq.instance = function (t: string) {
        const inst = ttq._i[t] || []
        ttq.methods.forEach((method: string) => ttq.setAndDefer(inst, method))
        return inst
      }
      ttq.load = function (e: string, n: any) {
        const script = d.createElement('script')
        script.type = 'text/javascript'
        script.async = true
        script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + e + '&lib=' + t
        const firstScript = d.getElementsByTagName('script')[0]
        if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript)
        ttq._i = ttq._i || {}
        ttq._i[e] = []
        ttq._i[e]._u = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + e + '&lib=' + t
        ttq._t = ttq._t || {}
        ttq._t[e] = +new Date()
        ttq._o = ttq._o || {}
        ttq._o[e] = n || {}
      }
      ttq.load(tiktokPixelId)
      ttq.page()
    })(window, document, 'ttq')
  }

  // ─── Meta Pixel ────────────────────────────────────────────────────────────
  if (metaPixelId) {
    ;(function (f: any, b: Document, e: string, v: string, n?: any, t?: any, s?: any) {
      if (f.fbq) return
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = true
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode!.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    ;(window as any).fbq('init', metaPixelId)
    ;(window as any).fbq('track', 'PageView')
  }

  // ─── Auto PageView on every route change ───────────────────────────────────
  const router = useRouter()
  router.afterEach((to) => {
    if (tiktokPixelId && (window as any).ttq) {
      ;(window as any).ttq.page()
    }
    if (metaPixelId && (window as any).fbq) {
      ;(window as any).fbq('track', 'PageView')
    }
    // GA4: send page_view on every SPA navigation
    safeGtag('event', 'page_view', {
      page_path: to.fullPath,
      page_title: document.title,
    })
  })

  // ─── B-3: safeTrack wrapper ─────────────────────────────────────────────────
  // A broken pixel must NEVER throw into the call site or break the funnel.
  function safeTrack(eventName: string, props?: Record<string, unknown>) {
    try {
      if (tiktokPixelId && (window as any).ttq) {
        ;(window as any).ttq.track(eventName, props ?? {})
      }
    } catch (err) {
      console.warn(`[B-3] TikTok tracking error — ${eventName}:`, err)
    }
    try {
      if (metaPixelId && (window as any).fbq) {
        ;(window as any).fbq('trackCustom', eventName, props ?? {})
      }
    } catch (err) {
      console.warn(`[B-3] Meta tracking error — ${eventName}:`, err)
    }
    try {
      if (posthogKey && posthog.__loaded) {
        posthog.capture(eventName, props ?? {})
      }
    } catch (err) {
      console.warn(`[B-3] PostHog tracking error — ${eventName}:`, err)
    }
    safeGtag('event', eventName, props ?? {})
  }

  // ─── B-3: UTM + context helpers ─────────────────────────────────────────────
  const UTM_SESSION_KEY = 'omenora_utms'
  const UTM_KEYS = ['utm_source', 'utm_campaign', 'utm_adset', 'utm_creative', 'utm_medium', 'utm_content', 'ttclid', 'fbclid'] as const

  function getUtmParams(): Record<string, string> {
    try {
      const stored = sessionStorage.getItem(UTM_SESSION_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed.utm_source) return parsed
        } catch {}
      }
    } catch {
      // sessionStorage unavailable or corrupt — fall through to URL
    }
    try {
      const sp = new URLSearchParams(window.location.search)
      const result: Record<string, string> = {}
      for (const key of UTM_KEYS) {
        const val = sp.get(key)
        if (val) result[key] = val
      }
      if (Object.keys(result).length > 0) {
        try { sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(result)) } catch { /* quota exceeded */ }
      }
      return result
    } catch {
      return {}
    }
  }

  // Seed sessionStorage on plugin init so UTMs are captured from the landing URL
  getUtmParams()

  function getDeviceType(): string {
    try {
      const ua = navigator.userAgent
      if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
      if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile'
      return 'desktop'
    } catch {
      return 'unknown'
    }
  }

  // ─── Email hashing (SHA-256 via Web Crypto API) ──────────────────────────────
  async function hashEmail(email: string): Promise<string> {
    const normalized = email.toLowerCase().trim()
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // ─── Expose tracking helpers ────────────────────────────────────────────────
  return {
    provide: {
      // ── Existing pixel-standard events (preserved, now wrapped with safeTrack) ──

      trackViewContent: (params: {
        content_name: string
        content_id?: string
        value?: number
        currency?: string
        archetype?: string
        lifePathNumber?: number
        region?: string
        language?: string
      }) => {
        try {
          if (tiktokPixelId && (window as any).ttq) {
            ;(window as any).ttq.track('ViewContent', {
              content_type: 'product',
              content_name: params.content_name,
              content_category: 'Astrology',
              content_id: params.content_id || 'compatibility_reading',
              value: params.value,
              currency: params.currency || 'USD',
            })
          }
        } catch (err) { console.warn('[B-3] trackViewContent TikTok error:', err) }
        try {
          if (metaPixelId && (window as any).fbq) {
            ;(window as any).fbq('track', 'ViewContent', {
              content_name: params.content_name,
              content_ids: [params.content_id || params.content_name],
              value: params.value,
              currency: params.currency || 'USD',
            })
          }
        } catch (err) { console.warn('[B-3] trackViewContent Meta error:', err) }
      },

      trackInitiateCheckout: (params: {
        value: number
        currency?: string
        content_name?: string
        tier?: number
        archetype?: string
        language?: string
        region?: string
      }) => {
        try {
          if (tiktokPixelId && (window as any).ttq) {
            ;(window as any).ttq.track('InitiateCheckout', {
              content_type: 'product',
              content_id: 'compatibility_reading',
              value: params.value,
              currency: params.currency || 'USD',
              content_name: params.content_name || 'Destiny Reading',
            })
          }
        } catch (err) { console.warn('[B-3] trackInitiateCheckout TikTok error:', err) }
        try {
          if (metaPixelId && (window as any).fbq) {
            ;(window as any).fbq('track', 'InitiateCheckout', {
              value: params.value,
              currency: params.currency || 'USD',
              num_items: 1,
            })
          }
        } catch (err) { console.warn('[B-3] trackInitiateCheckout Meta error:', err) }
      },

      trackPurchase: (params: {
        value: number
        currency?: string
        content_name?: string
        tier?: number
        archetype?: string
        language?: string
        region?: string
      }) => {
        try {
          if (tiktokPixelId && (window as any).ttq) {
            ;(window as any).ttq.track('CompletePayment', {
              content_type: 'product',
              content_id: 'compatibility_reading',
              value: params.value,
              currency: params.currency || 'USD',
              content_name: params.content_name || 'Destiny Reading',
            })
          }
        } catch (err) { console.warn('[B-3] trackPurchase TikTok error:', err) }
        try {
          if (metaPixelId && (window as any).fbq) {
            ;(window as any).fbq('track', 'Purchase', {
              value: params.value,
              currency: params.currency || 'USD',
              content_type: 'product',
            })
          }
        } catch (err) { console.warn('[B-3] trackPurchase Meta error:', err) }
        safeTrack('checkout_complete', {
          value: params.value,
          currency: params.currency || 'USD',
          tier: params.tier,
          archetype: params.archetype,
          language: params.language,
          region: params.region,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      // ── B-3: Full-funnel event helpers ──────────────────────────────────────

      trackLandingView: () => {
        safeTrack('landing_view', {
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackCompatibilityQuizStart: () => {
        try {
          if (tiktokPixelId && (window as any).ttq) {
            ;(window as any).ttq.track('ViewContent', {
              content_type: 'product',
              content_name: 'Compatibility Reading',
              content_id: 'compatibility_reading',
            })
          }
        } catch (err) { console.warn('[B-3] trackCompatibilityQuizStart TikTok error:', err) }
        safeTrack('compatibility_quiz_start', {
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackCompatibilityPaywallView: (params: { score?: number }) => {
        try {
          if (tiktokPixelId && (window as any).ttq) {
            ;(window as any).ttq.track('AddToCart', {
              content_type: 'product',
              content_name: 'Compatibility Reading',
              content_id: 'compatibility_reading',
              value: 4.99,
              currency: 'USD',
            })
          }
        } catch (err) { console.warn('[B-3] trackCompatibilityPaywallView TikTok error:', err) }
        try {
          if (metaPixelId && (window as any).fbq) {
            ;(window as any).fbq('track', 'AddToCart', {
              value: 4.99,
              currency: 'USD',
              content_name: 'Compatibility Reading',
              content_type: 'product',
              content_ids: ['compatibility_reading'],
            })
          }
        } catch (err) { console.warn('[B-3] trackCompatibilityPaywallView Meta error:', err) }
        safeTrack('compatibility_paywall_view', {
          score: params.score,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackAnalysisStart: () => {
        try {
          if (tiktokPixelId && (window as any).ttq) {
            ;(window as any).ttq.track('ViewContent', {
              content_type: 'product',
              content_name: 'Archetype Reading',
              content_id: 'archetype_reading',
            })
          }
        } catch (err) { console.warn('[B-3] trackAnalysisStart TikTok error:', err) }
        try {
          if (metaPixelId && (window as any).fbq) {
            ;(window as any).fbq('track', 'ViewContent', {
              content_name: 'Archetype Reading',
              content_type: 'product',
              content_ids: ['archetype_reading'],
            })
          }
        } catch (err) { console.warn('[B-3] trackAnalysisStart Meta error:', err) }
        safeTrack('analysis_start', {
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackStep1Complete: (params: { language?: string }) => {
        safeTrack('step1_complete', {
          language: params.language,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackQuestionAnswered: (params: { questionId: string; answer: string; language?: string }) => {
        safeTrack('question_answered', {
          question_id: params.questionId,
          answer: params.answer,
          language: params.language,
          device_type: getDeviceType(),
        })
      },

      trackAnalysisSubmit: (params: { archetype: string; lifePathNumber?: number; language?: string; region?: string }) => {
        safeTrack('analysis_submit', {
          archetype: params.archetype,
          life_path_number: params.lifePathNumber,
          language: params.language,
          region: params.region,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackPreviewLoadingStart: () => {
        safeTrack('preview_loading_start', {
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackPreviewLoaded: (params: { archetype: string; lifePathNumber?: number; tradition?: string; language?: string }) => {
        safeTrack('preview_loaded', {
          archetype: params.archetype,
          life_path_number: params.lifePathNumber,
          tradition: params.tradition,
          language: params.language,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackPaywallView: (params: { archetype?: string; language?: string; region?: string }) => {
        safeTrack('paywall_view', {
          archetype: params.archetype,
          language: params.language,
          region: params.region,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackTierSelected: (params: { tier: number; price: number; archetype?: string; language?: string }) => {
        safeTrack('tier_selected', {
          tier: params.tier,
          price: params.price,
          archetype: params.archetype,
          language: params.language,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackUpsellViewed: (params: { type: 'compatibility' | 'calendar' | 'birthChart' | 'bundle'; archetype?: string; language?: string }) => {
        safeTrack('upsell_viewed', {
          upsell_type: params.type,
          archetype: params.archetype,
          language: params.language,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackUpsellAccepted: (params: { type: 'compatibility' | 'calendar' | 'birthChart' | 'bundle'; price: number; archetype?: string; language?: string }) => {
        safeTrack('upsell_accepted', {
          upsell_type: params.type,
          price: params.price,
          archetype: params.archetype,
          language: params.language,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackReportViewed: (params: { archetype: string; lifePathNumber?: number; language?: string; region?: string }) => {
        safeTrack('report_viewed', {
          archetype: params.archetype,
          life_path_number: params.lifePathNumber,
          language: params.language,
          region: params.region,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackShareCardOpened: () => {
        safeTrack('share_card_opened', { device_type: getDeviceType() })
      },

      trackShareCardDownloaded: () => {
        safeTrack('share_card_downloaded', { device_type: getDeviceType() })
      },

      trackEmailCaptureSuccess: (params: { source: 'paywall' | 'report' | 'opt-in'; language?: string }) => {
        safeTrack('email_capture_success', {
          source: params.source,
          language: params.language,
          device_type: getDeviceType(),
          ...getUtmParams(),
        })
      },

      trackCustomEvent: (eventName: string, params?: Record<string, unknown>) => {
        safeTrack(eventName, { ...params, device_type: getDeviceType(), ...getUtmParams() })
      },

      identifyUser: async (email: string): Promise<void> => {
        try {
          if (!tiktokPixelId || !(window as any).ttq) return
          const hashed = await hashEmail(email)
          ;(window as any).ttq.identify({
            email: hashed,
            phone_number: '',
          })
        } catch (err) {
          console.warn('[B-3] identifyUser TikTok error:', err)
        }
      },
    },
  }
})
