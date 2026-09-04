export type MockNotification = Readonly<{
  body: string;
  date: string;
  id: string;
  read: boolean;
  title: string;
  type: 'asset' | 'service' | 'trade' | 'plan';
}>;

export const mockNotifications: readonly MockNotification[] = [
  {
    body: '증여세 신고 일정과 공제한도 변경 내용을 확인해보세요.',
    date: '2026.09.03 10:00',
    id: 'service-deadline',
    read: false,
    title: '서비스 이용 안내',
    type: 'service',
  },
  {
    body: '연결된 계좌의 자산 정보가 업데이트되었어요.',
    date: '2026.09.02 18:30',
    id: 'asset-updated',
    read: false,
    title: '자산 업데이트 완료',
    type: 'asset',
  },
  {
    body: '월 납입액을 기준으로 목표 달성 가능성을 계산해보세요.',
    date: '2026.09.01 09:20',
    id: 'plan-preview',
    read: true,
    title: '새로운 플랜을 준비했어요',
    type: 'plan',
  },
  {
    body: '삼성전자 3주 매수 주문이 체결되었어요.',
    date: '2026.08.31 14:05',
    id: 'order-filled',
    read: true,
    title: '주문 체결 안내',
    type: 'trade',
  },
];
