import { useState, type ReactNode } from 'react';

import {
  AppText,
  Button,
  Card,
  FullScreenPage,
  SegmentedControl,
} from '../../../shared/design-system';
import {
  CONSULTATION_METHODS,
  CONSULTATION_TIMES,
  consultationSelectionLabel,
  type ConsultationMethod,
  type ConsultationTime,
} from '../model/consultation-options';

export function ConsultationScreen({
  backIcon,
  onBack,
  onComplete,
}: {
  readonly backIcon: ReactNode;
  readonly onBack: () => void;
  readonly onComplete: () => void;
}) {
  const [method, setMethod] = useState<ConsultationMethod>();
  const [time, setTime] = useState<ConsultationTime>();
  const [completed, setCompleted] = useState(false);

  return (
    <FullScreenPage backIcon={backIcon} onBack={onBack} title="코치 상담 요청">
      {completed && method && time ? (
        <Card variant="warm">
          <AppText accessibilityRole="header" variant="title2">
            상담 요청이 완료되었어요.
          </AppText>
          <AppText variant="bodyStrong">
            {consultationSelectionLabel(method, time)}
          </AppText>
          <AppText tone="secondary" variant="body">
            포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.
          </AppText>
          <Button onPress={onComplete} variant="brand">
            코치 홈으로
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="heading">자산배분 점검</AppText>
            <AppText tone="secondary" variant="body">
              현재 배분과 코치 제안안의 차이를 중심으로 상담하는 예시입니다.
            </AppText>
          </Card>
          <Card>
            <AppText variant="heading">상담 방식</AppText>
            <SegmentedControl
              onChange={setMethod}
              options={CONSULTATION_METHODS}
              value={method ?? ('' as ConsultationMethod)}
            />
          </Card>
          <Card>
            <AppText variant="heading">희망 시간</AppText>
            <SegmentedControl
              onChange={setTime}
              options={CONSULTATION_TIMES}
              value={time ?? ('' as ConsultationTime)}
            />
          </Card>
          <Button
            disabled={method === undefined || time === undefined}
            onPress={() => setCompleted(true)}
            variant="brand"
          >
            상담 요청하기
          </Button>
        </>
      )}
    </FullScreenPage>
  );
}
