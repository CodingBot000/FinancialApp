import { useCallback, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  StatusBar as NativeStatusBar,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PinSetupScreen } from './pin-setup-screen';
import {
  AppText,
  BottomBar,
  Button,
  FullScreenSurface,
  colors,
  spacing,
  typography,
} from '../../../shared/design-system';

const carriers = [
  'SKT',
  'KT',
  'LG U+',
  'SKT 알뜰폰',
  'KT 알뜰폰',
  'LG U+ 알뜰폰',
] as const;

type AgreementKey =
  | 'membership'
  | 'identity'
  | 'marketing'
  | 'marketingCollection'
  | 'marketingPush'
  | 'marketingSms'
  | 'marketingCall';

const agreementKeys: readonly AgreementKey[] = [
  'membership',
  'identity',
  'marketing',
  'marketingCollection',
  'marketingPush',
  'marketingSms',
  'marketingCall',
];

const initialAgreements: Record<AgreementKey, boolean> = {
  identity: false,
  marketing: false,
  marketingCall: false,
  marketingCollection: false,
  marketingPush: false,
  marketingSms: false,
  membership: false,
};

export function PhoneVerificationScreen({
  onComplete,
}: {
  readonly onComplete: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState<string>();
  const [carrierSheetOpen, setCarrierSheetOpen] = useState(false);
  const [residentFront, setResidentFront] = useState('');
  const [residentBack, setResidentBack] = useState('');
  const [name, setName] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);
  const [pinStarted, setPinStarted] = useState(false);
  const [agreements, setAgreements] =
    useState<Record<AgreementKey, boolean>>(initialAgreements);

  const onPhoneChange = useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(digits);
    if (digits.length >= 11) {
      Keyboard.dismiss();
      setCarrierSheetOpen(true);
    }
  }, []);

  const selectCarrier = useCallback((value: string) => {
    setCarrier(value);
    setCarrierSheetOpen(false);
  }, []);

  const toggleAgreement = useCallback((key: AgreementKey) => {
    setAgreements((current) => {
      const nextValue = !current[key];
      const next = { ...current, [key]: nextValue };
      if (key === 'marketing') {
        next.marketingCollection = nextValue;
        next.marketingPush = nextValue;
        next.marketingSms = nextValue;
        next.marketingCall = nextValue;
      }
      if (
        key === 'marketingCollection' ||
        key === 'marketingPush' ||
        key === 'marketingSms' ||
        key === 'marketingCall'
      ) {
        next.marketing = [
          next.marketingCollection,
          next.marketingPush,
          next.marketingSms,
          next.marketingCall,
        ].every(Boolean);
      }
      return next;
    });
  }, []);

  const toggleAllAgreements = useCallback(() => {
    setAgreements((current) => {
      const shouldAcceptAll = !agreementKeys.every((key) => current[key]);
      return agreementKeys.reduce(
        (next, key) => ({ ...next, [key]: shouldAcceptAll }),
        {} as Record<AgreementKey, boolean>,
      );
    });
  }, []);

  const requiredAccepted = agreements.membership && agreements.identity;
  const allAccepted = agreementKeys.every((key) => agreements[key]);
  const residentComplete =
    residentFront.length === 6 && residentBack.length === 1;
  const canContinue = residentComplete && name.trim().length > 0;

  if (pinStarted) {
    return <PinSetupScreen onComplete={onComplete} />;
  }

  return (
    <FullScreenSurface>
      <NativeStatusBar
        backgroundColor={
          carrierSheetOpen || termsOpen
            ? colors.text.secondary
            : colors.background.screen
        }
        barStyle={
          carrierSheetOpen || termsOpen ? 'light-content' : 'dark-content'
        }
      />
      <View style={styles.container}>
        <View style={styles.form}>
          <AppText style={styles.title} variant="title1">
            본인인증을 위해{`\n`}정보를 입력해주세요
          </AppText>

          {residentComplete ? (
            <View style={styles.fieldGroup}>
              <AppText
                style={styles.fieldLabel}
                tone="secondary"
                variant="body"
              >
                이름
              </AppText>
              <TextInput
                accessibilityLabel="이름"
                onChangeText={setName}
                placeholder="이름을 입력해주세요"
                placeholderTextColor={colors.text.tertiary}
                style={[styles.textInput, styles.activeField]}
                value={name}
              />
            </View>
          ) : null}

          {carrier !== undefined ? (
            <View style={styles.fieldGroup}>
              <AppText
                style={styles.fieldLabel}
                tone="secondary"
                variant="body"
              >
                주민등록번호
              </AppText>
              <View style={styles.residentValue}>
                <TextInput
                  accessibilityLabel="주민등록번호 앞자리"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) =>
                    setResidentFront(value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="000000"
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.residentInput, styles.frontInput]}
                  value={residentFront}
                />
                <AppText style={styles.residentSeparator} tone="tertiary">
                  -
                </AppText>
                <TextInput
                  accessibilityLabel="주민등록번호 뒷자리"
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(value) =>
                    setResidentBack(value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={styles.residentInput}
                  value={residentBack}
                />
                <AppText
                  style={styles.maskedDigits}
                  tone={residentBack ? 'primary' : 'tertiary'}
                >
                  ••••••
                </AppText>
              </View>
              <View style={styles.divider} />
            </View>
          ) : null}

          {phone.length > 0 ? (
            <View style={styles.fieldGroup}>
              <AppText
                style={styles.fieldLabel}
                tone="secondary"
                variant="body"
              >
                통신사
              </AppText>
              <Pressable
                accessibilityLabel="통신사 선택"
                accessibilityRole="button"
                onPress={() => {
                  Keyboard.dismiss();
                  setCarrierSheetOpen(true);
                }}
                style={[
                  styles.selectField,
                  carrierSheetOpen && styles.activeField,
                ]}
              >
                <AppText
                  style={styles.selectValue}
                  tone={carrier === undefined ? 'tertiary' : 'primary'}
                  variant="title2"
                >
                  {carrier ?? '통신사를 선택해주세요'}
                </AppText>
                <Ionicons
                  color={colors.text.primary}
                  name={carrierSheetOpen ? 'chevron-up' : 'chevron-down'}
                  size={24}
                />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <AppText style={styles.fieldLabel} tone="secondary" variant="body">
              휴대폰번호
            </AppText>
            <TextInput
              accessibilityLabel="휴대폰번호"
              keyboardType="phone-pad"
              onChangeText={onPhoneChange}
              placeholder="예) 01012345678"
              placeholderTextColor={colors.text.tertiary}
              style={[
                styles.textInput,
                !carrierSheetOpen && !termsOpen && styles.activeField,
              ]}
              value={phone}
            />
          </View>
        </View>

        <View style={styles.action}>
          <Button
            disabled={!canContinue}
            onPress={() => setTermsOpen(true)}
            style={styles.button}
          >
            다음
          </Button>
        </View>

        {carrierSheetOpen ? (
          <View style={styles.overlay}>
            <View style={styles.scrim} />
            <BottomBar
              accessibilityLabel="통신사 선택"
              style={styles.carrierSheet}
              variant="sheet"
            >
              <AppText style={styles.sheetTitle} variant="title1">
                통신사 선택
              </AppText>
              <View style={styles.carrierList}>
                {carriers.map((item) => (
                  <Pressable
                    accessibilityLabel={item}
                    accessibilityRole="button"
                    key={item}
                    onPress={() => selectCarrier(item)}
                    style={({ pressed }) => [
                      styles.carrierOption,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText variant="body">{item}</AppText>
                  </Pressable>
                ))}
              </View>
            </BottomBar>
          </View>
        ) : null}

        {termsOpen ? (
          <View style={styles.overlay}>
            <View style={styles.scrim} />
            <BottomBar
              accessibilityLabel="약관 확인"
              style={styles.termsSheet}
              variant="sheet"
            >
              <View style={styles.handle} />
              <AppText style={styles.termsTitle} variant="title1">
                약관을 확인해주세요
              </AppText>
              <AppText tone="secondary" variant="body">
                설명 및 약관을 이해하였음을 확인합니다.
              </AppText>
              <Pressable
                accessibilityLabel="전체 동의하기"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allAccepted }}
                onPress={toggleAllAgreements}
                style={styles.allAgreement}
              >
                <Ionicons
                  color={
                    allAccepted ? colors.text.primary : colors.border.strong
                  }
                  name="checkmark"
                  size={28}
                />
                <AppText variant="title2">전체 동의하기</AppText>
              </Pressable>

              <AgreementRow
                checked={agreements.membership}
                label="[필수] 회원 가입"
                onPress={() => toggleAgreement('membership')}
              />
              <AgreementRow
                checked={agreements.identity}
                label="[필수] 휴대폰 본인인증"
                onPress={() => toggleAgreement('identity')}
              />
              <AgreementRow
                checked={agreements.marketing}
                label="[선택] 마케팅 정보 알림 동의"
                onPress={() => toggleAgreement('marketing')}
                trailing="chevron"
              />
              <View style={styles.subAgreementList}>
                <AgreementRow
                  checked={agreements.marketingCollection}
                  label="(선택) 마케팅 활용 위한 개인정보 수집·이용 동의"
                  onPress={() => toggleAgreement('marketingCollection')}
                  nested
                  trailing="chevron"
                />
                <AgreementRow
                  checked={agreements.marketingPush}
                  label="(선택) 마케팅 정보 수신 동의 (앱 푸시)"
                  onPress={() => toggleAgreement('marketingPush')}
                  nested
                  trailing="chevron"
                />
                <AgreementRow
                  checked={agreements.marketingSms}
                  label="(선택) 마케팅 정보 수신 동의 (알림톡/문자)"
                  onPress={() => toggleAgreement('marketingSms')}
                  nested
                  trailing="chevron"
                />
                <AgreementRow
                  checked={agreements.marketingCall}
                  label="(선택) 마케팅 정보 수신 동의 (전화)"
                  onPress={() => toggleAgreement('marketingCall')}
                  nested
                  trailing="chevron"
                />
              </View>
              <Button
                disabled={!requiredAccepted}
                onPress={() => {
                  setTermsOpen(false);
                  setPinStarted(true);
                }}
                style={styles.button}
              >
                동의
              </Button>
            </BottomBar>
          </View>
        ) : null}
      </View>
    </FullScreenSurface>
  );
}

function AgreementRow({
  checked,
  label,
  nested = false,
  onPress,
  trailing,
}: {
  readonly checked: boolean;
  readonly label: string;
  readonly nested?: boolean;
  readonly onPress: () => void;
  readonly trailing?: 'chevron';
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[styles.agreementRow, nested && styles.nestedAgreementRow]}
    >
      <Ionicons
        color={checked ? colors.text.primary : colors.border.strong}
        name="checkmark"
        size={nested ? 20 : 26}
      />
      <AppText
        numberOfLines={nested ? 2 : 1}
        style={styles.agreementLabel}
        tone={nested ? 'secondary' : 'primary'}
        variant={nested ? 'caption' : 'bodyStrong'}
      >
        {label}
      </AppText>
      {trailing ? (
        <Ionicons color={colors.border.strong} name="chevron-down" size={20} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    paddingBottom: spacing[16],
    paddingTop: spacing[6],
  },
  activeField: {
    borderBottomColor: colors.text.primary,
  },
  agreementLabel: {
    flex: 1,
  },
  agreementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 42,
  },
  allAgreement: {
    alignItems: 'center',
    borderColor: colors.border.strong,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
    minHeight: 64,
    paddingHorizontal: spacing[4],
  },
  button: {
    alignSelf: 'stretch',
    minWidth: 0,
  },
  carrierList: {
    paddingBottom: spacing[2],
  },
  carrierOption: {
    justifyContent: 'center',
    minHeight: 48,
  },
  carrierSheet: {
    bottom: 0,
    left: 0,
    maxHeight: '72%',
    paddingBottom: spacing[12],
    position: 'absolute',
    right: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
  },
  divider: {
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 2,
  },
  fieldGroup: {
    marginTop: spacing[8],
  },
  fieldLabel: {
    marginBottom: spacing[2],
  },
  form: {
    flex: 1,
    paddingTop: spacing[16],
  },
  frontInput: {
    minWidth: 152,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border.subtle,
    borderRadius: 999,
    height: 8,
    marginBottom: spacing[6],
    width: 80,
  },
  maskedDigits: {
    flex: 1,
    letterSpacing: 3,
  },
  nestedAgreementRow: {
    paddingLeft: spacing[10],
  },
  overlay: {
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pressed: {
    opacity: 0.55,
  },
  residentInput: {
    color: colors.text.primary,
    fontSize: typography.title2.fontSize,
    height: 54,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  residentSeparator: {
    fontSize: typography.title2.fontSize,
    marginHorizontal: spacing[3],
  },
  residentValue: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  scrim: {
    backgroundColor: colors.background.inverse,
    bottom: 0,
    left: 0,
    opacity: 0.32,
    position: 'absolute',
    right: 0,
    top: -64,
  },
  selectField: {
    alignItems: 'center',
    borderBottomColor: colors.border.strong,
    borderBottomWidth: 2,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
  },
  selectValue: {
    fontWeight: '400',
  },
  sheetTitle: {
    marginBottom: spacing[4],
  },
  subAgreementList: {
    gap: spacing[1],
  },
  termsSheet: {
    bottom: 0,
    left: 0,
    maxHeight: '86%',
    paddingBottom: spacing[16],
    paddingTop: spacing[2],
    position: 'absolute',
    right: 0,
  },
  termsTitle: {
    marginBottom: spacing[2],
  },
  textInput: {
    borderBottomColor: colors.border.strong,
    borderBottomWidth: 2,
    color: colors.text.primary,
    fontSize: typography.title2.fontSize,
    height: 54,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  title: {
    maxWidth: 360,
  },
});
