import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Sun, BookOpen, MessageCircle, MoreHorizontal, type LucideIcon } from 'lucide-react-native';
import { TabParamList } from './types';
import { ScreenErrorBoundary } from '../components/templates';
import { tokens, typeScale } from '../design/tokens';
import TodayScreen from '../screens/tabs/TodayScreen';
import ReadingsScreen from '../screens/tabs/ReadingsScreen';
import CounselScreen from '../screens/tabs/CounselScreen';
import MoreScreen from '../screens/tabs/MoreScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_CONFIG: Record<keyof TabParamList, { label: string; icon: LucideIcon }> = {
  TodayTab:    { label: 'Today',    icon: Sun },
  ReadingsTab: { label: 'Readings', icon: BookOpen },
  CounselTab:  { label: 'Counsel',  icon: MessageCircle },
  MoreTab:     { label: 'More',     icon: MoreHorizontal },
};

export const TabNavigator: React.FC = () => (
  <Tab.Navigator
    screenLayout={({ children }) => (
      <ScreenErrorBoundary>{children}</ScreenErrorBoundary>
    )}
    screenOptions={({ route }) => {
      const cfg = TAB_CONFIG[route.name as keyof TabParamList];
      return {
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   tokens.accent.primary,
        tabBarInactiveTintColor: tokens.text.secondary,
        tabBarLabelStyle:        styles.tabLabel,
        tabBarLabel: cfg.label,
        tabBarIcon: ({ focused, color, size }) => {
          const IconCmp = cfg.icon;
          return <IconCmp size={size ?? 22} color={color} strokeWidth={focused ? 2 : 1.5} />;
        },
      };
    }}
  >
    <Tab.Screen name="TodayTab"    component={TodayScreen} />
    <Tab.Screen name="ReadingsTab" component={ReadingsScreen} />
    <Tab.Screen name="CounselTab"  component={CounselScreen} />
    <Tab.Screen name="MoreTab"     component={MoreScreen} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: tokens.surface.base,
    borderTopColor:  tokens.border.subtle,
    borderTopWidth:  StyleSheet.hairlineWidth,
    elevation:       0,
    paddingTop:      Platform.OS === 'ios' ? 8 : 6,
  },
  tabLabel: {
    fontFamily:    typeScale.micro.fontFamily,
    fontSize:      9,
    letterSpacing: 0.6,
    marginTop:     2,
  },
});
