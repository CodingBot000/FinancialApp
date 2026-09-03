import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import appIcon from '../../../assets/icon-wm.png';

import {
  AppText,
  BottomBar,
  colors,
  IconButton,
  ScreenSafeAreaProvider,
  spacing,
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
        <View accessibilityLabel="WM 로고" accessibilityRole="header">
          <Image
            accessibilityLabel="WM 로고"
            resizeMode="contain"
            source={appIcon}
            style={styles.wordmark}
          />
        </View>
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

function AppBottomBar({
  descriptors,
  navigation,
  state,
  insets,
}: BottomTabBarProps) {
  if (state.routes[state.index]?.name === 'me') {
    return null;
  }

  return (
    <BottomBar style={{ paddingBottom: Math.max(insets.bottom, spacing[2]) }}>
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const options = descriptors[route.key]?.options;
        if (options === undefined) return null;
        const color = focused
          ? String(options.tabBarActiveTintColor ?? colors.tab.active)
          : String(options.tabBarInactiveTintColor ?? colors.tab.inactive);
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);
        const icon = options.tabBarIcon?.({
          color,
          focused,
          size: 24,
        });

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            key={route.key}
            onLongPress={() => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            }}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={styles.tabItem}
          >
            {icon}
            <AppText
              style={styles.tabLabel}
              tone={focused ? 'brand' : 'secondary'}
              variant="tabLabel"
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </BottomBar>
  );
}

export default function TabsLayout() {
  return (
    <ScreenSafeAreaProvider includeTopInset={false}>
      <Tabs
        tabBar={AppBottomBar}
        screenOptions={{
          header: AppTopBar,
          headerShown: true,
          tabBarActiveTintColor: colors.tab.active,
          tabBarInactiveTintColor: colors.tab.inactive,
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
          options={{
            headerShown: false,
            tabBarIcon: profileIcon,
            title: '내 정보',
          }}
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
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[1],
    justifyContent: 'center',
    minHeight: 48,
  },
  tabLabel: { textAlign: 'center' },
  wordmark: { height: 64, width: 64 },
});
