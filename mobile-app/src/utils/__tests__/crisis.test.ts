import { detectCrisisKeywords } from '../crisis'

describe('detectCrisisKeywords', () => {
  it('detects crisis phrases case-insensitively', () => {
    expect(detectCrisisKeywords('I am suicidal')).toBe(true)
    expect(detectCrisisKeywords('I want to DIE')).toBe(true)
    expect(detectCrisisKeywords('kill myself')).toBe(true)
    expect(detectCrisisKeywords('No reason to live anymore')).toBe(true)
  })
  it('returns false for benign messages', () => {
    expect(detectCrisisKeywords('What does my Sun sign mean?')).toBe(false)
    expect(detectCrisisKeywords('')).toBe(false)
  })
})
