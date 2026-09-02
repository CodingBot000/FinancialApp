import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { PlatformApiError, type Account } from '../../../shared/api';
import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  ErrorState,
  ListRow,
  LoadingState,
  MoneyValue,
  NoticeBanner,
  PageHeader,
  Screen,
  SectionHeader,
  StatusChip,
} from '../../../shared/design-system';
import {
  formatDate,
  formatDateTime,
  formatQuantity,
  isMaskedAccountIdentifier,
} from '../../../shared/format/finance-format';
import { displayLabel } from '../../../shared/format/display-labels';
import { useMoneyVisibilityStore } from '../../../shared/privacy';
import { useWealthDashboard } from '../hooks/use-wealth-dashboard';
import { AssetCharts } from './asset-charts';

function AccountDetail({
  account,
  amountsHidden,
  holdings,
}: {
  readonly account: Account;
  readonly amountsHidden: boolean;
  readonly holdings: ReturnType<typeof useWealthDashboard>['data']['holdings'];
}) {
  const accountHoldings = holdings.filter(
    (item) => item.accountId === account.accountId,
  );
  return (
    <Card variant="warm" accessibilityLabel="선택한 계좌 상세">
      <SectionHeader title={`계좌 상세 · ${account.maskedAccountNumber}`} />
      <MoneyValue
        hidden={amountsHidden}
        size="large"
        value={account.cashBalance}
      />
      {accountHoldings.map((holding) => (
        <ListRow
          description={`${formatQuantity(holding.quantity)} · ${displayLabel(holding.assetClass)}`}
          key={holding.holdingId}
          title={holding.displayName}
          trailing={
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={holding.marketValue}
            />
          }
        />
      ))}
    </Card>
  );
}

export function WealthDashboardScreen() {
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const [selected, setSelected] = useState<string>();
  const dashboard = useWealthDashboard(selected);

  if (dashboard.pending) {
    return (
      <Screen>
        <LoadingState label="자산 정보를 준비하고 있습니다." />
      </Screen>
    );
  }

  if (dashboard.error && !dashboard.hasData) {
    return (
      <Screen>
        <ErrorState
          action={<Button onPress={dashboard.retry}>다시 확인</Button>}
          description={
            dashboard.error instanceof PlatformApiError
              ? dashboard.error.message
              : '잠시 후 다시 시도해 주세요.'
          }
          title="자산 정보를 확인하지 못했습니다."
        />
      </Screen>
    );
  }

  const connection = dashboard.data.connections[0];
  const summary = dashboard.data.summary;
  const selectedAccount = dashboard.data.account;
  return (
    <Screen>
      <PageHeader
        subtitle="내 자산을 한눈에 보고 필요한 순간에 관리하세요."
        title="홈"
      />
      <AppText tone="secondary" variant="caption">
        최근 업데이트{' '}
        {summary?.lastSyncedAt
          ? formatDateTime(summary.lastSyncedAt)
          : '확인 전'}
      </AppText>
      {dashboard.refreshing ? (
        <AppText
          accessibilityLiveRegion="polite"
          tone="secondary"
          variant="caption"
        >
          최신 정보를 확인하고 있습니다.
        </AppText>
      ) : null}
      {dashboard.error ? (
        <>
          <NoticeBanner
            title="일부 정보를 갱신하지 못했습니다."
            variant="warning"
          >
            확인된 정보는 계속 표시합니다.
          </NoticeBanner>
          <Button onPress={dashboard.retry} size="small" variant="secondary">
            다시 확인
          </Button>
        </>
      ) : null}
      {dashboard.syncError ? (
        <NoticeBanner title="연결을 완료하지 못했습니다." variant="danger">
          잠시 후 다시 시도해 주세요.
        </NoticeBanner>
      ) : null}

      {!connection ? (
        <Card>
          <SectionHeader title="기관 연결" />
          <AppText tone="secondary" variant="body">
            연결을 시작하면 계좌와 자산 정보를 확인할 수 있습니다.
          </AppText>
          <Button
            loading={dashboard.createConnection.isPending}
            onPress={() => dashboard.createConnection.mutate()}
            variant="brand"
          >
            기관 연결
          </Button>
        </Card>
      ) : (
        <Card>
          <SectionHeader
            action={<StatusChip status={connection.status} />}
            title="기관 연결"
          />
          <AppText tone="secondary" variant="caption">
            마지막 업데이트 {formatDateTime(connection.lastSuccessfulSyncAt)}
          </AppText>
          <Button
            loading={
              dashboard.startSync.isPending ||
              (dashboard.sync !== undefined &&
                !['COMPLETED', 'FAILED'].includes(dashboard.sync.status))
            }
            onPress={() => dashboard.startSync.mutate(connection.connectionId)}
            variant="secondary"
          >
            지금 업데이트
          </Button>
          {dashboard.sync ? (
            <AppText
              accessibilityLiveRegion="polite"
              tone="secondary"
              variant="caption"
            >
              {displayLabel(dashboard.sync.status)} · 계좌{' '}
              {dashboard.sync.counts.accounts}개 · 보유 자산{' '}
              {dashboard.sync.counts.holdings}개
            </AppText>
          ) : null}
        </Card>
      )}

      {summary ? (
        <Card>
          <AppText tone="secondary" variant="caption">
            총 자산 · {summary.asOfDate}
          </AppText>
          {summary.lastSyncedAt === null ? (
            <AppText tone="warning" variant="caption">
              아직 업데이트 전입니다.
            </AppText>
          ) : null}
          <MoneyValue
            hidden={amountsHidden}
            size="hero"
            value={summary.totalAssets}
          />
          <AppText tone="secondary" variant="body">
            현금{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={summary.cash}
            />{' '}
            · 투자{' '}
            <MoneyValue
              hidden={amountsHidden}
              size="small"
              value={summary.investments}
            />
          </AppText>
          <AssetCharts
            allocation={summary.allocation}
            history={dashboard.data.history}
          />
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="계좌" />
        {dashboard.data.accounts.length === 0 ? (
          <AppText tone="secondary" variant="body">
            업데이트된 계좌가 없습니다.
          </AppText>
        ) : (
          dashboard.data.accounts.map((account) => (
            <ListRow
              description={`${displayLabel(account.accountType)} · ${displayLabel(account.status)}`}
              key={account.accountId}
              onPress={() => setSelected(account.accountId)}
              title={
                isMaskedAccountIdentifier(account.maskedAccountNumber)
                  ? account.maskedAccountNumber
                  : '***-**-****'
              }
              trailing={
                <MoneyValue
                  hidden={amountsHidden}
                  size="small"
                  value={account.cashBalance}
                />
              }
            />
          ))
        )}
      </Card>

      {dashboard.accountPending ? (
        <Card variant="subtle">
          <ActivityIndicator />
          <AppText tone="secondary" variant="caption">
            계좌 상세를 준비하고 있습니다.
          </AppText>
        </Card>
      ) : null}
      {dashboard.accountError ? (
        <>
          <NoticeBanner
            title="계좌 상세를 확인하지 못했습니다."
            variant="warning"
          />
          <Button
            onPress={dashboard.retryAccount}
            size="small"
            variant="secondary"
          >
            다시 확인
          </Button>
        </>
      ) : null}
      {selectedAccount ? (
        <AccountDetail
          account={selectedAccount}
          amountsHidden={amountsHidden}
          holdings={dashboard.data.holdings}
        />
      ) : null}

      <Card>
        <SectionHeader title="최근 거래" />
        {dashboard.data.transactions.length === 0 ? (
          <AppText tone="secondary" variant="body">
            최근 거래가 없습니다.
          </AppText>
        ) : (
          dashboard.data.transactions.map((transaction) => (
            <ListRow
              description={formatDate(transaction.occurredAt)}
              key={transaction.transactionId}
              title={displayLabel(transaction.transactionType)}
              trailing={
                <MoneyValue
                  hidden={amountsHidden}
                  size="small"
                  value={transaction.amount}
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
