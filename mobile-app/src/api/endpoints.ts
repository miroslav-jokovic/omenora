import apiClient from './client';
import type { Report } from '../stores/profileStore';
import type { CalendarData } from '../types/calendar';

// Types
export interface GenerateReportRequest {
  firstName: string;
  dateOfBirth: string;
  timeOfBirth?: string;
  city: string;
  answers: Record<string, string>;
  archetype?: string | null;
  lifePathNumber?: number;
  region?: string;
  language?: string;
}

export interface GenerateReportResponse {
  success: boolean;
  report: Report;
}

export interface CompatibilityRequest {
  firstName:      string
  partnerName:    string
  partnerDob:     string            // ISO YYYY-MM-DD
  partnerCity:    string | null
  language:       string
  previewMode:    boolean
  archetype:      string
  element:        string
  lifePathNumber: number
  powerTraits:    string[]
  dateOfBirth:    string
}

export interface CompatibilitySection {
  title:   string
  content: string
}

export interface CompatibilityReading {
  compatibilityScore: number
  compatibilityTitle: string
  sections: {
    bond:          CompatibilitySection
    strength:      CompatibilitySection
    challenge:     CompatibilitySection
    communication: CompatibilitySection
    powerDynamic:  CompatibilitySection
    forecast:      CompatibilitySection
    advice:        CompatibilitySection
  }
  calculationReceipt: {
    person1: {
      name:           string
      dateOfBirth:    string
      sunSign:        string
      element:        string
      lifePathNumber: number | null
      archetype:      string | null
    }
    person2: {
      name:           string
      dateOfBirth:    string
      sunSign:        string
      element:        string
      lifePathNumber: number
    }
    synastryNotes:    string[]
    tradition:        string
    calculationSource: string
    generatedAt:      string
  }
}

export interface CompatibilityResponse {
  success:       boolean
  compatibility: CompatibilityReading
  usage:         CounselUsage
}

export interface DailyInsightRequest {
  email: string;
  lifePathNumber: number;
  zodiacSign?: string;
}

export interface GenerateBirthChartRequest {
  firstName:       string
  dateOfBirth:     string
  timeOfBirth?:    string
  city?:           string
  archetype?:      string
  lifePathNumber?: number
  language?:       string
}

export interface GenerateBirthChartResponse {
  success:      boolean
  noonFallback: boolean
  birthChart: {
    risingSign:     string
    sunSign:        string
    moonSign:       string
    dominantPlanet: string
    powerHouse:     string
    chartTitle:     string
    reading:        string
    forecast2026:   string
    archetype:      string
  }
}

export interface GenerateCalendarRequest {
  firstName:      string
  archetype:      string
  element:        string
  lifePathNumber: number
  dateOfBirth:    string
  language:       string
  answers:        Record<string, string>   // keys: p1, p2, p3
}

export interface GenerateCalendarResponse {
  success:  boolean
  calendar: CalendarData
}

export interface ReportStubResponse {
  ok:      boolean
  feature: string
  usage:   { count: number; cap: number; period: string; resets_at: string }
  note?:   string
}

// ── In-app reading types (Phase 5) ────────────────────────────────────────────
// These mirror augur/server/utils/ai-schemas.ts schemas — keep in sync manually.
// Mobile cannot import from /augur; types are duplicated by design.

export interface ReadingRequestBase {
  firstName:      string
  archetype:      string
  element:        string
  lifePathNumber: number
  dateOfBirth:    string
  language:       string
  powerTraits:    string[]
  sunSign:        string | null
  moonSign:       string | null
  risingSign:     string | null
  answers:        { p1: string; p2: string; p3: string }   // remapped by remapAnswersForBackend
}

export interface GetArchetypeReadingRequest extends ReadingRequestBase {}
export interface GetNatalChartReadingRequest extends ReadingRequestBase {}
export interface GetForecastReadingRequest extends ReadingRequestBase {}

export interface ReadingSection {
  title:   string
  content: string
}

export interface ArchetypeReading {
  archetypeName:    string
  archetypeSymbol?: string
  element:          string
  powerTraits:      string[]
  sections: {
    identity:    ReadingSection
    science:     ReadingSection
    shadow:      ReadingSection
    purpose:     ReadingSection
    gift:        ReadingSection
    affirmation: ReadingSection
  }
}

export interface GetArchetypeReadingResponse {
  success: boolean
  reading: ArchetypeReading
  usage:   { count: number; cap: number; period: string; resets_at: string }
}

export interface NatalChartReading {
  bigThree: {
    sun:    { sign: string; house: number; description: string }
    moon:   { sign: string; house: number; description: string }
    rising: { sign: string; house: number; description: string }
  }
  planets: Array<{
    planet:      string
    sign:        string
    house:       number
    retrograde:  boolean
    description: string
  }>
  aspects: Array<{
    from:    string
    to:      string
    type:    'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile'
    orb:     number
    meaning: string
  }>
  dominantElement: 'Fire' | 'Earth' | 'Air' | 'Water'
  dominantQuality: 'Cardinal' | 'Fixed' | 'Mutable'
  interpretation:  string
}

export interface GetNatalChartReadingResponse {
  success: boolean
  reading: NatalChartReading
  usage:   { count: number; cap: number; period: string; resets_at: string }
}

export interface ForecastReading {
  period: { start: string; end: string }
  overallTheme: string
  keyTransits: Array<{
    date:    string
    planet:  string
    aspect:  string
    area:    'relationships' | 'career' | 'identity' | 'home' | 'finance' | 'spiritual'
    meaning: string
  }>
  monthlyHighlights: Array<{
    month:       string
    theme:       string
    caution:     string | null
    opportunity: string
  }>
  advice: string
}

export interface GetForecastReadingResponse {
  success: boolean
  reading: ForecastReading
  usage:   { count: number; cap: number; period: string; resets_at: string }
}

export interface GetDailyCacheRequest {
  date:      string   // ISO YYYY-MM-DD
  language?: string   // 'en' | 'es' | 'pt' | 'hi' | 'ko' | 'zh'
}

export interface ArchetypeRow {
  theme:      string
  insight:    string
  reflection: string
  moon_phase: string
}

export interface ZodiacRow {
  horoscope:         string
  love:              string
  job:               string
  health:            string
  theme:             string
  moon_phase:        string
  sun_sign:          string
  moon_sign:         string
  planetary_weather: string
}

export interface GetDailyCacheResponse {
  success:     boolean
  date:        string
  isYesterday: boolean
  archetypes:  Record<string, ArchetypeRow>
  zodiac:      Record<string, ZodiacRow>
}

// ── Counsel (Phase 5) ────────────────────────────────────────────────────────

export type UsagePremium = {
  source:    'premium'
  count:     number
  cap:       number
  period:    string
  resets_at: string
}

export type UsageCredit = {
  source:                   'credit'
  credit_balance_remaining: number
}

export type CounselUsage = UsagePremium | UsageCredit

export interface CounselConversationTurn {
  role:    'user' | 'assistant'
  content: string
}

export interface CounselChartContext {
  firstName:      string
  archetype:      string
  element:        string
  lifePathNumber: number
  sunSign:        string | null
  moonSign:       string | null
  risingSign:     string | null
  powerTraits:    string[]
  tradition:      string
}

export interface CounselMessageRequest {
  message:              string
  conversation_history: CounselConversationTurn[]
  chart_context:        CounselChartContext
}

export interface CounselMessageResponse {
  success:  boolean
  response: string
  usage:    CounselUsage
}

// API Endpoints
export const api = {
  // Report Generation
  generateReport: async (data: GenerateReportRequest): Promise<GenerateReportResponse> => {
    const response = await apiClient.post('/api/generate-report', data);
    return response.data;
  },

  getReport: async (reportId: string): Promise<GenerateReportResponse> => {
    const response = await apiClient.post('/api/get-report', { reportId });
    return response.data;
  },

  checkReportExists: async (firstName: string, dateOfBirth: string): Promise<{ exists: boolean; reportId?: string }> => {
    const response = await apiClient.post('/api/check-report-exists', { firstName, dateOfBirth });
    return response.data;
  },

  // Birth Chart
  generateBirthChart: async (data: GenerateBirthChartRequest): Promise<GenerateBirthChartResponse> => {
    const response = await apiClient.post<GenerateBirthChartResponse>('/api/generate-birth-chart', data);
    return response.data;
  },

  // Compatibility
  generateCompatibility: async (data: CompatibilityRequest): Promise<CompatibilityResponse> => {
    const response = await apiClient.post<CompatibilityResponse>('/api/generate-compatibility', data)
    return response.data
  },

  // Calendar
  generateCalendar: async (data: GenerateCalendarRequest): Promise<GenerateCalendarResponse> => {
    const response = await apiClient.post<GenerateCalendarResponse>('/api/generate-calendar', data);
    return response.data;
  },

  getCalendar: async (sessionId: string) => {
    const response = await apiClient.post('/api/get-calendar', { sessionId });
    return response.data;
  },

  // Daily Insights
  generateDailyInsight: async (data: DailyInsightRequest) => {
    const response = await apiClient.post('/api/generate-daily-insight', data);
    return response.data;
  },

  // Health Check
  healthCheck: async () => {
    const response = await apiClient.get('/api/health');
    return response.data;
  },

  // Region Detection
  detectRegion: async () => {
    const response = await apiClient.get('/api/detect-region');
    return response.data;
  },

  // Reports (Phase 5 — typed request bodies + real response shapes)
  getArchetypeReading: async (data: GetArchetypeReadingRequest): Promise<GetArchetypeReadingResponse> => {
    const response = await apiClient.post<GetArchetypeReadingResponse>('/api/reports/archetype', data);
    return response.data;
  },

  getNatalChart: async (data: GetNatalChartReadingRequest): Promise<GetNatalChartReadingResponse> => {
    const response = await apiClient.post<GetNatalChartReadingResponse>('/api/reports/natal-chart', data);
    return response.data;
  },

  getForecast: async (data: GetForecastReadingRequest): Promise<GetForecastReadingResponse> => {
    const response = await apiClient.post<GetForecastReadingResponse>('/api/reports/forecast', data);
    return response.data;
  },

  // Daily Cache
  getDailyCache: async (data: GetDailyCacheRequest): Promise<GetDailyCacheResponse> => {
    const response = await apiClient.post<GetDailyCacheResponse>('/api/get-daily-cache', data);
    return response.data;
  },

  // Counsel (Phase 5)
  counselMessage: async (data: CounselMessageRequest): Promise<CounselMessageResponse> => {
    const response = await apiClient.post<CounselMessageResponse>('/api/counsel/message', data);
    return response.data;
  },
};

export default api;
