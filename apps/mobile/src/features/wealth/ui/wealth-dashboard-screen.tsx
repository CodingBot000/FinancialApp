import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlatformApiError, type Account } from '../../../shared/api';
import {
  formatQuantity,
  formatWon,
  isMaskedAccountIdentifier,
} from '../../../shared/format/finance-format';
import { useMoneyVisibilityStore } from '../../../shared/privacy';
import { useWealthDashboard } from '../hooks/use-wealth-dashboard';
import { AssetCharts } from './asset-charts';

function Action({
  label,
  onPress,
  pending,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly pending?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={pending}
      onPress={onPress}
      style={styles.action}
    >
      {pending ? (
        <ActivityIndicator color="#07111f" />
      ) : (
        <Text style={styles.actionText}>{label}</Text>
      )}
    </Pressable>
  );
}

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
    <View accessibilityLabel="선택한 계좌 상세" style={styles.detail}>
      <Text style={styles.sectionTitle}>
        계좌 상세 · {account.maskedAccountNumber}
      </Text>
      <Text style={styles.amount}>
        {formatWon(account.cashBalance, amountsHidden)}
      </Text>
      {accountHoldings.map((holding) => (
        <View key={holding.holdingId} style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{holding.displayName}</Text>
            <Text style={styles.muted}>
              {formatQuantity(holding.quantity)} · {holding.assetClass}
            </Text>
          </View>
          <Text style={styles.rowValue}>
            {formatWon(holding.marketValue, amountsHidden)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function WealthDashboardScreen() {
  const amountsHidden = useMoneyVisibilityStore((state) => state.hidden);
  const [selected, setSelected] = useState<string>();
  const dashboard = useWealthDashboard(selected);
  if (dashboard.pending)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#39e8b5" />
          <Text style={styles.muted}>자산 데이터를 불러오는 중</Text>
        </View>
      </SafeAreaView>
    );
  if (dashboard.error && !dashboard.hasData)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text accessibilityRole="alert" style={styles.error}>
            자산 데이터를 확인하지 못했습니다
          </Text>
          <Text style={styles.muted}>
            {dashboard.error instanceof PlatformApiError
              ? dashboard.error.message
              : '잠시 후 다시 시도하세요.'}
          </Text>
          <Action label="다시 확인" onPress={dashboard.retry} />
        </View>
      </SafeAreaView>
    );

  const connection = dashboard.data.connections[0];
  const summary = dashboard.data.summary;
  const selectedAccount = dashboard.data.account;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>WEALTH SANDBOX · DASHBOARD</Text>
        <Text accessibilityRole="header" style={styles.title}>
          합성 자산 현황
        </Text>
        <Text style={styles.disclaimer}>
          SYNTHETIC DATA ONLY · 실제 금융서비스나 투자 조언이 아닙니다.
        </Text>
        {dashboard.refreshing ? (
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            최신 자산 데이터를 확인 중입니다.
          </Text>
        ) : null}
        {dashboard.error ? (
          <View accessibilityRole="alert" style={styles.warningCard}>
            <Text style={styles.sectionTitle}>
              일부 자산 데이터를 갱신하지 못했습니다
            </Text>
            <Text style={styles.muted}>확인된 데이터는 계속 표시합니다.</Text>
            <Action label="일부 데이터 다시 확인" onPress={dashboard.retry} />
          </View>
        ) : null}
        {dashboard.syncError ? (
          <Text accessibilityRole="alert" style={styles.errorBanner}>
            연결 또는 동기화 요청을 완료하지 못했습니다. 다시 시도해 주세요.
          </Text>
        ) : null}
        {!connection ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>기관 연결이 필요합니다</Text>
            <Text style={styles.muted}>
              합성 기관 SYNTH_WEALTH_001만 연결됩니다.
            </Text>
            <Action
              label="합성 기관 연결"
              pending={dashboard.createConnection.isPending}
              onPress={() => dashboard.createConnection.mutate()}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              기관 연결 · {connection.status}
            </Text>
            <Text style={styles.muted}>
              마지막 동기화 {connection.lastSuccessfulSyncAt ?? '아직 없음'}
            </Text>
            <Action
              label="지금 동기화"
              pending={
                dashboard.startSync.isPending ||
                (dashboard.sync !== undefined &&
                  !['COMPLETED', 'FAILED'].includes(dashboard.sync.status))
              }
              onPress={() =>
                dashboard.startSync.mutate(connection.connectionId)
              }
            />
            {dashboard.sync ? (
              <Text accessibilityLiveRegion="polite" style={styles.muted}>
                동기화 {dashboard.sync.status} · 계좌{' '}
                {dashboard.sync.counts.accounts} / 보유{' '}
                {dashboard.sync.counts.holdings} / 거래{' '}
                {dashboard.sync.counts.transactions}
              </Text>
            ) : null}
          </View>
        )}
        {summary ? (
          <View style={styles.card}>
            <Text style={styles.muted}>총 자산 · {summary.asOfDate}</Text>
            {summary.lastSyncedAt === null ? (
              <Text style={styles.stale}>동기화 전 데이터</Text>
            ) : null}
            <Text style={styles.total}>
              {formatWon(summary.totalAssets, amountsHidden)}
            </Text>
            <Text style={styles.muted}>
              현금 {formatWon(summary.cash, amountsHidden)} · 투자{' '}
              {formatWon(summary.investments, amountsHidden)}
            </Text>
            <AssetCharts
              allocation={summary.allocation}
              history={dashboard.data.history}
            />
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>계좌</Text>
          {dashboard.data.accounts.length === 0 ? (
            <Text style={styles.muted}>동기화된 계좌가 없습니다.</Text>
          ) : (
            dashboard.data.accounts.map((account) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${account.maskedAccountNumber} 계좌 상세`}
                key={account.accountId}
                onPress={() => setSelected(account.accountId)}
                style={styles.row}
              >
                <View>
                  <Text style={styles.rowTitle}>
                    {isMaskedAccountIdentifier(account.maskedAccountNumber)
                      ? account.maskedAccountNumber
                      : '***-**-****'}
                  </Text>
                  <Text style={styles.muted}>
                    {account.accountType} · {account.status}
                  </Text>
                </View>
                <Text style={styles.rowValue}>
                  {formatWon(account.cashBalance, amountsHidden)}
                </Text>
              </Pressable>
            ))
          )}
        </View>
        {dashboard.accountPending ? (
          <View style={styles.detail}>
            <ActivityIndicator color="#39e8b5" />
            <Text style={styles.muted}>계좌 상세를 불러오는 중</Text>
          </View>
        ) : null}
        {dashboard.accountError ? (
          <View accessibilityRole="alert" style={styles.warningCard}>
            <Text style={styles.sectionTitle}>
              계좌 상세를 확인하지 못했습니다
            </Text>
            <Action
              label="계좌 상세 다시 확인"
              onPress={dashboard.retryAccount}
            />
          </View>
        ) : null}
        {selectedAccount ? (
          <AccountDetail
            account={selectedAccount}
            amountsHidden={amountsHidden}
            holdings={dashboard.data.holdings}
          />
        ) : null}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>최근 거래</Text>
          {dashboard.data.transactions.length === 0 ? (
            <Text style={styles.muted}>거래가 없습니다.</Text>
          ) : (
            dashboard.data.transactions.map((transaction) => (
              <View key={transaction.transactionId} style={styles.row}>
                <View>
                  <Text style={styles.rowTitle}>
                    {transaction.transactionType}
                  </Text>
                  <Text style={styles.muted}>{transaction.occurredAt}</Text>
                </View>
                <Text style={styles.rowValue}>
                  {formatWon(transaction.amount, amountsHidden)}
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
  action: {
    alignItems: 'center',
    backgroundColor: '#39e8b5',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionText: { color: '#07111f', fontSize: 14, fontWeight: '800' },
  amount: { color: '#f4f7fb', fontSize: 24, fontWeight: '800', marginTop: 8 },
  card: {
    backgroundColor: '#101d2e',
    borderColor: '#22334a',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  content: { paddingBottom: 48, paddingHorizontal: 20, paddingTop: 36 },
  detail: {
    backgroundColor: '#14243a',
    borderRadius: 22,
    marginTop: 16,
    padding: 20,
  },
  disclaimer: { color: '#39e8b5', fontSize: 11, lineHeight: 17, marginTop: 12 },
  error: {
    color: '#f8b4b4',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBanner: {
    color: '#f8b4b4',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  eyebrow: {
    color: '#39e8b5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  muted: { color: '#91a1b7', fontSize: 12, lineHeight: 18, marginTop: 4 },
  row: {
    alignItems: 'center',
    borderTopColor: '#22334a',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    minHeight: 52,
    paddingTop: 12,
  },
  rowTitle: { color: '#eaf0f8', fontSize: 14, fontWeight: '700' },
  rowValue: { color: '#cad5e3', fontSize: 13, marginLeft: 12 },
  safe: { backgroundColor: '#07111f', flex: 1 },
  sectionTitle: { color: '#f4f7fb', fontSize: 17, fontWeight: '800' },
  stale: { color: '#f6c76a', fontSize: 11, marginTop: 6 },
  title: { color: '#f4f7fb', fontSize: 31, fontWeight: '800', marginTop: 16 },
  total: { color: '#f4f7fb', fontSize: 30, fontWeight: '800', marginTop: 7 },
  warningCard: {
    backgroundColor: '#30271a',
    borderColor: '#6b5429',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
});
