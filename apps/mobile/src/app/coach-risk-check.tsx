import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { RiskCheckScreen } from '../features/coach';
import { colors } from '../shared/design-system';

export default function CoachRiskCheckRoute() {
  const router = useRouter();
  return (
    <RiskCheckScreen
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      onBack={router.back}
      onComplete={router.back}
    />
  );
}
