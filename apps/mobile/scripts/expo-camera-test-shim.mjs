const granted = {
  canAskAgain: true,
  expires: 'never',
  granted: true,
  status: 'granted',
};

export const Camera = {
  async getCameraPermissionsAsync() {
    return granted;
  },
  async requestCameraPermissionsAsync() {
    return granted;
  },
};
