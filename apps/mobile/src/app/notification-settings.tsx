import { useRouter } from 'expo-router';

import { NotificationSettingsScreen } from '../features/settings';

export default function NotificationSettingsRoute() {
  const router = useRouter();
  return <NotificationSettingsScreen onBack={router.back} />;
}
