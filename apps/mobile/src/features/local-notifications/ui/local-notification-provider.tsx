import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, colors, spacing } from '../../../shared/design-system';
import { createExpoLocalNotificationService } from '../model/expo-local-notification-service';
import type {
  LocalNotificationInput,
  LocalNotificationService,
} from '../model/local-notification';

type LocalNotificationContextValue = Readonly<{
  notify(input: LocalNotificationInput): Promise<boolean>;
}>;

const LocalNotificationContext = createContext<
  LocalNotificationContextValue | undefined
>(undefined);

export function LocalNotificationProvider({ children }: PropsWithChildren) {
  const [service] = useState<LocalNotificationService>(
    createExpoLocalNotificationService,
  );
  const [banner, setBanner] = useState<LocalNotificationInput>();
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const showBanner = useCallback((input: LocalNotificationInput) => {
    setBanner(input);
    if (dismissTimerRef.current !== undefined) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      setBanner(undefined);
      dismissTimerRef.current = undefined;
    }, 4500);
  }, []);

  useEffect(() => {
    void service.configure().catch(() => undefined);
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title;
        const body = notification.request.content.body;
        if (title === null || title === undefined) return;
        showBanner({ body: body ?? '', title });
      },
    );

    return () => {
      subscription.remove();
      if (dismissTimerRef.current !== undefined) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [service, showBanner]);

  const notify = useCallback(
    async (input: LocalNotificationInput) => {
      showBanner(input);
      try {
        await service.schedule(input);
        return true;
      } catch {
        return false;
      }
    },
    [service, showBanner],
  );

  return (
    <LocalNotificationContext.Provider value={{ notify }}>
      {children}
      {banner ? <LocalNotificationBanner input={banner} /> : null}
    </LocalNotificationContext.Provider>
  );
}

export function useLocalNotification() {
  const context = useContext(LocalNotificationContext);
  if (context === undefined) {
    throw new Error(
      'useLocalNotification must be used inside LocalNotificationProvider.',
    );
  }
  return context;
}

function LocalNotificationBanner({
  input,
}: {
  readonly input: LocalNotificationInput;
}) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <SafeAreaView edges={['top']} pointerEvents="box-none">
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={`${input.title} ${input.body}`}
          style={styles.banner}
        >
          <View style={styles.indicator} />
          <View style={styles.copy}>
            <AppText style={styles.title} variant="bodyStrong">
              {input.title}
            </AppText>
            <AppText tone="secondary" variant="caption">
              {input.body}
            </AppText>
          </View>
          <AppText tone="tertiary" variant="legal">
            지금
          </AppText>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    borderRadius: 16,
    elevation: 8,
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: colors.text.primary,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  copy: { flex: 1, gap: spacing[1] },
  indicator: {
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
    height: 8,
    marginRight: spacing[3],
    width: 8,
  },
  title: { color: colors.text.primary },
});
