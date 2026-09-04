import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../tokens';

export function SearchField({
  onChangeText,
  onClear,
  onSearch,
  value,
}: {
  readonly onChangeText: (value: string) => void;
  readonly onClear?: () => void;
  readonly onSearch?: () => void;
  readonly value: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          accessibilityLabel="종목명 또는 종목코드 검색"
          autoCapitalize="none"
          onChangeText={onChangeText}
          onSubmitEditing={onSearch}
          placeholder="종목명 또는 종목코드 검색"
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="search"
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
      {onSearch ? (
        <Pressable
          accessibilityLabel="검색 실행"
          accessibilityRole="button"
          accessibilityState={{ disabled: value.trim().length === 0 }}
          disabled={value.trim().length === 0}
          onPress={onSearch}
          style={({ pressed }) => [
            styles.searchButton,
            value.trim().length === 0 && styles.searchButtonDisabled,
            pressed && styles.searchButtonPressed,
          ]}
        >
          <Text
            style={[
              styles.searchButtonText,
              value.trim().length === 0 && styles.searchButtonTextDisabled,
            ]}
          >
            검색
          </Text>
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
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  inputContainer: { flex: 1, justifyContent: 'center' },
  input: {
    backgroundColor: colors.surface.subtle,
    borderColor: 'transparent',
    borderRadius: radius.input,
    borderWidth: 1,
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    minHeight: 52,
    paddingHorizontal: spacing[4],
    paddingRight: spacing[12],
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.action.brandBackground,
    borderRadius: radius.button,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 64,
    paddingHorizontal: spacing[3],
  },
  searchButtonDisabled: {
    backgroundColor: colors.action.disabledBackground,
  },
  searchButtonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  searchButtonText: {
    color: colors.action.brandText,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  searchButtonTextDisabled: { color: colors.action.disabledText },
});
