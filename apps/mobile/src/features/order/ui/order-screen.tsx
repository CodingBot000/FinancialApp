import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlatformApiError } from '../../../shared/api';
import type { BiometricGate } from '../../../shared/auth/biometric-gate';
import { ExpoBiometricGate } from '../../../shared/auth/expo-biometric-gate';
import { formatWon } from '../../../shared/format/finance-format';
import { useMoneyVisibilityStore } from '../../../shared/privacy';
import { useOrderFlow } from '../hooks/use-order-flow';

function errorMessage(error: unknown) {
  const code = error instanceof PlatformApiError ? error.code : error;
  switch (code) {
    case 'QUOTE_EXPIRED':
      return '견적이 만료되었습니다. 새 견적을 확인하세요.';
    case 'INSUFFICIENT_FUNDS':
      return '주문 가능 현금이 부족합니다.';
    case 'IDEMPOTENCY_CONFLICT':
      return '같은 주문 키의 요청 내용이 달라 주문하지 않았습니다.';
    case 'BIOMETRIC_REQUIRED':
      return '기기 생체인증이 완료되어야 주문할 수 있습니다.';
    case 'VALIDATION_FAILED':
      return '수량을 0보다 큰 값, 소수점 8자리 이내로 입력하세요.';
    default:
      return error
        ? '요청 결과가 불명확합니다. 주문 POST를 자동 재전송하지 않습니다.'
        : undefined;
  }
}

export function OrderScreen({
  biometricGate,
}: {
  readonly biometricGate?: BiometricGate;
}) {
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const [quantity, setQuantity] = useState('1.00000000');
  const [defaultGate] = useState(
    () =>
      new ExpoBiometricGate({
        description: 'BUY 주문 전 기기 소유자 확인입니다. 서버 MFA가 아닙니다.',
        message: '합성 BUY 주문 확인',
        subtitle: '기기 생체인증',
      }),
  );
  const flow = useOrderFlow(quantity);
  const message = errorMessage(flow.error);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SYNTHETIC BUY · NO AUTO RETRY</Text>
        <Text accessibilityRole="header" style={styles.title}>
          합성 자산 매수
        </Text>
        <Text style={styles.disclaimer}>
          실제 주문이나 투자 조언이 아닙니다. 외부 주문 POST는 자동 재시도하지
          않습니다.
        </Text>
        {flow.pending ? <ActivityIndicator color="#39e8b5" /> : null}
        <View style={styles.card}>
          <Text style={styles.heading}>주문 대상</Text>
          <Text style={styles.muted}>
            {flow.selection.account?.maskedAccountNumber ?? '계좌 없음'}
          </Text>
          <Text style={styles.value}>
            {flow.selection.holding?.displayName ?? '보유상품 없음'}
          </Text>
          <Text style={styles.label}>수량</Text>
          <TextInput
            accessibilityLabel="매수 수량"
            keyboardType="decimal-pad"
            onChangeText={setQuantity}
            style={styles.input}
            value={quantity}
          />
          <Pressable
            accessibilityRole="button"
            onPress={flow.runPreview}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>견적 확인</Text>
          </Pressable>
        </View>
        {flow.quote ? (
          <View style={styles.card}>
            <Text style={styles.heading}>60초 합성 견적</Text>
            <Text style={styles.amount}>
              {formatWon(flow.quote.estimatedAmount, amountsHidden)}
            </Text>
            <Text style={styles.muted}>
              단가 {formatWon(flow.quote.unitPrice, amountsHidden)} · 만료{' '}
              {flow.quote.expiresAt}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={flow.preview.isPending}
              onPress={() => void flow.confirm(biometricGate ?? defaultGate)}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>생체인증 후 BUY 확정</Text>
            </Pressable>
          </View>
        ) : null}
        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}
        {flow.status ? (
          <View style={styles.card}>
            <Text style={styles.heading}>주문 상태 · {flow.status.status}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.amount}>
              {formatWon(flow.status.estimatedAmount, amountsHidden)}
            </Text>
            {flow.status.status === 'UNKNOWN' ? (
              <Text style={styles.warning}>
                결과 확인 중입니다. POST 재전송 없이 상태만 조회합니다.
              </Text>
            ) : null}
            {flow.status.status === 'REJECTED' ||
            flow.status.status === 'FAILED' ? (
              <Text style={styles.error}>
                주문이 체결되지 않았습니다. 예약 현금은 서버 상태를 따릅니다.
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.heading}>최근 주문</Text>
          {flow.history.length === 0 ? (
            <Text style={styles.muted}>주문 이력이 없습니다.</Text>
          ) : (
            flow.history.map((order) => (
              <View key={order.orderId} style={styles.row}>
                <Text style={styles.value}>{order.status}</Text>
                <Text style={styles.muted}>
                  {formatWon(order.estimatedAmount, amountsHidden)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  amount: { color: '#f4f7fb', fontSize: 24, fontWeight: '800', marginTop: 10 },
  card: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  content: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 28 },
  disclaimer: { color: '#39e8b5', fontSize: 11, lineHeight: 17, marginTop: 12 },
  error: { color: '#f8b4b4', fontSize: 12, lineHeight: 18, marginTop: 14 },
  eyebrow: { color: '#39e8b5', fontSize: 11, fontWeight: '800' },
  heading: { color: '#f4f7fb', fontSize: 17, fontWeight: '800' },
  input: {
    backgroundColor: '#07111f',
    borderColor: '#33455f',
    borderRadius: 10,
    borderWidth: 1,
    color: '#f4f7fb',
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  label: { color: '#cbd7e8', fontSize: 12, marginTop: 16 },
  muted: { color: '#91a1b7', fontSize: 11, marginTop: 7 },
  primary: {
    alignItems: 'center',
    backgroundColor: '#39e8b5',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  primaryText: { color: '#07111f', fontSize: 13, fontWeight: '800' },
  row: {
    borderTopColor: '#22334a',
    borderTopWidth: 1,
    marginTop: 12,
    minHeight: 48,
    paddingTop: 10,
  },
  safe: { backgroundColor: '#07111f', flex: 1 },
  secondary: {
    alignItems: 'center',
    borderColor: '#39e8b5',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  secondaryText: { color: '#39e8b5', fontWeight: '800' },
  title: { color: '#f4f7fb', fontSize: 30, fontWeight: '800', marginTop: 14 },
  value: { color: '#dce5f0', fontSize: 14, fontWeight: '700', marginTop: 6 },
  warning: { color: '#f6c76a', fontSize: 12, lineHeight: 18, marginTop: 10 },
});
