import { useCallback, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native';

import appIcon from '../../../../assets/icon-wm.png';
import {
  AppText,
  colors,
  Screen,
  spacing,
  typography,
} from '../../../shared/design-system';

export function MyInfoOverviewScreen() {
  const router = useRouter();
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const noOp = useCallback(() => undefined, []);

  return (
    <Screen contentContainerStyle={styles.content}>
      <InfoSection label="내정보">
        <InfoRow
          label="내 정보 관리"
          onPress={() => router.push('/my-info-management' as never)}
        />
      </InfoSection>

      <InfoSection label="알림">
        <InfoRow
          label="알림 설정"
          onPress={() => router.push('/notification-settings' as never)}
        />
      </InfoSection>

      <InfoSection label="보안">
        <InfoRow label="간편비밀번호 변경" onPress={noOp} />
        <SwitchRow
          label="자동로그인 사용"
          onValueChange={setAutoLoginEnabled}
          value={autoLoginEnabled}
        />
        <SwitchRow
          label="생체인증 사용"
          onValueChange={setBiometricEnabled}
          value={biometricEnabled}
        />
      </InfoSection>

      <InfoSection label="고객센터">
        <InfoRow label="공지사항" onPress={noOp} />
        <InfoRow label="문의하기" onPress={noOp} />
      </InfoSection>

      <InfoSection divider={false} label="이용정보">
        <InfoRow
          accessibilityLabel="WM 브랜드"
          label="브랜드"
          leading={
            <Image
              accessibilityLabel="WM 로고"
              resizeMode="contain"
              source={appIcon}
              style={styles.brandLogo}
            />
          }
          onPress={noOp}
        />
      </InfoSection>
    </Screen>
  );
}

function InfoSection({
  children,
  divider = true,
  label,
}: {
  readonly children: ReactNode;
  readonly divider?: boolean;
  readonly label: string;
}) {
  return (
    <View style={[styles.section, divider && styles.sectionDivider]}>
      <AppText style={styles.sectionLabel} tone="secondary">
        {label}
      </AppText>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function InfoRow({
  accessibilityLabel,
  label,
  leading,
  onPress,
}: {
  readonly accessibilityLabel?: string;
  readonly label: string;
  readonly leading?: ReactNode;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <AppText style={styles.rowLabel}>{label}</AppText>
      <Ionicons color={colors.border.subtle} name="chevron-forward" size={28} />
    </Pressable>
  );
}

function SwitchRow({
  label,
  onValueChange,
  value,
}: {
  readonly label: string;
  readonly onValueChange: (value: boolean) => void;
  readonly value: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        ios_backgroundColor={colors.border.subtle}
        onValueChange={onValueChange}
        style={styles.switch}
        testID={`${label}-switch`}
        thumbColor={colors.background.screen}
        trackColor={{
          false: colors.border.subtle,
          true: colors.brand.primary,
        }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandLogo: {
    height: 44,
    marginLeft: -spacing[4],
    marginRight: -spacing[5],
    width: 86,
  },
  content: {
    gap: 0,
    paddingBottom: spacing[12],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  pressed: { opacity: 0.55 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  rowLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
  },
  rows: { gap: 0 },
  section: { paddingBottom: spacing[2], paddingTop: spacing[4] },
  sectionDivider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: typography.heading.fontSize,
    fontWeight: '400',
    lineHeight: typography.heading.lineHeight,
    marginBottom: spacing[2],
  },
  switch: {
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
});
