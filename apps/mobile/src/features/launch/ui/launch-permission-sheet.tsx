import { StyleSheet, View } from 'react-native';

import {
  AppText,
  BottomBar,
  Button,
  spacing,
} from '../../../shared/design-system';

export function LaunchPermissionSheet({
  confirming = false,
  onBack,
  onConfirm,
}: {
  readonly confirming?: boolean;
  readonly onBack: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <BottomBar
      accessibilityLabel="접근 권한 안내"
      onBack={onBack}
      variant="sheet"
    >
      <View style={styles.content}>
        <AppText variant="title1">접근 권한 안내</AppText>
        <AppText tone="secondary" variant="body">
          고객님의 편리한 서비스 이용을 위해 다음 선택 권한을 요청합니다.
        </AppText>
        <View style={styles.permissionList}>
          <AppText tone="secondary" variant="body">
            알림(선택) : 서비스 알림 수신{`\n`}
            사진(선택) : 프로필 사진 등록{`\n`}
            카메라(선택) : 신분증 촬영(비대면 계좌개설)
          </AppText>
        </View>
        <AppText tone="secondary" variant="body">
          기종별로 선택적 접근 권한 항목이 다를 수 있으며, 선택 항목을 허용하지
          않아도 서비스 이용이 가능합니다.
        </AppText>
        <Button
          accessibilityLabel="접근 권한 안내 확인"
          disabled={confirming}
          onPress={onConfirm}
          style={styles.confirm}
        >
          {confirming ? '권한 확인 중' : '확인'}
        </Button>
      </View>
    </BottomBar>
  );
}

const styles = StyleSheet.create({
  confirm: { alignSelf: 'stretch', minWidth: 0 },
  content: { gap: spacing[4] },
  permissionList: { paddingTop: spacing[2] },
});
