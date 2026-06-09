import { timeUntil, isPastDate } from '../time'

describe('isPastDate', () => {
  it('is true for past dates and false for future dates', () => {
    expect(isPastDate('2000-01-01')).toBe(true)
    expect(isPastDate('2099-12-31')).toBe(false)
  })
})

describe('timeUntil', () => {
  it('returns "soon" for past timestamps', () => {
    expect(timeUntil('2000-01-01T00:00:00Z')).toBe('soon')
  })
  it('formats minutes and hours for future timestamps', () => {
    const in30min = new Date(Date.now() + 30 * 60_000).toISOString()
    expect(timeUntil(in30min)).toMatch(/minute/)
    const in3h = new Date(Date.now() + 3 * 60 * 60_000).toISOString()
    expect(timeUntil(in3h)).toMatch(/hour/)
  })
})
