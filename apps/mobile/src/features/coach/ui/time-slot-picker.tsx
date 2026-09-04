import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  colors,
  IconButton,
  radius,
  shadows,
  spacing,
} from '../../../shared/design-system';
import type { ConsultationSlot } from '../model/consultation-availability';
import { TimeSlotWheel } from './time-slot-wheel';

function findAvailableSlot(
  slots: readonly ConsultationSlot[],
  slotId: string | undefined,
): ConsultationSlot | undefined {
  const selected = slots.find((slot) => slot.slotId === slotId);
  if (selected?.status === 'AVAILABLE') return selected;
  return slots.find((slot) => slot.status === 'AVAILABLE');
}

export function TimeSlotPicker({
  onSelect,
  selectedSlotId,
  slots,
}: {
  readonly onSelect: (slot: ConsultationSlot) => void;
  readonly selectedSlotId: string | undefined;
  readonly slots: readonly ConsultationSlot[];
}) {
  const defaultSlot = findAvailableSlot(slots, selectedSlotId);
  const defaultSlotId = defaultSlot?.slotId;
  const selectedSlot = slots.find((slot) => slot.slotId === selectedSlotId);
  const [open, setOpen] = useState(false);
  const [draftSlotId, setDraftSlotId] = useState<string | undefined>(
    selectedSlotId ?? defaultSlotId,
  );

  useEffect(() => {
    if (!open) {
      setDraftSlotId(selectedSlotId ?? defaultSlotId);
    }
  }, [defaultSlotId, open, selectedSlotId]);

  const openPicker = () => {
    setDraftSlotId(selectedSlotId ?? defaultSlotId);
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const confirmPicker = () => {
    const nextSlot = slots.find((slot) => slot.slotId === draftSlotId);
    if (nextSlot?.status !== 'AVAILABLE') return;
    onSelect(nextSlot);
    setOpen(false);
  };

  if (defaultSlot === undefined) return null;

  return (
    <>
      <Pressable
        accessibilityLabel={`상담 시간 선택, 현재 ${selectedSlot?.label ?? defaultSlot.label}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
        testID="consultation-time-trigger"
      >
        <View style={styles.triggerCopy}>
          <AppText tone="secondary" variant="caption">
            선택된 시간
          </AppText>
          <AppText variant="title2">
            {selectedSlot?.label ?? defaultSlot.label}
          </AppText>
        </View>
        <Ionicons
          color={colors.text.secondary}
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
        />
      </Pressable>

      {open ? (
        <Modal
          animationType="fade"
          onRequestClose={closePicker}
          statusBarTranslucent
          transparent
          visible
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityLabel="배경을 눌러 시간 선택 닫기"
              accessibilityRole="button"
              onPress={closePicker}
              style={styles.backdrop}
              testID="consultation-time-picker-backdrop"
            />
            <View
              accessibilityLabel="상담 시간 선택 대화상자"
              accessibilityViewIsModal
              style={[styles.dialog, shadows.floating]}
              testID="consultation-time-picker-modal"
            >
              <View style={styles.dialogHeader}>
                <View style={styles.dialogTitle}>
                  <AppText variant="heading">상담 시간 선택</AppText>
                  <AppText tone="secondary" variant="caption">
                    원하는 시간대를 휠에서 골라 주세요.
                  </AppText>
                </View>
                <IconButton
                  accessibilityLabel="시간 선택 닫기"
                  onPress={closePicker}
                >
                  <Ionicons
                    color={colors.text.primary}
                    name="close"
                    size={24}
                  />
                </IconButton>
              </View>

              <TimeSlotWheel
                compact
                onSelect={(slot) => setDraftSlotId(slot.slotId)}
                selectedSlotId={draftSlotId ?? defaultSlotId}
                slots={slots}
              />

              <Button onPress={confirmPicker} variant="brand">
                선택 완료
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.background.inverse,
    bottom: 0,
    left: 0,
    opacity: 0.58,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dialog: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.card,
    gap: spacing[4],
    maxWidth: 380,
    padding: spacing[5],
    width: '88%',
  },
  dialogHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dialogTitle: { flex: 1, gap: spacing[1], paddingTop: spacing[2] },
  modalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  trigger: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing[2],
  },
  triggerCopy: { flex: 1, gap: spacing[1] },
  triggerPressed: { opacity: 0.62 },
});
