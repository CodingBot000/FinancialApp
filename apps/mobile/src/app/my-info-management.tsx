import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../shared/design-system';
import { SettingsScreen } from '../features/settings';

export default function MyInfoManagementRoute() {
  const router = useRouter();
  return (
    <SettingsScreen
      backIcon={
        <Ionicons color={colors.text.primary} name="chevron-back" size={34} />
      }
      onBack={router.back}
    />
  );
}
