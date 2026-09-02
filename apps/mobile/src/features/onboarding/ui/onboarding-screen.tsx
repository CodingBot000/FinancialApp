import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import assetsOverview from '../../../../assets/onboarding/assets-overview.png';
import financialHabits from '../../../../assets/onboarding/financial-habits.png';
import goalPlanning from '../../../../assets/onboarding/goal-planning.png';
import moneyFlow from '../../../../assets/onboarding/money-flow.png';

import {
  AppText,
  Button,
  FullScreenSurface,
  colors,
  spacing,
} from '../../../shared/design-system';

const onboardingPages = [
  {
    description: '흩어져 있던 금융 정보를 한곳에서 확인해요.',
    image: assetsOverview,
    title: '내 모든 자산을 한눈에',
  },
  {
    description: '수입과 지출을 분석해 나의 소비 습관을 알아봐요.',
    image: moneyFlow,
    title: '돈의 흐름을 쉽게 이해해요',
  },
  {
    description: '원하는 목표를 세우고 달성 과정을 확인해요.',
    image: goalPlanning,
    title: '목표에 맞게 자산을 관리해요',
  },
  {
    description: '작은 변화로 안정적인 미래를 준비해요.',
    image: financialHabits,
    title: '더 나은 금융 습관을 시작해요',
  },
] as const;

export function OnboardingScreen({
  onComplete,
}: {
  readonly onComplete: () => void;
}) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pages = onboardingPages;

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
      setPage(Math.min(pages.length - 1, Math.max(0, nextPage)));
    },
    [pages.length, width],
  );

  return (
    <FullScreenSurface>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          horizontal
          onMomentumScrollEnd={onScrollEnd}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {pages.map((item, index) => (
            <View
              accessibilityLabel={`온보딩 ${index + 1}페이지`}
              key={item.title}
              style={[styles.page, { width }]}
            >
              <View style={styles.imageFrame}>
                <Image
                  accessibilityLabel={`${item.title} 일러스트`}
                  resizeMode="contain"
                  source={item.image}
                  style={styles.image}
                />
              </View>
              <View style={styles.copy}>
                <AppText style={styles.title} variant="title1">
                  {item.title}
                </AppText>
                <AppText
                  style={styles.description}
                  tone="secondary"
                  variant="body"
                >
                  {item.description}
                </AppText>
              </View>
            </View>
          ))}
        </ScrollView>
        <View
          accessibilityLabel={`현재 ${page + 1}페이지`}
          style={styles.indicator}
        >
          {pages.map((item, index) => (
            <View
              accessibilityLabel={`${index + 1}페이지${index === page ? ', 선택됨' : ''}`}
              key={item.title}
              style={[styles.dot, index === page && styles.activeDot]}
            />
          ))}
        </View>
        <View style={styles.action}>
          <Button onPress={onComplete} style={styles.button}>
            바로 시작하기
          </Button>
        </View>
      </View>
    </FullScreenSurface>
  );
}

const styles = StyleSheet.create({
  action: { paddingHorizontal: spacing[6], paddingTop: spacing[3] },
  activeDot: { backgroundColor: colors.text.primary, width: 10 },
  button: { alignSelf: 'stretch', minWidth: 0 },
  container: { flex: 1 },
  copy: { gap: spacing[3], paddingHorizontal: spacing[6] },
  description: { textAlign: 'center' },
  dot: {
    backgroundColor: colors.border.subtle,
    borderRadius: 999,
    height: 8,
    marginHorizontal: 4,
    width: 8,
  },
  image: { height: '100%', width: '100%' },
  imageFrame: { height: 420, marginBottom: spacing[6], width: '100%' },
  indicator: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing[5],
  },
  page: { paddingTop: spacing[4] },
  scrollContent: { flexGrow: 1 },
  title: { textAlign: 'center' },
});
