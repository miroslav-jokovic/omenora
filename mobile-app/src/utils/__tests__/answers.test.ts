import { remapAnswersForBackend } from '../answers'

describe('remapAnswersForBackend', () => {
  it('maps known keys to p1/p2/p3', () => {
    expect(
      remapAnswersForBackend({ life_focus: 'love', tone_pref: 'gentle', astro_familiarity: 'some' }),
    ).toEqual({ p1: 'love', p2: 'gentle', p3: 'some' })
  })
  it('falls back to defaults for missing keys', () => {
    expect(remapAnswersForBackend({})).toEqual({ p1: 'growth', p2: 'direct', p3: 'self' })
  })
})
