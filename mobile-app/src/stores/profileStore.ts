import { create } from 'zustand';
import * as Sentry from '@sentry/react-native';
import type { CalendarData } from '../types/calendar';
import type { ArchetypeReading, NatalChartReading, ForecastReading } from '../api/endpoints';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveProfile, ProfileSaveError } from '../services/profileService';
import type { ProfilePayload } from '../services/profileService';

export interface ReportSection {
  title: string;
  content: string;
}

export interface Report {
  archetypeSymbol: string;
  archetypeName: string;
  element: string;
  powerTraits: string[];
  sections: {
    identity:    ReportSection;
    science:     ReportSection;
    forecast:    ReportSection;
    love:        ReportSection;
    purpose:     ReportSection;
    gift:        ReportSection;
    affirmation: ReportSection;
    [key: string]: ReportSection;
  };
}

export interface ProfileState {
  // User Input
  firstName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  city: string;

  // Answers to personality questions
  answers: Record<string, string>;

  // Calculated Results
  lifePathNumber: number | null;
  archetype: string | null;
  sunSign:    string | null;
  moonSign:   string | null;
  risingSign: string | null;
  reportId: string | null;
  report: Report | null;
  anonymousUserId: string;

  // Region
  regionOverride: string | null;
  languageOverride: string | null;

  // Calendar cache
  calendarData: CalendarData | null;
  setCalendarData: (data: CalendarData | null) => void;

  // Reading caches (Phase 5 Cluster 4)
  archetypeReading:     ArchetypeReading | null;
  setArchetypeReading:  (data: ArchetypeReading | null) => void;

  natalChartReading:    NatalChartReading | null;
  setNatalChartReading: (data: NatalChartReading | null) => void;

  forecastReading:      ForecastReading | null;
  setForecastReading:   (data: ForecastReading | null) => void;

  // Save-reading re-prompt counters
  saveDeclineCount: number;
  saveLastDeclinedAt: number | null;
  setSaveDeclineCount: (count: number) => void;
  setSaveLastDeclinedAt: (ts: number | null) => void;

  // Boost-pack post-purchase upsell frequency cap
  boostUpsellDismissedAt: number | null;
  setBoostUpsellDismissedAt: (ts: number | null) => void;

  // Analytics preferences
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;

  // Consent flags
  hasAcceptedCounselDisclosure:    boolean;
  setHasAcceptedCounselDisclosure: (accepted: boolean) => void;

  // First-run orientation flags
  hasSeenTodayIntro:    boolean;
  setHasSeenTodayIntro: (seen: boolean) => void;

  // Actions
  setFirstName: (name: string) => void;
  setDateOfBirth: (date: string) => void;
  setTimeOfBirth: (time: string) => void;
  setCity: (city: string) => void;
  setAnswer: (questionId: string, value: string) => void;
  setLifePathNumber: (number: number) => void;
  setArchetype:  (archetype: string) => void;
  setSunSign:    (sunSign: string | null) => void;
  setMoonSign:   (moonSign: string | null) => void;
  setRisingSign: (risingSign: string | null) => void;
  setReportId: (id: string) => void;
  setReport: (report: Report | null) => void;
  setAnonymousUserId: (id: string) => void;
  setRegionOverride: (region: string) => void;
  setLanguageOverride: (lang: string) => void;
  changeLanguage: (newLang: string) => void;

  // Server sync
  pendingServerSync: boolean;
  setPendingServerSync: (v: boolean) => void;
  setAnswers: (answers: Record<string, string>) => void;
  commitProfileToServer: (userId: string) => Promise<void>;

  // Reset
  resetAnalysis: () => void;
  resetAll: () => void;
  reset: () => void;

  // Initialize
  initialize: () => Promise<void>;
}

const initialState = {
  firstName: '',
  dateOfBirth: '',
  timeOfBirth: '',
  city: '',
  answers: {},
  lifePathNumber: null,
  archetype: null,
  sunSign:    null,
  moonSign:   null,
  risingSign: null,
  reportId: null,
  report: null,
  anonymousUserId: '',
  regionOverride: null,
  languageOverride: null,
  calendarData: null,
  archetypeReading:  null,
  natalChartReading: null,
  forecastReading:   null,
  hasAcceptedCounselDisclosure: false,
  hasSeenTodayIntro: false,
  analyticsEnabled: true,
  pendingServerSync: false,
  saveDeclineCount: 0,
  saveLastDeclinedAt: null,
  boostUpsellDismissedAt: null,
};

export const useProfileComplete = () =>
  useProfileStore((s) => s.archetype !== null && s.dateOfBirth !== '' && s.sunSign !== null)

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...initialState,

      setFirstName: (firstName) => set({ firstName }),
      setDateOfBirth: (dateOfBirth) => set({ dateOfBirth }),
      setTimeOfBirth: (timeOfBirth) => set({ timeOfBirth }),
      setCity: (city) => set({ city }),

      setAnswer: (questionId, value) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
        })),

      setLifePathNumber: (lifePathNumber) => set({ lifePathNumber }),
      setArchetype:  (archetype)  => set({ archetype }),
      setSunSign:    (sunSign)    => set({ sunSign }),
      setMoonSign:   (moonSign)   => set({ moonSign }),
      setRisingSign: (risingSign) => set({ risingSign }),
      setReportId: (reportId) => set({ reportId }),
      setReport: (report) => set({ report }),
      setAnonymousUserId: (anonymousUserId) => set({ anonymousUserId }),

      setRegionOverride: (regionOverride) => set({ regionOverride }),
      setLanguageOverride: (languageOverride) => set({ languageOverride }),
      setCalendarData:    (calendarData)    => set({ calendarData }),
      setArchetypeReading:  (archetypeReading)  => set({ archetypeReading }),
      setNatalChartReading: (natalChartReading) => set({ natalChartReading }),
      setForecastReading:   (forecastReading)   => set({ forecastReading }),
      setHasAcceptedCounselDisclosure: (hasAcceptedCounselDisclosure) => set({ hasAcceptedCounselDisclosure }),
      setHasSeenTodayIntro: (hasSeenTodayIntro) => set({ hasSeenTodayIntro }),
      setSaveDeclineCount: (saveDeclineCount) => set({ saveDeclineCount }),
      setSaveLastDeclinedAt: (saveLastDeclinedAt) => set({ saveLastDeclinedAt }),
      setBoostUpsellDismissedAt: (boostUpsellDismissedAt) => set({ boostUpsellDismissedAt }),

      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),

      setPendingServerSync: (pendingServerSync) => set({ pendingServerSync }),

      setAnswers: (answers) => set({ answers }),

      commitProfileToServer: async (userId) => {
        const s = useProfileStore.getState()
        const payload: ProfilePayload = {
          first_name:        s.firstName        || undefined,
          date_of_birth:     s.dateOfBirth      || undefined,
          time_of_birth:     s.timeOfBirth      || undefined,
          city:              s.city             || undefined,
          archetype:         s.archetype        ?? undefined,
          sun_sign:          s.sunSign          ?? undefined,
          moon_sign:         s.moonSign         ?? undefined,
          rising_sign:       s.risingSign       ?? undefined,
          life_path_number:  s.lifePathNumber   ?? undefined,
          answers:           s.answers,
          language_override: s.languageOverride ?? undefined,
          analytics_enabled: s.analyticsEnabled,
        }
        try {
          await saveProfile(userId, payload)
          set({ pendingServerSync: false })
        } catch (err: any) {
          if (err instanceof ProfileSaveError && err.kind === 'network') {
            set({ pendingServerSync: true })
          } else {
            Sentry.captureException(err, { tags: { flow: 'profile_commit' } })
          }
          throw err
        }
      },

      changeLanguage: (newLang) =>
        set((state) => {
          if (newLang === state.languageOverride) return {};
          return {
            languageOverride:   newLang,
            archetypeReading:  null,
            natalChartReading: null,
            forecastReading:   null,
            calendarData:      null,
          };
        }),

      resetAnalysis: () =>
        set({
          answers: {},
          lifePathNumber: null,
          archetype: null,
          sunSign:    null,
          moonSign:   null,
          risingSign: null,
          reportId: null,
          report: null,
          anonymousUserId: '',
        }),

      resetAll: () => set(initialState),
      reset: () => set(initialState),

      initialize: async () => {
        // Any async initialization logic
        // Store is automatically hydrated by persist middleware
      },
    }),
    {
      name: 'omenora-analysis-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        firstName: state.firstName,
        dateOfBirth: state.dateOfBirth,
        timeOfBirth: state.timeOfBirth,
        city: state.city,
        lifePathNumber: state.lifePathNumber,
        archetype:  state.archetype,
        sunSign:    state.sunSign,
        moonSign:   state.moonSign,
        risingSign: state.risingSign,
        reportId: state.reportId,
        report: state.report,
        anonymousUserId: state.anonymousUserId,
        regionOverride: state.regionOverride,
        languageOverride: state.languageOverride,
        calendarData:      state.calendarData,
        archetypeReading:  state.archetypeReading,
        natalChartReading: state.natalChartReading,
        forecastReading:   state.forecastReading,
        hasAcceptedCounselDisclosure: state.hasAcceptedCounselDisclosure,
        hasSeenTodayIntro: state.hasSeenTodayIntro,
        analyticsEnabled: state.analyticsEnabled,
        answers: state.answers,
        pendingServerSync: state.pendingServerSync,
        saveDeclineCount: state.saveDeclineCount,
        saveLastDeclinedAt: state.saveLastDeclinedAt,
        boostUpsellDismissedAt: state.boostUpsellDismissedAt,
      }),
    }
  )
);
