import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Calendar, type DateData } from 'react-native-calendars';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  DemoDisclosure,
  FullScreenPage,
  NoticeBanner,
  SectionHeader,
  SegmentedControl,
  colors,
  radius,
  spacing,
  typography,
} from '../../../shared/design-system';
import {
  CONSULTATION_METHODS,
  consultationSelectionLabel,
  type ConsultationMethod,
} from '../model/consultation-options';
import {
  createDemoConsultationAvailability,
  formatConsultationDate,
} from '../model/consultation-availability';
import { configureKoreanCalendarLocale } from '../model/consultation-calendar-locale';
import { TimeSlotPicker } from './time-slot-picker';

configureKoreanCalendarLocale();

type CalendarTheme = NonNullable<ComponentProps<typeof Calendar>['theme']>;
type MarkedDates = NonNullable<ComponentProps<typeof Calendar>['markedDates']>;

const CALENDAR_THEME: CalendarTheme = {
  arrowColor: colors.text.primary,
  calendarBackground: colors.surface.primary,
  dayTextColor: colors.text.primary,
  disabledArrowColor: colors.border.subtle,
  dotColor: colors.brand.primary,
  indicatorColor: colors.brand.primary,
  monthTextColor: colors.text.primary,
  selectedDayBackgroundColor: colors.brand.primary,
  selectedDayTextColor: colors.text.primary,
  selectedDotColor: colors.text.primary,
  textDayFontSize: typography.body.fontSize,
  textDayFontWeight: typography.body.fontWeight,
  textDisabledColor: colors.text.tertiary,
  textMonthFontSize: typography.heading.fontSize,
  textMonthFontWeight: typography.heading.fontWeight,
  textSectionTitleColor: colors.text.secondary,
  todayTextColor: colors.text.brand,
};

export function ConsultationScreen({
  backIcon,
  onBack,
  onComplete,
  onRequestNotification,
  referenceDate,
}: {
  readonly backIcon: ReactNode;
  readonly onBack: () => void;
  readonly onComplete: () => void;
  readonly onRequestNotification: (body: string) => void | Promise<void>;
  readonly referenceDate?: Date;
}) {
  const [method, setMethod] = useState<ConsultationMethod>();
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [completed, setCompleted] = useState(false);
  const availability = useMemo(
    () => createDemoConsultationAvailability(referenceDate),
    [referenceDate],
  );
  const firstDate = availability[0]?.date;
  const lastDate = availability.at(-1)?.date;
  const selectedDay = availability.find((day) => day.date === selectedDate);
  const selectedSlot = selectedDay?.slots.find(
    (slot) => slot.slotId === selectedSlotId,
  );
  const markedDates = useMemo<MarkedDates>(() => {
    const dates: MarkedDates = {};
    for (const day of availability) {
      const hasAvailableSlot = day.slots.some(
        (slot) => slot.status === 'AVAILABLE',
      );
      dates[day.date] = hasAvailableSlot
        ? { dotColor: colors.brand.primary, marked: true }
        : { disabled: true, disableTouchEvent: true };
    }
    if (selectedDate !== undefined && dates[selectedDate] !== undefined) {
      dates[selectedDate] = {
        ...dates[selectedDate],
        marked: true,
        selected: true,
        selectedColor: colors.brand.primary,
      };
    }
    return dates;
  }, [availability, selectedDate]);

  const handleDayPress = (date: DateData) => {
    const day = availability.find((item) => item.date === date.dateString);
    if (
      day === undefined ||
      !day.slots.some((slot) => slot.status === 'AVAILABLE')
    ) {
      return;
    }
    setSelectedDate(day.date);
    setSelectedSlotId(
      day.slots.find((slot) => slot.status === 'AVAILABLE')?.slotId,
    );
  };

  const handleRequest = () => {
    if (
      selectedDay === undefined ||
      selectedSlot === undefined ||
      method === undefined
    ) {
      return;
    }
    const body = consultationSelectionLabel({
      dateLabel: selectedDay.label,
      method,
      slotLabel: selectedSlot.label,
    });
    void onRequestNotification(body);
    setCompleted(true);
  };

  return (
    <FullScreenPage backIcon={backIcon} onBack={onBack} title="코치 상담 요청">
      {completed && method && selectedDay && selectedSlot ? (
        <Card variant="warm">
          <AppText accessibilityRole="header" variant="title2">
            상담 요청이 완료되었어요.
          </AppText>
          <AppText variant="bodyStrong">
            {consultationSelectionLabel({
              dateLabel: selectedDay.label,
              method,
              slotLabel: selectedSlot.label,
            })}
          </AppText>
          <AppText tone="secondary" variant="body">
            포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.
          </AppText>
          <Button onPress={onComplete} variant="brand">
            코치 홈으로
          </Button>
          <Button onPress={() => setCompleted(false)} variant="secondary">
            선택 변경
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="heading">자산배분 점검</AppText>
            <AppText tone="secondary" variant="body">
              현재 배분과 코치 제안안의 차이를 중심으로 상담하는 예시입니다.
            </AppText>
          </Card>

          <Card>
            <SectionHeader title="상담 날짜" />
            <AppText tone="secondary" variant="caption">
              주황색 점이 있는 날짜에 상담 시간이 있어요.
            </AppText>
            {firstDate && lastDate ? (
              <View
                accessible
                accessibilityLabel="상담 가능한 날짜를 선택하는 달력"
                style={styles.calendarWrap}
              >
                <Calendar
                  disableAllTouchEventsForDisabledDays
                  enableSwipeMonths
                  firstDay={1}
                  hideExtraDays
                  initialDate={firstDate}
                  markedDates={markedDates}
                  maxDate={lastDate}
                  minDate={firstDate}
                  monthFormat="yyyy년 M월"
                  onDayPress={handleDayPress}
                  testID="coach-consultation-calendar"
                  theme={CALENDAR_THEME}
                />
              </View>
            ) : (
              <NoticeBanner
                title="상담 가능한 날짜가 없어요."
                variant="warning"
              >
                잠시 후 다시 확인해 주세요.
              </NoticeBanner>
            )}
            {selectedDay ? (
              <AppText
                accessibilityLiveRegion="polite"
                tone="brand"
                variant="bodyStrong"
              >
                선택한 날짜 · {formatConsultationDate(selectedDay.date)}
              </AppText>
            ) : null}
          </Card>

          {selectedDay ? (
            <Card>
              <SectionHeader title="상담 시간" />
              <AppText tone="secondary" variant="caption">
                기본 시간이 선택되어 있어요. 탭하면 변경할 수 있어요.
              </AppText>
              {selectedDay.slots.some((slot) => slot.status === 'AVAILABLE') ? (
                <TimeSlotPicker
                  onSelect={(slot) => setSelectedSlotId(slot.slotId)}
                  selectedSlotId={selectedSlotId}
                  slots={selectedDay.slots}
                />
              ) : (
                <NoticeBanner
                  title="이 날짜에는 상담 가능한 시간이 없어요."
                  variant="warning"
                >
                  다른 날짜를 선택해 주세요.
                </NoticeBanner>
              )}
            </Card>
          ) : null}

          {selectedSlot ? (
            <Card>
              <SectionHeader title="상담 방식" />
              <SegmentedControl
                onChange={setMethod}
                options={CONSULTATION_METHODS}
                value={method ?? ('' as ConsultationMethod)}
              />
            </Card>
          ) : null}

          {selectedDay && selectedSlot && method ? (
            <Card variant="subtle">
              <SectionHeader title="예약 내용" />
              <AppText variant="bodyStrong">자산배분 점검</AppText>
              <AppText tone="secondary" variant="body">
                {consultationSelectionLabel({
                  dateLabel: selectedDay.label,
                  method,
                  slotLabel: selectedSlot.label,
                })}
              </AppText>
            </Card>
          ) : null}

          <Button
            disabled={
              selectedDay === undefined ||
              selectedSlot === undefined ||
              method === undefined
            }
            onPress={handleRequest}
            variant="brand"
          >
            상담 요청하기
          </Button>
          {selectedDay === undefined ||
          selectedSlot === undefined ||
          method === undefined ? (
            <AppText
              style={styles.disabledHint}
              tone="secondary"
              variant="caption"
            >
              날짜·시간·상담 방식을 모두 선택해 주세요.
            </AppText>
          ) : null}
          <DemoDisclosure>
            상담 일정과 요청 결과는 포트폴리오 시연을 위한 예시입니다.
          </DemoDisclosure>
        </>
      )}
    </FullScreenPage>
  );
}

const styles = StyleSheet.create({
  calendarWrap: {
    borderColor: colors.border.subtle,
    borderRadius: radius.input,
    borderWidth: 1,
    overflow: 'hidden',
  },
  disabledHint: { marginTop: -spacing[2], textAlign: 'center' },
});
