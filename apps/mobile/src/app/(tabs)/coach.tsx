import { useRouter } from 'expo-router';

import { CoachScreen } from '../../features/coach';

export default function CoachRoute() {
  const router = useRouter();
  return (
    <CoachScreen
      onOpenConsultation={() => router.push('/coach-consultation' as never)}
      onOpenPlan={() => router.push('/plan' as never)}
      onOpenRiskCheck={() => router.push('/coach-risk-check' as never)}
    />
  );
}
