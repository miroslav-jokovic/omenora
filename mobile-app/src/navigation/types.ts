import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ── Tab navigator ──────────────────────────────────────────────────────────────
export type TabParamList = {
  TodayTab:    undefined;
  ReadingsTab: undefined;
  CounselTab:  undefined;
  MoreTab:     undefined;
};

// ── Root stack ─────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  // Onboarding
  Splash:             undefined;
  Welcome:            undefined;
  Name:               undefined;
  DateOfBirth:        undefined;
  BirthCity:          undefined;
  BirthTime:          undefined;
  Calculating:        undefined;
  BigThreeReveal:     { sunSign: string; moonSign: string; risingSign: string; archetypeName: string };
  SaveYourReading:    undefined;
  OptionalQuestions:  undefined;
  ChartPreparation:   undefined;
  PremiumTeaser:      undefined;
  // App
  MainTabs:      NavigatorScreenParams<TabParamList> | undefined;
  Calendar:      { calendarId?: string } | undefined;
  Compatibility:       { reportId?: string } | undefined;
  CounselChat:         { showDisclosure?: boolean } | undefined;
  CrisisResources:     undefined;
  TraditionSwitcher:   undefined;
  Privacy:             undefined;
  Terms:               undefined;
  Components:          undefined;
  Profile:             undefined;
  Notifications:       undefined;
  Language:            undefined;
  DeleteAccount:       undefined;
  PrivacySettings:     undefined;
};

// ── Tab screen props (composite — can navigate to root stack screens too) ──────
export type TodayScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'TodayTab'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type ReadingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'ReadingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type CounselScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'CounselTab'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type MoreScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'MoreTab'>,
  NativeStackScreenProps<RootStackParamList>
>;


// ── Stack-only screen props ────────────────────────────────────────────────────
export type CalendarScreenProps     = NativeStackScreenProps<RootStackParamList, 'Calendar'>;
export type CompatibilityScreenProps = NativeStackScreenProps<RootStackParamList, 'Compatibility'>;
export type PrivacyScreenProps      = NativeStackScreenProps<RootStackParamList, 'Privacy'>;
export type TermsScreenProps                = NativeStackScreenProps<RootStackParamList, 'Terms'>;
export type BigThreeRevealScreenProps       = NativeStackScreenProps<RootStackParamList, 'BigThreeReveal'>;
export type SaveYourReadingScreenProps      = NativeStackScreenProps<RootStackParamList, 'SaveYourReading'>;
export type TraditionSwitcherScreenProps    = NativeStackScreenProps<RootStackParamList, 'TraditionSwitcher'>;
export type CounselChatScreenProps          = NativeStackScreenProps<RootStackParamList, 'CounselChat'>;
export type CrisisResourcesScreenProps      = NativeStackScreenProps<RootStackParamList, 'CrisisResources'>;
export type ProfileScreenProps              = NativeStackScreenProps<RootStackParamList, 'Profile'>;
export type NotificationsScreenProps        = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
export type LanguageScreenProps             = NativeStackScreenProps<RootStackParamList, 'Language'>;
export type DeleteAccountScreenProps        = NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>;
export type PrivacySettingsScreenProps      = NativeStackScreenProps<RootStackParamList, 'PrivacySettings'>;
