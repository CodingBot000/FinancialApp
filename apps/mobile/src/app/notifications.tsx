import { useRouter } from 'expo-router';

import { NotificationInboxScreen } from '../features/notifications';

export default function NotificationsRoute() {
  const router = useRouter();
  return <NotificationInboxScreen onBack={router.back} />;
}
