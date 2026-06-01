/**
 * App Configuration
 */

// API Configuration
// Set EXPO_PUBLIC_API_BASE_URL in .env to override (e.g. local dev IP)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.omenora.com';

// App Info
export const APP_NAME = 'OMENORA';
export const APP_VERSION = '1.0.0';
export const APP_STORE_URL = 'https://apps.apple.com/app/omenora';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.omenora.app';

// Feature Flags
export const FEATURES = {
  APPLE_SIGN_IN: true,
  GOOGLE_PAY: true,
  APPLE_PAY: true,
  PUSH_NOTIFICATIONS: true,
  DARK_MODE_ONLY: true,
} as const;

// Reading Types
export const READING_TYPES = {
  DESTINY: 'destiny',
  BIRTH_CHART: 'birth-chart',
  COMPATIBILITY: 'compatibility',
  CALENDAR: 'calendar',
  DAILY_INSIGHT: 'daily-insight',
} as const;

// Zodiac Signs
export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

// Life Path Numbers
export const LIFE_PATH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33] as const;
