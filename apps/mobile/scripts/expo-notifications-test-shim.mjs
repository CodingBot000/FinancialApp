export const AndroidImportance = { DEFAULT: 3 };

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
