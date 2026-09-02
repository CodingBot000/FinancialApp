import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  colors,
  FullScreenSurface,
} from '../../../shared/design-system';

export function SplashScreen({
  bottomBar,
}: { readonly bottomBar?: ReactNode } = {}) {
  return (
    <FullScreenSurface backgroundColor={colors.background.splash}>
      <View style={styles.center}>
        <AppText style={styles.wordmark} variant="display">
          WM
        </AppText>
      </View>
      {bottomBar ? <View style={styles.bottomBar}>{bottomBar}</View> : null}
    </FullScreenSurface>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  bottomBar: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  wordmark: { color: colors.text.splash, letterSpacing: -1.2 },
});
