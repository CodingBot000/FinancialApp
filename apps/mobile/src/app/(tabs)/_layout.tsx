import { Tabs } from 'expo-router';

import { colors, typography } from '../../shared/design-system';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tab.active,
        tabBarInactiveTintColor: colors.tab.inactive,
        tabBarLabelStyle: typography.tabLabel,
        tabBarStyle: {
          backgroundColor: colors.surface.primary,
          borderTopColor: colors.border.subtle,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="market" options={{ title: '종목' }} />
      <Tabs.Screen name="plan" options={{ title: '플랜' }} />
      <Tabs.Screen name="me" options={{ title: '내 정보' }} />
    </Tabs>
  );
}
