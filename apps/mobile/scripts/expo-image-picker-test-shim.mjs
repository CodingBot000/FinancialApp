const granted = {
  canAskAgain: true,
  expires: 'never',
  granted: true,
  status: 'granted',
};

export async function getMediaLibraryPermissionsAsync() {
  return granted;
}

export async function requestMediaLibraryPermissionsAsync() {
  return granted;
}
