import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { ConsultationScreen } from '../features/coach';
import { colors } from '../shared/design-system';

export default function CoachConsultationRoute() {
  const router = useRouter();
  return (
    <ConsultationScreen
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      onBack={router.back}
      onComplete={router.back}
    />
  );
}
