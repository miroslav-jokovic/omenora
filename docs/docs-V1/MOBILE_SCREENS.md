# MOBILE_SCREENS.md

> **Scope:** Conversion-surface screens of the OMENORA mobile app — the onboarding funnel, the four tabs (conversion-relevant blocks), and the purchase surfaces. Pure-utility settings screens (Language, Privacy, Notifications, Delete Account, Terms, Privacy Policy) are intentionally out of scope for this pass and can be added later.
> **Status:** DRAFT for founder review. On ratification, place in `docs-V1/` as a master document.
> **Source of truth:** Written from a verbatim code capture of `release/v1-launch` after the A1–A6 conversion batch (commits `592fd07`, `af2c9ef`, `47d41ab`, `005ab54`, `221b579`, `08295e8`). Copy quoted here is the committed copy as of that capture.
> **Governing strategy:** STRATEGY.md is supreme. Mobile is the product; web acquires (PLATFORM_BOUNDARY.md). Hard paywall, no trial. Engineer desire, never regret — every surface makes the user *want* something; none tricks, shames, or obstructs (confirmed dark-pattern-clean in Audit 1/J7).

---

## 1. Funnel architecture (how the surfaces chain)

The new-user journey is a single persuasion sequence, each step setting up the next:

1. **Welcome** — sets the promise (what OMENORA is + the payoff) and creates pull.
2. **Name → Date → City → Time** — data collection, each step stating *why* it shapes the reading (value-anticipation, not a chore). Time is optional.
3. **Calculating** — transition.
4. **Big Three Reveal** — the aha moment; delivers Sun/Moon/Rising + archetype and **opens a curiosity loop** ("This is the surface. Beneath it…") naming what's still unseen.
5. **Save Your Reading** — account capture, framed as keeping the reading (backup intent, not a paywall — the auto-paywall here was removed, commit `8d92d23`).
6. **Optional Questions** — three personalization questions; skippable.
7. **Premium Teaser** — the post-reveal paywall; the loop opened at step 4 is paid off here ("The rest of your chart is still sealed").
8. **MainTabs (Today/Readings/Counsel/More)** — the returning surface. Today carries the daily habit loop and the free→premium conversion surface.

**Open-loop spine:** Welcome promises "your full chart — who you are, the patterns shaping your life, what's ahead" → the Reveal names the specific unseen pieces (shadow, the other planets, timing) → the locked cards and PremiumTeaser name and sell exactly those pieces. The promise, the loop, and the payoff use the same three concrete strokes throughout.

---

## 2. Onboarding funnel — screen by screen

### WelcomeScreen
- **Purpose:** Orient a cold user and create pull into the funnel.
- **Copy:** Eyebrow "An invitation" · Headline "Begin with the night you were born" (emphasis on "born") · Subheadline "From your birth moment, OMENORA reads your full chart — who you are, the patterns shaping your life, and what's ahead. It takes a minute." · CTA "Reveal my chart" → Name · Secondary "Already have an account? Sign in" · Legal "By continuing you agree to our Terms and Privacy Policy".
- **Conversion role:** Orientation + promise (lever: clear value-first framing). The subheadline names the product, the three-part payoff, and effort expectation in one breath. (A2)

### NameScreen
- **Copy:** Eyebrow "YOUR NAME" · Heading "What shall we call you?" · Support "So your reading speaks to you directly." · CTA "Continue" → DateOfBirth.
- **Role:** Lowest-friction ask; reason stated (personalization). (A4)

### DateOfBirthScreen
- **Copy:** Eyebrow "YOUR DAY" · Heading "When were you born?" · Support "Your birth date sets your Sun sign and the foundation of your chart." · CTA "Continue" → BirthCity.
- **Role:** Names the concrete output (Sun sign + foundation). (A4)

### BirthCityScreen
- **Copy:** Eyebrow "YOUR PLACE" · Heading "Where were you born?" · Support "Where you were born sets your house system and how your chart is drawn — it's why we ask." · CTA "Continue" → BirthTime.
- **Role:** Highest-friction ask (city search); now carries the strongest "why" because it was the worst drop-off vector. Output named is *distinct* (house system) so no term repeats across steps. (A4)

### BirthTimeScreen
- **Copy:** Eyebrow "YOUR HOUR" · Heading "What time were you born?" · Support "Optional — your exact time sets your Rising sign and house placements. Even an estimate helps." · CTA "Continue" → Calculating (always enabled; time optional).
- **Role:** Optional ask, lowered bar ("even an estimate"); the only screen naming Rising sign. (A4)

### BigThreeRevealScreen
- **Purpose:** The aha moment + open the curiosity loop at peak engagement.
- **Copy:** Eyebrow "You are" · {archetypeName} · Curiosity line "This is the surface. Beneath it: your shadow, the seven planets you haven't met yet, and the timing of what's ahead." · CTA "Show me the rest" → (replace) SaveYourReading.
- **Conversion role:** Reveal-as-reciprocity + open loop (Zeigarnik). The curiosity line renders inside the archetype's 700ms fade, so it lands *with* the payoff. No paywall here. (A1)

### SaveYourReadingScreen
- **Copy:** Eyebrow "{greeting}'s reading" / "Your reading" · Hero "Save your reading" · Support "Your portrait lives only on this device. Sign in to keep it forever, on any device." · Auth: Apple (iOS), "Continue with Google", "Continue with email" · Decline "I understand, save it only on this device" → OptionalQuestions.
- **Role:** Account capture framed as backup. Decline is factual, not confirmshaming (clean). The post-reveal flow is forward-only (replace), nav-fix commit `63ca8ee`.

### OptionalQuestionsScreen
- **Purpose:** Personalization (3 questions): life focus (multi), tone preference (single), astrology familiarity (single).
- **Copy:** CTA "Continue"/"Finish"; secondary "Skip for now". Both → (replace) PremiumTeaser.
- **Role:** Low-pressure personalization; fully skippable. `gestureEnabled:false` (nav-fix).

### PremiumTeaserScreen
- **Purpose:** The post-reveal paywall; pays off the curiosity loop.
- **Copy:** Eyebrow "You are" · {archetypeName} (hero) · Benefit 1 "You've seen your Big Three. The rest of your chart is still sealed." · Benefit 2 "Inside: your full archetype portrait, every planet in your natal chart, your 90-day forecast, daily guidance written for your chart — and Counsel, your AI astrologer, on call." · Trust line "Every word calculated from your exact birth moment — not a sun-sign guess." · CTA "Open my reading" → presentPaywall() then MainTabs · Decline "I'll come back to my reading" → MainTabs.
- **Conversion role:** Loop payoff + anchoring + differentiator. Strongest single conversion copy in the app. **Note (known gap, W5):** reachable only during onboarding — a returning free user never sees it again.

---

## 3. The four tabs (conversion-relevant blocks)

### TodayScreen
- **Always free:** MoonPhaseHero; the day's theme label + first insight paragraph.
- **First-run intro card** — gated `storeHydrated && !isPremium && !hasSeenTodayIntro` (glass card): Title "Welcome in{, firstName}" · Body "Your daily reading above is yours, free, every day. Your full chart — shadow, planets, timing, and guidance for love, work, and health — unlocks with Premium. Tap any locked card below to see what's inside." · Dismiss X sets persisted `hasSeenTodayIntro`. Orientation only — no CTA, no paywall call; points to the locked cards. Show-once, hydration-gated so it never re-nags. (A5)
- **Locked card 1** (`!isPremium`): "Your Full Daily Reading" — "Today's full reading: the cosmic stage you're moving through, a reflection written for your archetype, and the planetary weather shaping your day." → presentPaywall. (A3)
- **Locked card 2** (`!isPremium && zodiacContent`): "Today's Life Dimensions" — "How today lands for your Love, Work, and Health — guidance for each, read from your chart and today's transits." → presentPaywall. (A3)
- **Premium-only:** Love/Work/Health dimension cards; "Reflection" card; "Today's cosmic stage" (planetary weather) card; CTAs card ("Ask Counsel about today" / "What's coming next").
- **Conversion role:** The daily habit loop (date-keyed content — the strongest retention asset) *and* the recurring free→premium surface. Locked-card copy names real premium content (verified), so it's specificity-as-proof, not vibe.

### ReadingsScreen — locked feature cards (`!isPremium` branches)
- **Full Archetype Reading** — "Shadow, gifts, and the patterns that shape your life" / "The complete psychological framework of your archetype — how you move through the world, your shadow side, your core gifts, and how you show up in love and work."
- **Complete Natal Chart** — "Every planet. Every house. Your full birth chart." / "All 10 planets in your chart — their signs, houses, aspects, and what each placement means for you personally."
- **90-Day Forecast** — "The major themes, transits, and timing ahead" / "Month-by-month planetary guidance — key transits, peak periods, and how to move through each phase with your chart in mind."
- **Conversion role:** The specificity benchmark — names concrete artifacts. Premium branches render generate/result/loading/error states.

### CounselScreen
- **Always:** Heading "Ask Counsel anything about your chart" · Subheading "Personal guidance from your full birth chart".
- **Premium (`isPremium`):** CTA "Open Counsel" → CounselChat. *(The subheading "Personal guidance from your full birth chart" repeats here — minor de-dup candidate.)*
- **Free (`!isPremium`):** Sample question chips (visual-only, dynamic on sunSign): "What's coming up for me this week?" · "How do I align with my Sun in {sign}?" · "Why does this pattern keep showing up?" · "What's the meaning behind today's mood?" · CTA "Start chatting" → presentPaywall · Secondary "Or pay per conversation — from {sparkPrice}" → BoostPackSheet · Support "Tap to unlock Counsel".
- **Conversion role:** Counsel is the engagement/retention anchor and the boost-pack expansion-revenue entry. Sample questions are the strongest copy here. Cap: 30 conversations/month (see reconciliation).

### MoreScreen — Premium Features section
- **Rows (no isPremium gate — all users see them):** "Compatibility" → Compatibility · "Lucky Timing Calendar" → Calendar · "Tradition switcher" → TraditionSwitcher.
- **Conversion role / known gap (W4):** These are the ONLY entry points to the three paid funnels from the tab UI — buried in settings with no in-context teaser. The entry exists; discoverability and desire-creation do not. (Audit 1/J5)

---

## 4. Purchase surfaces

### BoostPackSheet
- **Shared description (A6):** "Each conversation is a full back-and-forth with Counsel about your chart — ask follow-ups, go deeper, get guidance grounded in your exact placements."
- **Packs:** "5 Spark Conversations" (eyebrow "TRY A FEW MORE COUNSEL SESSIONS", fallback $1.99) · "15 Insight Conversations" (eyebrow "MOST POPULAR", fallback $4.99, **recommended**) · "35 Ascend Conversations" (eyebrow "BEST VALUE — SAVE 28%", fallback $9.99).
- **Per-conversation unit line:** live-computed "≈ {price} per conversation" (Intl currency format, live RC price only; omitted if offering unloaded — never from fallback). (commit `a2a20ab`)
- **Recommended emphasis:** Insight pack gets distinct border + fill (existing tokens).
- **Role:** Consumable Counsel credits; anchoring (decoy structure made concrete). Consumables NOT attached to entitlements.

### CompatibilityIAPSheet
- **One-time:** "Single Compatibility Reading" / "Full chart compatibility analysis for two people." / "Buy for {price}" (fallback $4.99).
- **Upsell:** "OMENORA Premium" / "Includes 10 compatibility readings/month + full Reading & Counsel access." / "See subscription plans".

### CalendarIAPSheet
- **One-time:** "2026 Lucky Timing Calendar" / "Auspicious dates for love, work, money, and major decisions — all 12 months of 2026." / "Buy for {price}" (fallback $4.99).
- **Upsell:** "OMENORA Premium" / "Includes the 2026 calendar + monthly readings, tradition switching, and Counsel chat." / "See subscription plans". Restore Purchases link present.

### PostPurchaseUpsellSheet
- **Copy:** "Make it unlimited" / "You just added {n} conversations. With Premium you get 30 every month — and the {n} you just bought stack on top. Nothing you paid for goes away." · CTAs "Upgrade to Premium" / "Keep chatting".
- **Role:** Expansion revenue after a boost purchase; loss-protection framing ("nothing you paid for goes away") is desire-positive, not pressure.

---

## 5. Reconciliation — corrections owed to other master docs

These were verified against code during this pass. Each needs the matching edit in the named doc (founder decides propagation):

1. **Counsel cap is 30/MONTH, not 30/day.** Verified: `augur/server/utils/entitlements.ts` → `counsel: { cap: 30, period: 'monthly' }`. **PRODUCT_MAP §5's "30/day, must fix before ship" note is STALE and wrong** — no fix is needed; the doc note should be corrected. PLATFORM_BOUNDARY §7 was already correct.
2. **PRODUCT_MAP §6.3 "$12.99 Full Oracle" row has no mobile referent.** Grep of `mobile-app/src` for both "12.99" and "Full Oracle" → not found. The stale row should be removed/annotated.
3. **14-day refund language is web-only.** Mobile refunds route to Apple/Google (TermsScreen, commit `5dccf25`). Any doc implying an app-side 14-day/developer refund should annotate it web-only.
4. **`hasAcceptedCounselDisclosure` latent hydration bug (known, v1.1).** `CounselChatScreen.tsx` reads the flag at mount with no `storeHydrated` guard (unlike the A5 Today fix and SplashScreen). It escapes in practice because reaching Counsel takes navigation latency that lets persist rehydrate. Not urgent; fix when Counsel is touched in v1.1 by reusing `useProfileStore.persist.hasHydrated()`/`onFinishHydration()`.

---

## 6. Minor tidy candidates (non-blocking)

- CounselScreen subheading "Personal guidance from your full birth chart" appears twice (hero + premium block) — de-dup candidate.
- MoreScreen "Tradition switcher" is lowercase-t and reads like a toggle, not a feature — naming candidate when W4 surfaces these funnels.

---

*Born from verified code capture. Update only on explicit decision; keep in sync with code (docs beat code on conflict — reconcile, don't drift).*
