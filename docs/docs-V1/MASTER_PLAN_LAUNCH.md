# OMENORA Mobile — Launch Master Plan (Source of Truth)
**Created:** 2026-06-05 · Supersedes ad-hoc sequencing in OMENORA_LAUNCH_HANDOFF.md for the polish/hardening arc.

## Working model (locked)
Claude = strategic PM + prompt architect (writes Windsurf prompts, **no code in prompts**) + dashboard troubleshooter. Windsurf = audits + implements. Miki runs all git/dashboard. Discipline: research-driven (no memory/assumptions), one task at a time, audit-before-implement, verify-before-commit. Avoid: easy-path-over-correct-path, generic playbooks, restating decisions instead of acting.

## Locked product decisions
1. **Custom-only paywall.** Drop RC hosted sub paywall; build one OMENORA custom RN subscription sheet, repoint all 11 hosted call-sites. RC SDK remains billing layer. One sheet renders iOS + Android.
2. **Both stores**, but iOS fully aligned/polished first, then Android. Submit both at the end.
3. **Instrumentation = PostHog** (already on web; reuse same project). A/B via PostHog feature flags replaces the RC hosted-paywall A/B we gave up.
4. **Identity bridge = Supabase user UUID** (already used for `Purchases.logIn`). Web must call `identify(uuid)`; mobile captures with same id.

## The 5 per-screen axes (Phase 1)
visual · logical/functional · conversion-optimization · instrumentation · compliance.

## Scope decisions (2026-06-05)
- **i18n** → fast-follow v1.1 (no framework, every screen hardcoded EN; backend already returns 10 langs).
- **Tests** → money-path smoke tests only before launch (entitlement gating, 3 purchase flows, anon→permanent merge). Full suite v1.1.
- **Accessibility** → bulk a11y = v1.1; EXCEPTION: a11y labels on paywall/IAP sheets done in their Phase-1 pass (VoiceOver confusion in a purchase sheet = lost sale).
- **Permissions** → remove all 4 unused declarations (camera/mic/photo + location). Re-add per-feature when actually built.

---

## TRIAGE — engineering baseline audit (severity corrected by PM)
Audit claimed 5 blockers. Corrected:

**TRUE store blockers:**
- **B1 — Apple Sign-In token revocation on account deletion** (§1.8/§5.4). Apple 5.1.1(v). Inline code comment admits gap. Needs server-side Apple REST `/auth/revoke`. *Research-gated.*
- **B2 — Unused/misleading permissions** (§5.6 location, §5.7 camera/mic/photo "does not require" strings). Elevated from HARDEN. Remove the keys.

**Downgraded (not store blockers):**
- ATT (§5.1) → research-confirmed: RC doesn't use IDFA unless `collectDeviceIdentifiers` is called; no ad SDK on mobile. Verify code, then do NOT add prompt.
- EAS submit placeholders (§8.1) → blocks `eas submit` tool, not review. Trivial fill (known IDs).
- Zero tests (§10.1) → not a store gate. High-priority hardening; money-path smoke tests only.

---

## PHASES

### Phase 0 — Foundations
- **0A — Launch-blocker sweep:** B2 remove unused perms + ATT verify-then-leave + EAS submit fill *(in progress)* → then B1 Apple token revocation *(research-gated)*.
- **0B — Security/observability hardening:** SecureStore for session+PII (§1.1/§2.3/§5.3) · strip `console.*` in prod + kill `token_hash` log (§1.6/§3.4) · `Sentry.captureException` on purchase/auth/profile failures (§3.2) · root→per-screen error boundary (§3.3) · 401 token-refresh (§3.6) · retry on AI endpoints (§7.4).
- **0C — F1 PostHog:** install RN SDK · event taxonomy (funnel/surfaces/intent/upsell/gates) · identity bridge on Supabase UUID · web `identify()` fix · wire dead `analyticsEnabled` opt-out (§5.2) · enable RC→PostHog lifecycle forwarding.
- **0D — F2 custom subscription sheet** + repoint 11 hosted call-sites + PostHog A/B scaffold.

### Phase 1 — Screen passes (revenue-priority, 5 axes each)
Onboarding → Today (insightP1 leak) → Readings → Counsel → Compatibility → Calendar → Boosts+upsell → Subscription sheet conversion polish → More/Settings. Folds in: paywall/IAP-sheet a11y, money-path smoke tests, compliance (Restore on 2 sheets §6.4-recon, disclosure hydration race §6.3-recon).

### Phase 2 — Android enablement
RC Android SDK path + Android API key · Play Console + Play Billing · recreate products · Android offerings · Play listing · Android test sweep.

### Phase 3 — Submission (both stores)
ASC version-attach + listing assets + App Privacy questionnaire + encryption declaration · backend: Anthropic key to Railway PROD **before** `main` deploy · sandbox sweep · Play submission.

---

## Audit artifacts (docs-V1/)
- AUDIT_RECON_2026-06-05.md — screens/gating/paywall/RC parity/instrumentation/credits
- AUDIT_POSTHOG_2026-06-05.md — web+mobile PostHog state, identity bridge
- AUDIT_ENGINEERING_BASELINE_2026-06-05.md — security/arch/observability/perf/privacy/a11y/build/deps/tests/i18n

## NEXT ACTION
0A-1 launch config hygiene (perms removal + ATT verify + EAS fill) → then 0A-2 Apple token revocation (research → audit → spec).
