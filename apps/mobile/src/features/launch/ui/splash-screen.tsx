import { type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import splashLogo from '../../../../assets/splash-logo.png';

import { colors, FullScreenSurface } from '../../../shared/design-system';

export function SplashScreen({
  bottomBar,
}: { readonly bottomBar?: ReactNode } = {}) {
  return (
    <FullScreenSurface backgroundColor={colors.background.splash}>
      <View style={styles.center}>
        <Image
          accessibilityLabel="WM 로고"
          resizeMode="contain"
          source={splashLogo}
          style={styles.wordmark}
        />
      </View>
      {bottomBar ? <View style={styles.bottomBar}>{bottomBar}</View> : null}
    </FullScreenSurface>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  bottomBar: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  wordmark: { height: 120, width: 256 },
});
