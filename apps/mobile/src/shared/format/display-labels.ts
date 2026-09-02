const DISPLAY_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: '연결됨',
  BALANCED: '균형형',
  BIOMETRIC_REQUIRED: '기기 인증 필요',
  BOND: '채권',
  BROKERAGE: '증권 계좌',
  BUY: '매수',
  CASH: '현금',
  COMPLETED: '완료',
  CONSERVATIVE: '안정형',
  DAILY: '일봉',
  DEPOSIT: '입금',
  EQUITY: '주식',
  EXPIRED: '만료',
  FAILED: '실패',
  FETCHING: '가져오는 중',
  FILLED: '체결',
  FRESH: '최신',
  GROWTH: '성장형',
  IDEMPOTENCY_CONFLICT: '중복 요청 충돌',
  INSUFFICIENT_FUNDS: '잔액 부족',
  NORMALIZING: '정리하는 중',
  MINUTE: '분봉',
  MONTHLY: '월봉',
  PENDING_SUBMISSION: '제출 대기',
  QUEUED: '대기 중',
  RAW_STORED: '원본 저장됨',
  REJECTED: '거절됨',
  REVOKED: '해지됨',
  STALE: '지연',
  UNKNOWN: '확인 중',
  QUOTE_EXPIRED: '견적 만료',
  VALIDATION_FAILED: '입력값 오류',
  WEEKLY: '주봉',
  WITHDRAWAL: '출금',
  YEARLY: '연봉',
};

const SCENARIO_LABELS: Readonly<Record<string, string>> = {
  HTTP_500: '서버 오류',
  MALFORMED_RESPONSE: '잘못된 응답',
  NORMAL: '정상',
  ORDER_REJECT: '주문 거절',
  ORDER_UNKNOWN_THEN_FILLED: '지연 후 체결',
  TIMEOUT: '시간 초과',
};

export function displayLabel(value: string): string {
  return DISPLAY_LABELS[value] ?? '기타';
}

export function displayScenarioLabel(value: string): string {
  return SCENARIO_LABELS[value] ?? displayLabel(value);
}

export function displayDatasetVersion(value: string): string {
  return value === 'FINANCIAL_APP_DATASET_V1' || value === 'SYNTHETIC_V1'
    ? '기본 데이터셋 1'
    : '기본 데이터셋';
}

export function displayContractVersion(value: string): string {
  return value === 'platform-v1' ? '플랫폼 버전 1' : '플랫폼 버전';
}

export function displaySimulationDisclaimer(value: string): string {
  return value ===
    'Synthetic financial simulation for technical demonstration only.'
    ? '예시 결과이며 실제 수익을 보장하지 않습니다.'
    : '실제 수익을 보장하지 않는 예시 결과입니다.';
}
