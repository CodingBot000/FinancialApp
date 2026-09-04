import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  AppText,
  colors,
  radius,
  spacing,
} from '../../../shared/design-system';
import type { ConsultationSlot } from '../model/consultation-availability';

const ITEM_HEIGHT = 64;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);
const WHEEL_PADDING = ITEM_HEIGHT * CENTER_INDEX;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function nearestAvailableIndex(
  slots: readonly ConsultationSlot[],
  requestedIndex: number,
): number | undefined {
  const available = slots
    .map((slot, index) => ({ index, slot }))
    .filter(({ slot }) => slot.status === 'AVAILABLE');
  if (available.length === 0) return undefined;
  return available.reduce((best, candidate) => {
    const bestDistance = Math.abs(best.index - requestedIndex);
    const candidateDistance = Math.abs(candidate.index - requestedIndex);
    return candidateDistance < bestDistance ? candidate : best;
  }).index;
}

function periodLabel(slot: ConsultationSlot): string {
  switch (slot.period) {
    case 'MORNING':
      return '오전';
    case 'AFTERNOON':
      return '오후';
    case 'EVENING':
      return '저녁';
  }
}

function WheelRow({
  index,
  onSelect,
  selected,
  slot,
}: {
  readonly index: number;
  readonly onSelect: (slot: ConsultationSlot, index: number) => void;
  readonly selected: boolean;
  readonly slot: ConsultationSlot;
}) {
  const full = slot.status === 'FULL';
  const distanceFromCenter = Math.abs(index - CENTER_INDEX);
  const faded = !selected && distanceFromCenter > 0;
  return (
    <Pressable
      accessibilityLabel={`${slot.label} ${full ? '마감' : '상담 가능'}`}
      accessibilityRole="radio"
      accessibilityState={{ disabled: full, selected }}
      disabled={full}
      onPress={() => onSelect(slot, index)}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        full && styles.rowDisabled,
        faded && styles.rowFaded,
        pressed && styles.rowPressed,
      ]}
      testID={`consultation-slot-${slot.slotId}`}
    >
      <View style={styles.rowCopy}>
        <AppText tone={full ? 'tertiary' : 'secondary'} variant="caption">
          {periodLabel(slot)}
        </AppText>
        <AppText tone={full ? 'tertiary' : 'primary'} variant="title2">
          {slot.label}
        </AppText>
      </View>
      <View style={styles.trailingSlot}>
        {selected ? (
          <Ionicons
            color={colors.text.brand}
            name="checkmark-circle"
            size={24}
          />
        ) : full ? (
          <AppText tone="tertiary" variant="caption">
            마감
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function TimeSlotWheel({
  onSelect,
  selectedSlotId,
  slots,
}: {
  readonly onSelect: (slot: ConsultationSlot) => void;
  readonly selectedSlotId: string | undefined;
  readonly slots: readonly ConsultationSlot[];
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = slots.findIndex(
    (slot) => slot.slotId === selectedSlotId,
  );
  const initialIndex =
    selectedIndex >= 0 ? selectedIndex : nearestAvailableIndex(slots, 0);

  useEffect(() => {
    if (initialIndex === undefined) return;
    scrollRef.current?.scrollTo?.({
      animated: false,
      y: initialIndex * ITEM_HEIGHT,
    });
  }, [initialIndex, slots]);

  const onSelectWithScroll = (slot: ConsultationSlot, index: number) => {
    if (slot.status === 'FULL') return;
    scrollRef.current?.scrollTo?.({
      animated: true,
      y: index * ITEM_HEIGHT,
    });
    onSelect(slot);
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const requestedIndex = Math.max(
      0,
      Math.min(
        slots.length - 1,
        Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT),
      ),
    );
    const index = nearestAvailableIndex(slots, requestedIndex);
    if (index === undefined) return;
    if (index !== requestedIndex) {
      scrollRef.current?.scrollTo?.({
        animated: true,
        y: index * ITEM_HEIGHT,
      });
    }
    onSelect(slots[index]!);
  };

  return (
    <View
      accessibilityLabel="상담 가능한 시간을 세로로 스크롤해 선택하는 휠"
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleMomentumEnd}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={ITEM_HEIGHT}
        style={styles.list}
        testID="consultation-time-wheel"
      >
        {slots.map((slot, index) => (
          <WheelRow
            index={index}
            key={slot.slotId}
            onSelect={onSelectWithScroll}
            selected={slot.slotId === selectedSlotId}
            slot={slot}
          />
        ))}
      </ScrollView>
      <View pointerEvents="none" style={styles.selectionWindow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: WHEEL_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  content: { paddingVertical: WHEEL_PADDING },
  list: { height: WHEEL_HEIGHT },
  row: {
    alignItems: 'center',
    borderRadius: radius.button,
    flexDirection: 'row',
    height: ITEM_HEIGHT,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
  },
  rowCopy: { alignItems: 'center', flex: 1, gap: spacing[1] },
  rowDisabled: { opacity: 0.48 },
  rowFaded: { opacity: 0.55, transform: [{ scale: 0.94 }] },
  rowPressed: { opacity: 0.78 },
  rowSelected: {
    backgroundColor: colors.surface.warm,
    borderColor: colors.brand.primary,
    borderWidth: 1,
  },
  trailingSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
  },
  selectionWindow: {
    borderColor: colors.brand.primary,
    borderRadius: radius.button,
    borderWidth: 1,
    height: ITEM_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
    top: WHEEL_PADDING,
  },
});
