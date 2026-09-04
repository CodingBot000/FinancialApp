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

const DEFAULT_WHEEL_CONFIG = {
  itemHeight: 64,
  visibleItems: 5,
} as const;
const COMPACT_WHEEL_CONFIG = {
  itemHeight: 56,
  visibleItems: 3,
} as const;

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
  centerIndex,
  itemHeight,
  onSelect,
  selected,
  slot,
}: {
  readonly centerIndex: number;
  readonly index: number;
  readonly itemHeight: number;
  readonly onSelect: (slot: ConsultationSlot, index: number) => void;
  readonly selected: boolean;
  readonly slot: ConsultationSlot;
}) {
  const full = slot.status === 'FULL';
  const distanceFromCenter = Math.abs(index - centerIndex);
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
        { height: itemHeight },
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
  compact = false,
  onSelect,
  selectedSlotId,
  slots,
}: {
  readonly compact?: boolean;
  readonly onSelect: (slot: ConsultationSlot) => void;
  readonly selectedSlotId: string | undefined;
  readonly slots: readonly ConsultationSlot[];
}) {
  const config = compact ? COMPACT_WHEEL_CONFIG : DEFAULT_WHEEL_CONFIG;
  const centerIndex = Math.floor(config.visibleItems / 2);
  const wheelPadding = config.itemHeight * centerIndex;
  const wheelHeight = config.itemHeight * config.visibleItems;
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
      y: initialIndex * config.itemHeight,
    });
  }, [config.itemHeight, initialIndex, slots]);

  const onSelectWithScroll = (slot: ConsultationSlot, index: number) => {
    if (slot.status === 'FULL') return;
    scrollRef.current?.scrollTo?.({
      animated: true,
      y: index * config.itemHeight,
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
        Math.round(event.nativeEvent.contentOffset.y / config.itemHeight),
      ),
    );
    const index = nearestAvailableIndex(slots, requestedIndex);
    if (index === undefined) return;
    if (index !== requestedIndex) {
      scrollRef.current?.scrollTo?.({
        animated: true,
        y: index * config.itemHeight,
      });
    }
    onSelect(slots[index]!);
  };

  return (
    <View
      accessibilityLabel="상담 가능한 시간을 세로로 스크롤해 선택하는 휠"
      style={[styles.container, { height: wheelHeight }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingVertical: wheelPadding },
        ]}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleMomentumEnd}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={config.itemHeight}
        style={[styles.list, { height: wheelHeight }]}
        testID="consultation-time-wheel"
      >
        {slots.map((slot, index) => (
          <WheelRow
            centerIndex={centerIndex}
            index={index}
            itemHeight={config.itemHeight}
            key={slot.slotId}
            onSelect={onSelectWithScroll}
            selected={slot.slotId === selectedSlotId}
            slot={slot}
          />
        ))}
      </ScrollView>
      <View
        pointerEvents="none"
        style={[
          styles.selectionWindow,
          { height: config.itemHeight, top: wheelPadding },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {},
  row: {
    alignItems: 'center',
    borderRadius: radius.button,
    flexDirection: 'row',
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
    left: 0,
    position: 'absolute',
    right: 0,
  },
  list: {},
});
