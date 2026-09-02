import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors, typography } from '../../shared/design-system';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function createTabIcon(active: IoniconName, inactive: IoniconName) {
  return ({
    color,
    focused,
    size,
  }: {
    readonly color: ColorValue;
    readonly focused: boolean;
    readonly size: number;
  }) => (
    <Ionicons color={color} name={focused ? active : inactive} size={size} />
  );
}

const homeIcon = createTabIcon('home', 'home-outline');
const marketIcon = createTabIcon('stats-chart', 'stats-chart-outline');
const orderIcon = createTabIcon('receipt', 'receipt-outline');
const planIcon = createTabIcon('analytics', 'analytics-outline');
const profileIcon = createTabIcon('person-circle', 'person-circle-outline');

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
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: homeIcon, title: '홈' }}
      />
      <Tabs.Screen
        name="market"
        options={{ tabBarIcon: marketIcon, title: '종목' }}
      />
      <Tabs.Screen
        name="order"
        options={{ tabBarIcon: orderIcon, title: '주문' }}
      />
      <Tabs.Screen
        name="plan"
        options={{ tabBarIcon: planIcon, title: '플랜' }}
      />
      <Tabs.Screen
        name="me"
        options={{ tabBarIcon: profileIcon, title: '내 정보' }}
      />
    </Tabs>
  );
}
