/**
 * Remaps profileStore.answers keys (life_focus, tone_pref, astro_familiarity)
 * to backend-expected keys (p1, p2, p3).
 *
 * The mismatch was surfaced in Phase 4 Cluster 3 recon and resolved in
 * Phase 5 Cluster 0 per [DECISION 4 in plan amendments 55a6391].
 *
 * Backend reads:
 *   - p1: primary focus for the period (from life_focus)
 *   - p2: insight tone preference (from tone_pref)
 *   - p3: reason for seeking the reading (from astro_familiarity)
 */
export function remapAnswersForBackend(
  answers: Record<string, string>
): { p1: string; p2: string; p3: string } {
  return {
    p1: answers.life_focus        ?? 'growth',   // fallback matches backend default
    p2: answers.tone_pref         ?? 'direct',
    p3: answers.astro_familiarity ?? 'self',
  }
}
