import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../tokens';

export function SearchField({
  onChangeText,
  onClear,
  value,
}: {
  readonly onChangeText: (value: string) => void;
  readonly onClear?: () => void;
  readonly value: string;
}) {
  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="종목명 또는 종목코드 검색"
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder="종목명 또는 종목코드 검색"
        placeholderTextColor={colors.text.tertiary}
        style={styles.input}
        value={value}
      />
      {value.length > 0 && onClear ? (
        <Pressable
          accessibilityLabel="검색어 지우기"
          accessibilityRole="button"
          onPress={onClear}
          style={styles.clear}
        >
          <View style={styles.clearLine} />
          <View style={[styles.clearLine, styles.clearLineSecond]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clear: {
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing[2],
    width: 44,
  },
  clearLine: {
    backgroundColor: colors.text.tertiary,
    height: 1.5,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 16,
  },
  clearLineSecond: { transform: [{ rotate: '-45deg' }] },
  container: { justifyContent: 'center' },
  input: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.strong,
    borderRadius: radius.input,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    minHeight: 52,
    paddingHorizontal: spacing[4],
    paddingRight: spacing[12],
  },
});
