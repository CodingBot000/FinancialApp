export const AndroidImportance = { DEFAULT: 3 };
export const AndroidNotificationPriority = { HIGH: 'high' };

const granted = {
  canAskAgain: true,
  expires: 'never',
  granted: true,
  status: 'granted',
};

export async function getPermissionsAsync() {
  return granted;
}

export async function requestPermissionsAsync() {
  return granted;
}

export async function setNotificationChannelAsync() {
  return null;
}

export function setNotificationHandler() {}

export function addNotificationReceivedListener() {
  return { remove() {} };
}

export async function scheduleNotificationAsync() {
  return 'test-local-notification';
}
