import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  colors,
  radius,
  spacing,
} from '../../../shared/design-system';
import {
  type ConsultationPeriod,
  type ConsultationSlot,
} from '../model/consultation-availability';

const PERIOD_LABELS: readonly Readonly<{
  label: string;
  value: ConsultationPeriod;
}>[] = [
  { label: '오전', value: 'MORNING' },
  { label: '오후', value: 'AFTERNOON' },
  { label: '저녁', value: 'EVENING' },
];

export function TimeSlotGrid({
  onSelect,
  selectedSlotId,
  slots,
}: {
  readonly onSelect: (slot: ConsultationSlot) => void;
  readonly selectedSlotId: string | undefined;
  readonly slots: readonly ConsultationSlot[];
}) {
  return (
    <View style={styles.container}>
      {PERIOD_LABELS.map((period) => {
        const periodSlots = slots.filter(
          (slot) => slot.period === period.value,
        );
        if (periodSlots.length === 0) return null;

        return (
          <View key={period.value} style={styles.period}>
            <AppText tone="secondary" variant="label">
              {period.label}
            </AppText>
            <View style={styles.grid}>
              {periodSlots.map((slot) => {
                const full = slot.status === 'FULL';
                const selected = selectedSlotId === slot.slotId;
                return (
                  <Pressable
                    accessibilityLabel={`${slot.label} ${full ? '마감' : '상담 가능'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ disabled: full, selected }}
                    disabled={full}
                    key={slot.slotId}
                    onPress={() => onSelect(slot)}
                    style={({ pressed }) => [
                      styles.slot,
                      selected && styles.slotSelected,
                      full && styles.slotDisabled,
                      pressed && styles.slotPressed,
                    ]}
                    testID={`consultation-slot-${slot.slotId}`}
                  >
                    <AppText
                      tone={full ? 'tertiary' : 'primary'}
                      variant="bodyStrong"
                    >
                      {slot.label}
                    </AppText>
                    {selected ? (
                      <Ionicons
                        color={colors.text.brand}
                        name="checkmark-circle"
                        size={20}
                      />
                    ) : full ? (
                      <AppText tone="tertiary" variant="caption">
                        마감
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  period: { gap: spacing[2] },
  slot: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.subtle,
    borderRadius: radius.button,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing[3],
    width: '48%',
  },
  slotDisabled: {
    backgroundColor: colors.surface.subtle,
    borderColor: colors.border.subtle,
  },
  slotPressed: { opacity: 0.78 },
  slotSelected: {
    backgroundColor: colors.surface.warm,
    borderColor: colors.brand.primary,
  },
});
