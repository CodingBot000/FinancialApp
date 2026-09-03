import { useState } from 'react';
import { View } from 'react-native';

import { PlatformApiError } from '../../../shared/api';
import type { BiometricGate } from '../../../shared/auth/biometric-gate';
import { createPortfolioBiometricGate } from '../../../shared/auth/create-portfolio-biometric-gate';
import { ExpoBiometricGate } from '../../../shared/auth/expo-biometric-gate';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ListRow,
  MoneyValue,
  NoticeBanner,
  PageHeader,
  Screen,
  StatusChip,
  TextField,
} from '../../../shared/design-system';
import { displayLabel } from '../../../shared/format/display-labels';
import { formatDateTime } from '../../../shared/format/finance-format';
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
      return '요청 내용을 확인한 뒤 다시 시도해 주세요.';
    case 'BIOMETRIC_REQUIRED':
      return '기기 생체인증이 완료되어야 주문할 수 있습니다.';
    case 'VALIDATION_FAILED':
      return '수량을 0보다 큰 값, 소수점 8자리 이내로 입력하세요.';
    default:
      return error
        ? '요청 결과가 불명확합니다. 상태를 확인해 주세요.'
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
  const [defaultGate] = useState(() =>
    createPortfolioBiometricGate({
      physicalGate: new ExpoBiometricGate({
        description: '매수 주문 전 기기 소유자 확인입니다.',
        message: '매수 주문 확인',
        subtitle: '기기 생체인증',
      }),
    }),
  );
  const flow = useOrderFlow(quantity);
  const message = errorMessage(flow.error);

  return (
    <Screen>
      <PageHeader
        subtitle="관심 있는 자산의 매수 흐름을 확인하세요."
        title="주문"
      />
      {flow.pending ? (
        <AppText tone="secondary" variant="caption">
          주문 정보를 준비하고 있습니다.
        </AppText>
      ) : null}
      <Card>
        <AppText variant="heading">주문 대상</AppText>
        <AppText tone="secondary" variant="caption">
          {flow.selection.account?.maskedAccountNumber ?? '계좌 없음'}
        </AppText>
        <AppText style={{ marginTop: 8 }} variant="bodyStrong">
          {flow.selection.holding?.displayName ?? '보유 자산 없음'}
        </AppText>
        <TextField
          keyboardType="decimal-pad"
          label="수량"
          onChangeText={setQuantity}
          value={quantity}
        />
        <Button onPress={flow.runPreview} variant="secondary">
          견적 확인
        </Button>
      </Card>
      {flow.quote ? (
        <Card variant="warm">
          <AppText variant="heading">60초 견적</AppText>
          <MoneyValue
            hidden={amountsHidden}
            size="large"
            value={flow.quote.estimatedAmount}
          />
          <AppText tone="secondary" variant="caption">
            단가{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={flow.quote.unitPrice}
            />{' '}
            · 만료 {formatDateTime(flow.quote.expiresAt)}
          </AppText>
          <Button
            disabled={flow.preview.isPending}
            onPress={() => void flow.confirm(biometricGate ?? defaultGate)}
            variant="brand"
          >
            생체인증 후 매수 확정
          </Button>
        </Card>
      ) : null}
      {message ? <NoticeBanner title={message} variant="danger" /> : null}
      {flow.status ? (
        <Card>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <AppText variant="heading">주문 상태</AppText>
            <StatusChip status={flow.status.status} />
          </View>
          <MoneyValue
            hidden={amountsHidden}
            size="large"
            value={flow.status.estimatedAmount}
          />
          {flow.status.status === 'UNKNOWN' ? (
            <NoticeBanner title="결과를 확인하고 있습니다." variant="warning">
              잠시 후 상태가 업데이트됩니다.
            </NoticeBanner>
          ) : null}
          {flow.status.status === 'REJECTED' ||
          flow.status.status === 'FAILED' ? (
            <AppText tone="danger" variant="caption">
              주문이 체결되지 않았습니다.
            </AppText>
          ) : null}
        </Card>
      ) : null}
      <Card>
        <AppText variant="heading">최근 주문</AppText>
        {flow.history.length === 0 ? (
          <AppText tone="secondary" variant="body">
            주문 이력이 없습니다.
          </AppText>
        ) : (
          flow.history.map((order) => (
            <ListRow
              key={order.orderId}
              title={displayLabel(order.status)}
              trailing={
                <MoneyValue
                  hidden={amountsHidden}
                  size="small"
                  value={order.estimatedAmount}
                />
              }
            />
          ))
        )}
      </Card>
      <DemoDisclosure />
    </Screen>
  );
}
