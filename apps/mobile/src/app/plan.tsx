import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { SimulationScreen } from '../features/simulation';
import { colors } from '../shared/design-system';

export default function PlanRoute() {
  const router = useRouter();
  return (
    <SimulationScreen
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      onBack={router.back}
    />
  );
}
