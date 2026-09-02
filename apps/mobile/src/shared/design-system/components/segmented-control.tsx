import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radius, spacing } from '../tokens';

export function SegmentedControl<T extends string>({
  options,
  onChange,
  value,
}: {
  readonly options: readonly Readonly<{ label: string; value: T }>[];
  readonly onChange: (value: T) => void;
  readonly value: T;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <AppText tone={selected ? 'primary' : 'secondary'} variant="label">
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.input,
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.small,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[2],
  },
  selected: { backgroundColor: colors.surface.primary },
});
