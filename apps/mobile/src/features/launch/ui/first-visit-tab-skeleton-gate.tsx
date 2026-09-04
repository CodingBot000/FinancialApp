import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  TabScreenSkeleton,
  colors,
  spacing,
} from '../../../shared/design-system';
import {
  FIRST_VISIT_SKELETON_DURATION_MS,
  type FirstVisitSkeletonTab,
} from '../model/tab-skeleton-config';
import { useTabSkeletonSession } from '../model/tab-skeleton-session';

export function FirstVisitTabSkeletonGate({
  children,
  tabName,
}: PropsWithChildren<{ readonly tabName: FirstVisitSkeletonTab }>) {
  const session = useTabSkeletonSession();
  const [visible, setVisible] = useState(() => !session.hasVisited(tabName));

  useEffect(() => {
    if (!visible) return;
    session.markVisited(tabName);
    const timer = setTimeout(
      () => setVisible(false),
      FIRST_VISIT_SKELETON_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [session, tabName, visible]);

  return (
    <View style={styles.container}>
      <View
        accessibilityElementsHidden={visible}
        importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}
        pointerEvents={visible ? 'none' : 'auto'}
        style={[styles.content, visible ? styles.hidden : null]}
      >
        {children}
      </View>
      {visible ? <TabScreenSkeleton style={styles.skeleton} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background.screen, flex: 1 },
  content: { flex: 1 },
  hidden: { opacity: 0 },
  skeleton: {
    bottom: spacing[0],
    left: spacing[0],
    position: 'absolute',
    right: spacing[0],
    top: spacing[0],
  },
});
