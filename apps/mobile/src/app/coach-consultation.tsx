import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { ConsultationScreen } from '../features/coach';
import { useLocalNotification } from '../features/local-notifications';
import { colors } from '../shared/design-system';

export default function CoachConsultationRoute() {
  const router = useRouter();
  const { notify } = useLocalNotification();
  return (
    <ConsultationScreen
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      onBack={router.back}
      onComplete={router.back}
      onRequestNotification={(body) => {
        void notify({
          body,
          data: { type: 'consultation-requested' },
          title: '상담 요청되었습니다',
        });
      }}
    />
  );
}
