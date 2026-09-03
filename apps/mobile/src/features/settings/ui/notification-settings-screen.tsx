import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  AppText,
  colors,
  FullScreenPage,
  spacing,
} from '../../../shared/design-system';

const SERVICE_NOTICE =
  '휴대폰 알림이 꺼져 있어도 앱 내 알림함에서 중요한 메시지를 확인할 수 있어요';
const SERVICE_DESCRIPTION =
  '증여세 신고 일정, 공제한도 등 서비스 이용에 중요한 정보를 알려드려요.';
const BENEFIT_DESCRIPTION = '새로운 혜택, 이벤트가 등록되면 알려드려요.';

export function NotificationSettingsScreen({
  onBack,
}: {
  readonly onBack: () => void;
}) {
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [benefitEnabled, setBenefitEnabled] = useState(false);
  const [appPushEnabled, setAppPushEnabled] = useState(false);
  const [messageEnabled, setMessageEnabled] = useState(false);
  const [phoneEnabled, setPhoneEnabled] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);

  return (
    <FullScreenPage
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={28} />
      }
      contentContainerStyle={styles.content}
      onBack={onBack}
      title="알림 설정"
      titleStyle={styles.headerTitle}
    >
      <View style={styles.notice}>
        <Ionicons
          color={colors.text.primary}
          name="information-circle-outline"
          size={20}
        />
        <AppText style={styles.noticeText} tone="secondary">
          {SERVICE_NOTICE}
        </AppText>
      </View>

      <View style={styles.body}>
        <NotificationSection
          description={SERVICE_DESCRIPTION}
          title="서비스 이용 알림"
          value={serviceEnabled}
          onValueChange={setServiceEnabled}
        />

        <View style={styles.divider} />

        <NotificationSection
          description={BENEFIT_DESCRIPTION}
          title="혜택 및 이벤트 알림"
          value={benefitEnabled}
          onValueChange={setBenefitEnabled}
          variant="benefit"
        />

        <NotificationRow
          label="앱 푸시"
          value={appPushEnabled}
          onValueChange={setAppPushEnabled}
        />
        <NotificationRow
          label="알림톡/문자"
          value={messageEnabled}
          onValueChange={setMessageEnabled}
        />
        <NotificationRow
          label="전화"
          value={phoneEnabled}
          onValueChange={setPhoneEnabled}
        />

        <Pressable
          accessibilityLabel="마케팅 정보 활용 동의"
          accessibilityRole="button"
          onPress={() => setMarketingAgreed((current) => !current)}
          style={({ pressed }) => [
            styles.marketingButton,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.marketingLabel} variant="bodyStrong">
            마케팅 정보 활용 동의
          </AppText>
          <View style={styles.marketingStatus}>
            <Ionicons
              color={
                marketingAgreed ? colors.brand.primary : colors.border.subtle
              }
              name="checkmark"
              size={25}
            />
            <AppText
              style={styles.marketingStatusText}
              tone={marketingAgreed ? 'brand' : 'tertiary'}
              variant="bodyStrong"
            >
              동의
            </AppText>
          </View>
        </Pressable>
      </View>
    </FullScreenPage>
  );
}

function NotificationSection({
  description,
  onValueChange,
  title,
  value,
  variant,
}: {
  readonly description: string;
  readonly onValueChange: (value: boolean) => void;
  readonly title: string;
  readonly value: boolean;
  readonly variant?: 'benefit';
}) {
  return (
    <View
      style={[styles.sectionRow, variant === 'benefit' && styles.benefitRow]}
    >
      <View style={styles.sectionCopy}>
        <AppText style={styles.sectionTitle} variant="title2">
          {title}
        </AppText>
        <AppText style={styles.sectionDescription} tone="secondary">
          {description}
        </AppText>
      </View>
      <NotificationSwitch
        label={title}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function NotificationRow({
  label,
  onValueChange,
  value,
}: {
  readonly label: string;
  readonly onValueChange: (value: boolean) => void;
  readonly value: boolean;
}) {
  return (
    <View style={styles.notificationRow}>
      <AppText style={styles.notificationLabel}>{label}</AppText>
      <NotificationSwitch
        label={label}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function NotificationSwitch({
  label,
  onValueChange,
  value,
}: {
  readonly label: string;
  readonly onValueChange: (value: boolean) => void;
  readonly value: boolean;
}) {
  return (
    <Switch
      accessibilityLabel={`${label} 알림`}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      ios_backgroundColor={colors.border.subtle}
      onValueChange={onValueChange}
      style={styles.switch}
      testID={`${label}-notification-switch`}
      thumbColor={colors.background.screen}
      trackColor={{
        false: colors.border.subtle,
        true: colors.brand.primary,
      }}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing[5] },
  content: {
    gap: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  divider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    marginTop: 30,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
  },
  marketingButton: {
    alignItems: 'center',
    borderColor: colors.border.strong,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 50,
    minHeight: 52,
    paddingHorizontal: spacing[4],
  },
  marketingLabel: { flex: 1 },
  marketingStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  marketingStatusText: { color: colors.border.strong },
  notificationLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  notificationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 40,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface.subtle,
    flexDirection: 'row',
    gap: spacing[1],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  pressed: { opacity: 0.55 },
  sectionCopy: { flex: 1, paddingRight: spacing[3] },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing[1],
  },
  sectionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingTop: spacing[4],
  },
  benefitRow: { paddingTop: spacing[6] },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  switch: {
    marginTop: spacing[1],
    transform: [{ scaleX: 1 }, { scaleY: 1 }],
  },
});
