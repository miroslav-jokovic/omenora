import { calculateLifePathNumber } from '../lifePathNumber'

describe('calculateLifePathNumber', () => {
  it('reduces to a single digit', () => {
    expect(calculateLifePathNumber('1990-01-01')).toBe(3)
    expect(calculateLifePathNumber('2017-04-20')).toBe(7)
  })
  it('preserves master numbers 11/22/33', () => {
    expect(calculateLifePathNumber('1993-01-06')).toBe(11)
    expect(calculateLifePathNumber('1990-12-29')).toBe(33)
  })
})
