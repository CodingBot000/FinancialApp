import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  AppText,
  colors,
  IconButton,
  ScreenSafeAreaProvider,
  spacing,
  typography,
} from '../../shared/design-system';

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

function AppTopBar() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.topBarSafeArea}>
      <View style={styles.topBar}>
        <AppText
          accessibilityRole="header"
          style={styles.wordmark}
          variant="display"
        >
          WM
        </AppText>
        <IconButton
          accessibilityLabel="알림함 열기"
          onPress={() => router.push('/notifications' as never)}
        >
          <Ionicons
            color={colors.text.primary}
            name="notifications-outline"
            size={34}
          />
        </IconButton>
      </View>
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenSafeAreaProvider includeTopInset={false}>
      <Tabs
        screenOptions={{
          header: AppTopBar,
          headerShown: true,
          tabBarActiveTintColor: colors.tab.active,
          tabBarInactiveTintColor: colors.tab.inactive,
          tabBarLabelStyle: typography.tabLabel,
          tabBarStyle: {
            backgroundColor: colors.surface.primary,
            borderTopColor: colors.border.subtle,
            bottom: insets.bottom,
            height: 72,
            paddingBottom: 12,
            paddingTop: 8,
            position: 'absolute',
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
    </ScreenSafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
  },
  topBarSafeArea: { backgroundColor: colors.background.screen },
  wordmark: { letterSpacing: -1.2 },
});
