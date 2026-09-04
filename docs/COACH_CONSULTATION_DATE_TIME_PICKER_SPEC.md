# 코치 상담 날짜·시간 선택 UI/UX 구현 명세

- 상태: 구현 착수 가능 확정안
- 작성일: 2026-09-04
- 대상: `apps/mobile`
- 선행 문서: `docs/COACH_EXPERIENCE_IMPLEMENTATION_SPEC.md`
- 적용 범위: 기존 `/coach-consultation` 화면의 날짜·시간 선택 영역
- 현재 구현과의 관계: 기존 상담 방식·완료 상태·local notification callback은 유지하고 날짜·시간 선택만 교체한다.

이 문서는 기존 상담 화면의 고정 시간 선택지(`오늘 19:00`, `내일 13:00`, `내일 19:00`)를 달력과 시간대 선택 UX로 교체하기 위한 명세다. 코치 홈, 투자성향 진단, 자산·시뮬레이션 기능은 변경하지 않는다.

## 1. 목표와 결정

### 1.1 사용자 경험 목표

사용자가 다음 순서로 자연스럽게 상담을 예약하는 느낌을 받아야 한다.

```text
상담 날짜 선택
→ 선택한 날짜의 예약 가능 시간 확인
→ 상담 방식 선택
→ 예약 내용 확인
→ 포트폴리오용 가상 요청 완료
```

달력에서는 예약 가능한 날과 불가능한 날을 한눈에 구분하고, 날짜를 고른 뒤에만 해당 날짜의 시간을 보여 준다. 날짜를 선택하면 첫 번째 예약 가능 시간이 기본값으로 선택되며, 시간 텍스트를 눌렀을 때만 반투명 오버레이가 있는 모달에서 변경할 수 있다. 상담 방식까지 선택하기 전에는 상담 요청 CTA를 활성화하지 않는다.

### 1.2 구현 결정

1. 달력은 `react-native-calendars`의 기본 `Calendar` 컴포넌트를 사용한다.
2. 날짜 계산과 날짜 문자열 포맷은 `date-fns`를 사용한다.
3. 시간은 임의의 시각을 입력하는 native time picker가 아니라, 상담 예약에 맞는 가용 시간대 세로 wheel로 제공한다.
4. 가용 날짜·시간 데이터는 서버가 아닌 feature model의 합성 availability config에서 생성한다.
5. 상담 완료와 선택값은 기존과 같이 component local state로 처리한다. 현재 존재하는 local notification callback은 유지한다.
6. 기존 `FullScreenPage`, `Card`, `Button`, `SegmentedControl`, `NoticeBanner`, `DemoDisclosure`와 현재 token을 유지한다.
7. 새 범용 디자인 시스템 component는 만들지 않는다. 시간 트리거와 모달 조합은 상담 feature 전용 component로 둔다.
8. `ExpandableCalendar`, `Agenda`, custom `dayComponent`는 첫 구현에서 사용하지 않는다.
9. 실제 예약 API, 캘린더 권한, 원격 push·문자·이메일 발송, 예약 충돌 검사는 범위 밖이다. 기존 local notification demo callback은 완료 시 선택 요약을 전달한다.

## 2. 라이브러리 조사와 선택 근거

조사 기준일은 2026-09-04다. 버전은 구현 시작 시 다시 조회하지 않고, 아래 버전을 exact dependency로 고정한 뒤 lockfile로 재현한다.

### 2.1 선택 라이브러리

#### `react-native-calendars` `1.1314.0` — 달력

선택 이유:

- iOS·Android용 선언적 Calendar component다.
- Expo/CRNA와 함께 사용할 수 있고, pure JavaScript라 native module linking이 필요 없다.
- `markedDates`, `minDate`, `maxDate`, `disabledByDefault`, `onDayPress`, `enableSwipeMonths`를 제공한다.
- 테마, 헤더, 날짜 표시와 locale을 조정할 수 있다.
- 접근성 지원과 component test ID 규칙이 있다.
- 2026년 조사 시점 latest tag가 `1.1314.0`이며 MIT 라이선스다.

근거: [공식 Intro](https://wix.github.io/react-native-calendars/docs/Intro), [공식 Calendar API](https://wix.github.io/react-native-calendars/docs/Components/Calendar), [공식 GitHub release](https://github.com/wix/react-native-calendars/releases), [npm package](https://www.npmjs.com/package/react-native-calendars?activeTab=versions)

첫 구현에서는 기본 `Calendar`만 사용한다. `ExpandableCalendar`나 `Agenda`를 추가하면 제스처·스크롤·높이 상태가 늘어나므로 현재 한 화면 예약 흐름에는 이득보다 복잡도가 크다. `dayComponent`를 직접 만들면 성능 최적화와 접근성 책임이 앱으로 넘어가므로, dot marking과 theme으로 먼저 구현한다.

#### `date-fns` `4.4.0` — 날짜 계산

선택 이유:

- `addDays`, `format`, `startOfDay`, `getDay`, `parseISO`처럼 필요한 함수만 import할 수 있다.
- 순수 함수와 immutable 반환값을 사용해 날짜 계산을 테스트하기 쉽다.
- TypeScript와 locale을 지원한다.
- 4.x stable을 사용하고 5.x alpha는 사용하지 않는다.

근거: [공식 GitHub](https://github.com/date-fns/date-fns), [npm package](https://www.npmjs.com/package/date-fns?activeTab=versions)

날짜-only 값은 `yyyy-MM-dd` 문자열로 보관한다. `new Date('yyyy-MM-dd')`를 직접 사용하지 않아 UTC 변환으로 하루가 밀리는 문제를 피한다. 표시용 Date 객체가 필요할 때는 `parseISO`와 앱 locale을 사용한다.

### 2.2 검토했지만 선택하지 않은 라이브러리

| 라이브러리 | 장점 | 이번 범위에서 선택하지 않은 이유 |
|---|---|---|
| `@expo/ui` DateTimePicker `~57.0.15` | Expo 공식 drop-in, Android Material 3·iOS SwiftUI, date/time 지원 | Android는 dialog, iOS는 inline 중심이라 화면 구성이 달라지고, 예약 가능 slot을 표시하기 어렵다 |
| `@react-native-community/datetimepicker` `9.1.0` | 검증된 native date/time picker, Expo 설치 경로 제공 | 시스템 UI 중심이라 현재 WM 디자인과 시각적으로 분리되고, Android는 imperative API가 권장된다 |
| `react-native-paper-dates` `0.23.16` | 날짜·시간 모두 제공, Material 3, locale·virtualized month 지원 | 현재 앱에 없는 `react-native-paper`와 별도 theme provider를 추가해야 해 디자인 시스템이 이중화된다 |
| `@quidone/react-native-calendars` | 현대적인 Calendar API | 공식 저장소가 2026-04-01 archive되어 신규 선택에서 제외한다 |

근거: [Expo DateTimePicker](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/datetimepicker/), [Expo community DateTimePicker](https://docs.expo.dev/versions/latest/sdk/date-time-picker/), [datetimepicker 공식 GitHub](https://github.com/react-native-datetimepicker/datetimepicker), [react-native-paper-dates 공식 GitHub](https://github.com/web-ridge/react-native-paper-dates), [quidone 저장소 archive 안내](https://github.com/quidone/react-native-calendars)

예약 가능한 시간 목록은 특정 값의 짧은 목록이므로 free-form time picker보다 slot 선택이 적합하다. Apple HIG도 짧은 선택 목록에는 picker가 시각적 무게를 더할 수 있고, picker는 입력 맥락 가까이에 배치하라고 안내한다. [Apple HIG Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)

### 2.3 설치 범위

```json
{
  "date-fns": "4.4.0",
  "react-native-calendars": "1.1314.0"
}
```

- `apps/mobile/package.json`에 exact version 추가
- root `package-lock.json` 갱신
- 두 패키지는 native module linking이나 Expo config plugin을 추가하지 않는다.
- `npm install` 후 Android Development Build, web export와 TypeScript를 확인한다.
- web export가 패키지의 플랫폼 처리에서 실패할 때만 `.web.tsx` fallback을 검토한다. 첫 구현부터 분기 구현을 만들지 않는다.

## 3. 화면 UX 구성

### 3.1 전체 순서

현재 `FullScreenPage` 구조와 헤더는 유지한다.

1. 상담 주제 카드
2. 상담 날짜 Calendar 카드
3. 선택 날짜의 기본 시간과 시간 변경 트리거 카드
4. 상담 방식 카드
5. 예약 내용 요약 카드
6. 상담 요청 CTA
7. 포트폴리오 고지

날짜를 선택하기 전에는 3~5번을 숨기거나 비활성화한다. 화면이 처음부터 긴 form처럼 보이지 않도록 날짜 선택을 첫 번째 상호작용으로 만든다.

### 3.2 화면 문구

#### 헤더

- title: `코치 상담 요청`

#### 상담 주제 카드

- title: `자산배분 점검`
- body: `현재 배분과 코치 제안안의 차이를 중심으로 상담하는 예시입니다.`

#### 날짜 카드

- section title: `상담 날짜`
- helper: `주황색 점이 있는 날짜에 상담 시간이 있어요.`
- empty/error title: `상담 가능한 날짜가 없어요.`
- empty/error body: `잠시 후 다시 확인해 주세요.`

#### 선택 날짜

- section title: `선택한 날짜`
- value: `{M월 d일 (요일)}`

#### 시간 카드

- section title: `상담 시간`
- helper: `기본 시간이 선택되어 있어요. 탭하면 변경할 수 있어요.`
- initial value: 선택한 날짜의 첫 번째 `AVAILABLE` slot
- trigger: 버튼처럼 보이지 않는 텍스트형 `Pressable`, 현재 시간과 chevron 표시
- trigger accessibility label: `상담 시간 선택, 현재 {HH:mm}`
- trigger test ID: `consultation-time-trigger`
- initial state: 시간 변경 모달은 닫혀 있음
- group labels: `오전`, `오후`, `저녁`
- available slot: `{HH:mm}`
- full slot: `{HH:mm}`와 함께 `마감` 표시
- no slot banner: `이 날짜에는 상담 가능한 시간이 없어요.`
- no slot body: `다른 날짜를 선택해 주세요.`

시간 트리거를 누르면 화면 위에 검정색 반투명 scrim을 깔고 `상담 시간 선택` 모달을 표시한다. 모달 안에서만 세로 wheel을 조작하며, `선택 완료`를 누르면 변경값을 확정하고 모달을 닫는다. 닫기 아이콘·scrim·Android 뒤로가기는 변경을 확정하지 않고 닫힌다.

#### 방식 카드

- section title: `상담 방식`
- options: `전화`, `화상`

#### 예약 내용 카드

- section title: `예약 내용`
- rows:
  - `주제` · `자산배분 점검`
  - `일시` · `{M월 d일 (요일)} · {HH:mm}`
  - `방식` · `전화` 또는 `화상`

#### CTA

- primary: `상담 요청하기`
- disabled helper: `날짜·시간·상담 방식을 모두 선택해 주세요.`
- completed title: `상담 요청이 완료되었어요.`
- completed summary: `{M월 d일 (요일)} · {HH:mm} · {방식} 상담`
- completed body: `포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.`
- completed primary: `코치 홈으로`
- completed secondary: `선택 변경`

#### 고지

```text
상담 일정과 요청 결과는 포트폴리오 시연을 위한 예시입니다.
```

기존의 `포트폴리오 시연을 위해 이 화면에서만 처리된 요청입니다.` 문구와 함께 완료 카드에 표시한다.

### 3.3 Calendar 표현

`react-native-calendars` 기본 `Calendar`에 다음 props를 사용한다.

```text
testID="coach-consultation-calendar"
firstDay={1}
enableSwipeMonths
hideExtraDays
disableAllTouchEventsForDisabledDays
initialDate={firstAvailableDate}
minDate={firstAvailableDate}
maxDate={lastAvailableDate}
monthFormat="yyyy년 M월"
markedDates={memoizedMarkedDates}
onDayPress={handleDayPress}
```

#### 날짜 상태

| 상태 | 달력 표시 | 선택 가능 여부 |
|---|---|---|
| 예약 가능 | 주황색 dot | 가능 |
| 선택됨 | 주황색 selected background + 흰색 selected dot | 가능 |
| 모든 시간이 마감 | 회색 disabled day | 불가 |
| 일요일·availability 없음 | disabled day | 불가 |
| 범위 밖 | Calendar min/max에 의해 회색 표시 | 불가 |

`markedDates` 객체는 `useMemo`로 새 reference를 생성한다. 공식 문서가 marked dates object가 같은 reference로 변경되면 Calendar update가 발생하지 않을 수 있다고 안내하므로, mutation으로 수정하지 않는다.

#### Calendar theme

기존 token을 매핑한다.

| Calendar theme key | 기존 token |
|---|---|
| `calendarBackground` | `colors.surface.primary` |
| `selectedDayBackgroundColor` | `colors.brand.primary` |
| `selectedDayTextColor` | `colors.text.primary` |
| `todayTextColor` | `colors.text.brand` |
| `dayTextColor` | `colors.text.primary` |
| `textDisabledColor` | `colors.text.tertiary` |
| `dotColor` | `colors.brand.primary` |
| `selectedDotColor` | `colors.text.primary` |
| `arrowColor` | `colors.text.primary` |
| `disabledArrowColor` | `colors.border.subtle` |
| `monthTextColor` | `colors.text.primary` |
| `indicatorColor` | `colors.brand.primary` |

font size와 weight는 `typography.caption`, `typography.body`, `typography.label`의 값을 사용한다. feature UI에 raw hex, 임의 spacing, 임의 radius를 추가하지 않는다.

#### 한국어 locale

- `LocaleConfig`를 module initialization에서 한 번만 등록한다.
- month names, short month names, day names와 short day names를 한국어로 제공한다.
- week start는 월요일(`firstDay=1`)로 설정한다.
- locale 등록은 component render마다 실행하지 않는다.

### 3.4 세로 시간 wheel

시간은 자유 입력이 아니라 상담 가능한 slot을 세로로 스크롤해 선택한다.

- React Native `ScrollView`에 `snapToInterval`을 적용한다.
- 기본 wheel은 한 화면에 5개 row를 노출하고 가운데 row를 선택 영역으로 사용한다.
- 기본 row 높이는 64px이며, Modal에서는 `compact` 3-row wheel과 56px row를 사용해 dialog 높이를 줄인다.
- 가운데 선택 영역은 `colors.brand.primary` border로 강조한다.
- 가운데 row는 `colors.surface.warm`, 인접 row는 축소·투명도 감소로 wheel 깊이를 표현한다.
- 선택·미선택·마감 row 모두 동일한 우측 trailing slot을 예약해 시간 텍스트의 중앙 정렬을 유지한다.
- 마감 row는 `colors.surface.subtle`, tertiary text와 `마감` label을 사용하고 disabled 처리한다.
- `pressed` 상태는 기존 Button과 같은 opacity 감각을 사용한다.
- 각 slot은 `accessibilityRole="radio"`와 `accessibilityState.selected/disabled`를 제공한다.
- slot 전체 label은 `10:00 상담 가능`, `15:00 마감`처럼 읽힌다.
- 사용자가 마감 row에 멈추면 가장 가까운 예약 가능 row로 보정하고 그 slot을 선택한다.

오전·오후·저녁 그룹을 분리해 시간 목록을 빠르게 훑을 수 있게 한다. 그룹에 slot이 없으면 해당 그룹은 렌더링하지 않는다.

### 3.5 시간 트리거와 모달

- React Native `Modal`의 `transparent`와 `animationType="fade"`를 사용한다.
- scrim은 `colors.background.inverse`와 opacity를 사용해 후면 화면을 검정색 반투명으로 처리한다.
- dialog는 기존 `Card`와 동일한 surface·radius·shadow token 감각을 따른다.
- dialog header에는 `상담 시간 선택`, 보조 문구와 닫기 `IconButton`을 둔다.
- wheel의 임시 선택값은 모달 내부에서만 유지하고 `선택 완료` 시 부모의 최종 slot을 갱신한다.
- 초기 기본값은 모달을 열 때 중앙에 위치한다.
- 모달은 화면 첫 진입과 날짜 선택 직후에는 노출하지 않는다.

### 3.6 상담 방식

기존 `SegmentedControl`을 유지한다.

- `전화`
- `화상`

날짜를 고르면 첫 번째 available 시간이 기본 선택되고 시간 trigger와 방식 카드가 표시된다. 시간을 바꾸고 싶을 때만 trigger를 눌러 모달 wheel을 열며, 방식은 default 선택하지 않고 사용자의 명시 선택을 요구한다.

### 3.7 예약 내용 요약

날짜·시간·방식을 모두 선택했을 때만 표시한다. CTA 바로 위에 배치해 사용자가 제출 전 선택 내용을 검토할 수 있게 한다.

요약 카드에는 다음만 표시한다.

- 자산배분 점검
- 선택 날짜와 시간
- 전화 또는 화상

예약 ID, 담당자 이름, 실제 확정 문구와 알림 발송 문구는 사용하지 않는다.

## 4. 합성 availability 데이터 설계

### 4.1 데이터 소유권

```text
consultation-screen.tsx
→ createDemoConsultationAvailability(referenceDate)
→ 날짜별 slot과 상태를 view model로 변환
→ Calendar + TimeSlotPicker 렌더링
```

화면 JSX에 날짜·시간·마감 상태를 직접 작성하지 않는다. 기존 데이터 하드코딩 금지 원칙과 동일하게, 고정 제품 설정은 model/config에 두고 UI는 view model만 렌더링한다.

### 4.2 기간

- 첫 선택 가능일: 기준일 다음 날
- 선택 가능 기간: 연속 14일
- 마지막 선택 가능일: 첫 선택 가능일로부터 13일 뒤
- 기준일은 production clock을 직접 테스트하지 않도록 `createDemoConsultationAvailability(referenceDate = new Date())`의 인자로 주입한다.
- 테스트에서는 `2026-09-04`를 기준일로 사용한다.

### 4.3 요일별 기본 slot

| 요일 | 기본 시간 |
|---|---|
| 월~금 | `10:00`, `13:00`, `15:00`, `19:00` |
| 토요일 | `10:00`, `13:00` |
| 일요일 | 없음 |

시연에서 마감 상태도 보이도록 availability config에서 일부 slot을 `FULL`로 지정한다. 특정 날짜의 실제 업무 가능성을 주장하지 않으며, 단지 disabled 상태를 검증하기 위한 예시다.

권장 예시:

- 기준일 다음 날로부터 2번째 영업일의 `15:00`: `FULL`
- 기준일 다음 날로부터 5번째 영업일의 `19:00`: `FULL`

### 4.4 TypeScript model

```ts
type ConsultationPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';
type ConsultationSlotStatus = 'AVAILABLE' | 'FULL';

interface ConsultationSlot {
  readonly slotId: string;
  readonly date: string; // yyyy-MM-dd
  readonly label: string; // HH:mm
  readonly period: ConsultationPeriod;
  readonly status: ConsultationSlotStatus;
}

interface ConsultationDay {
  readonly date: string; // yyyy-MM-dd
  readonly label: string; // M월 d일 (요일)
  readonly slots: readonly ConsultationSlot[];
}
```

`ConsultationDay`와 `ConsultationSlot`은 API response type으로 가장하지 않는다. 이 값은 local demo availability model이다.

### 4.5 날짜 변경 규칙

- 날짜를 바꾸면 새 날짜의 첫 번째 available slot을 기본값으로 선택한다.
- 새 날짜에 가능한 slot이 없으면 시간 카드 대신 no-slot banner를 표시한다.
- 날짜를 바꿔도 상담 방식 선택은 유지한다.
- 월을 넘겨도 선택 날짜는 변경하지 않는다.
- 범위 밖 날짜는 Calendar가 터치되지 않게 한다.

## 5. 상태 전이

```text
DATE_UNSELECTED
→ DATE_SELECTED
→ TIME_SELECTED
→ METHOD_SELECTED
→ REVIEW_READY
→ COMPLETED
```

| 상태 | 조건 | 표시 | CTA |
|---|---|---|---|
| `DATE_UNSELECTED` | 날짜 없음 | 주제 + Calendar | disabled |
| `DATE_SELECTED` | 날짜 선택, 첫 available 시간 기본 선택 | 선택 날짜 + 텍스트형 시간 trigger + 방식 선택 | disabled |
| `TIME_SELECTED` | 모달에서 시간 변경 후 선택 완료 | 확정 시간 + 방식 선택 | disabled |
| `METHOD_SELECTED` | 날짜·시간·방식 선택 | 예약 요약 | enabled |
| `COMPLETED` | 상담 요청하기 선택 | 완료 카드 | 코치 홈/선택 변경 |
| `NO_SLOT` | 선택 날짜 slot 없음 | warning banner | 다른 날짜 선택 |
| `INVALID_AVAILABILITY` | config가 비어 있음 | ErrorState | 다시 시도 또는 뒤로가기 |

API 호출이 없으므로 loading 상태는 만들지 않는다. component mount 시 availability 계산은 즉시 완료되어야 한다.

## 6. 파일 단위 구현 명세

### 6.1 신규 파일

#### `apps/mobile/src/features/coach/model/consultation-availability.ts`

- 14일 합성 availability 생성
- date-fns 기반 날짜 계산
- 요일별 slot template
- `AVAILABLE`/`FULL` 상태 생성
- `firstAvailableDate`, `lastAvailableDate` 계산
- 테스트에서 reference date를 주입할 수 있는 함수 API 제공

#### `apps/mobile/src/features/coach/model/consultation-availability.test.ts`

- 기준일 `2026-09-04`에서 14일이 생성되는지 검증
- 첫 날짜가 다음 날인지 검증
- 월~금·토요일·일요일 slot 정책 검증
- 일부 `FULL` slot 검증
- 모든 date와 slot label이 `yyyy-MM-dd`, `HH:mm` 규칙인지 검증
- 생성 함수가 같은 기준일에 같은 결과를 반환하는지 검증

#### `apps/mobile/src/features/coach/model/consultation-calendar-locale.ts`

- 한국어 `LocaleConfig` 등록
- module render마다 중복 등록하지 않는 idempotent 함수 제공
- locale 등록 자체는 component test에서 한 번만 확인

#### `apps/mobile/src/features/coach/ui/time-slot-wheel.tsx`

- 오전·오후·저녁 label과 시간 row를 포함한 세로 snap wheel
- 기본 5-row/64px와 Modal 전용 `compact` 3-row/56px 변형 제공
- 외부 `FullScreenPage` ScrollView 안에 들어가므로 VirtualizedList인 `FlatList`는 사용하지 않는다.
- slot 수가 작고 고정된 상담 시간 목록이므로 `ScrollView`가 nested list 경고 없이 적합하다.
- 중앙 selection window와 인접 row fade/scale 표현
- trailing slot 고정 폭으로 선택 아이콘 유무와 관계없이 시간 중앙 정렬 유지
- available, selected, full 상태 표현
- 마감 row에서 가장 가까운 available row로 선택 보정
- `accessibilityRole="radio"`
- `accessibilityState` selected/disabled
- 디자인 token만 사용
- 상담 feature 밖으로 export하지 않음

#### `apps/mobile/src/features/coach/ui/time-slot-wheel.test.tsx`

- 세로 slot row와 시간대 label 표시
- `snapToInterval`, 기본 5-row/compact 3-row wheel 높이와 test ID 확인
- selected 상태 표시
- full slot disabled와 `마감` 표시
- press callback이 slot id를 전달하는지 검증
- accessibility state 검증

### 6.2 수정 파일

#### `apps/mobile/src/features/coach/model/consultation-options.ts`

- `CONSULTATION_METHODS`와 `ConsultationMethod`는 유지
- 기존 고정 `CONSULTATION_TIMES` enum/array는 제거하거나 availability model로 이동
- 선택 결과 label helper는 date label과 slot label을 입력받도록 확장

예상 helper:

```ts
export function consultationSelectionLabel({
  dateLabel,
  method,
  slotLabel,
}: {
  readonly dateLabel: string;
  readonly method: ConsultationMethod;
  readonly slotLabel: string;
}): string;
```

#### `apps/mobile/src/features/coach/ui/consultation-screen.tsx`

- 기존 `CONSULTATION_TIMES` SegmentedControl 제거
- `Calendar`와 `TimeSlotPicker` 추가
- local state를 `selectedDate`, `selectedSlotId`, `method`, `completed`로 변경
- 날짜 변경 시 새 날짜의 첫 번째 available slot을 기본값으로 설정
- 날짜·시간·방식 선택 뒤 예약 요약 card 표시
- 기존 `FullScreenPage`, topic card, method card, completion card와 callback 유지
- navigation callback(`onBack`, `onComplete`)은 유지
- 현재 `onRequestNotification` callback을 받고 있다면 유지하고, 완료 시 동적 날짜·시간·방식 요약을 전달
- `DemoDisclosure` 고지 문구 유지
- `react-native-calendars` Calendar import와 locale setup은 UI 경계에서만 사용
- JSX에는 실제 날짜·시간 literal을 작성하지 않음

#### `apps/mobile/src/features/coach/ui/time-slot-picker.tsx`

- 선택된 시간 label을 텍스트형 trigger로 표시
- trigger를 누르기 전에는 wheel dialog를 렌더링하지 않음
- transparent `Modal`과 inverse scrim으로 후면 화면을 반투명 처리
- 모달 내부에서 `TimeSlotWheel`을 임시 선택 상태로 조작
- `선택 완료`, 닫기 아이콘, scrim press와 Android back 처리
- 기본값·최종 선택값은 availability model에서 파생

#### `apps/mobile/src/features/coach/ui/consultation-screen.test.tsx`

- 기존 고정 시간 tab query 제거
- fixed reference date availability로 Calendar render
- available date day test ID press
- selected date와 slot group 표시 검증
- 날짜 선택 직후 첫 available slot이 기본값으로 표시되는지 검증
- trigger를 누르기 전 모달이 닫혀 있는지 검증
- trigger press 후 scrim·dialog·wheel이 표시되는지 검증
- 선택 완료 시 최종 slot이 갱신되고 모달이 닫히는지 검증
- 닫기 동작 시 slot이 변경되지 않는지 검증
- 날짜 변경 시 새 날짜의 기본 slot으로 갱신되는지 검증
- full slot disabled 검증
- 방식·날짜·시간이 모두 선택되기 전 CTA disabled 검증
- review summary와 완료 카드 검증
- `onRequestNotification`에 동적 날짜·시간·방식 요약이 전달되는지 검증
- `onComplete` callback 검증

#### `apps/mobile/src/features/coach/index.ts`

- `ConsultationScreen` public export 유지
- availability model과 `TimeSlotWheel` 내부 구현은 export하지 않음

#### `apps/mobile/src/app/coach-consultation.tsx`

- 기존 `backIcon`, `onBack`, `onComplete` callback을 그대로 전달
- 현재 연결된 `onRequestNotification` callback을 제거하지 않음
- notification body는 고정 시간 label이 아니라 `{날짜} · {시간} · {방식} 상담` 형식의 동적 요약을 받도록 확인

#### `apps/mobile/package.json`

- `date-fns: 4.4.0` 추가
- `react-native-calendars: 1.1314.0` 추가

#### `package-lock.json`

- root workspace install 결과만 반영
- unrelated dependency upgrade 금지

### 6.3 디자인 시스템 처리

이번 구현은 기존 디자인 시스템만으로 표현할 수 있으므로 `shared/design-system` 변경을 기본적으로 만들지 않는다.

정말 범용적인 날짜 선택 primitive가 필요하다고 판단될 때만 다음 규칙을 적용한다.

- `shared/design-system/components` 아래에 추가
- `components/index.ts`, root `index.ts` public export
- 기존 token 사용
- selected, disabled, pressed, accessibility test 추가
- design-system check와 기존 component test 통과

상담 시간 wheel과 Calendar wrapper는 현재 화면에만 필요한 조합 UI이므로 `features/coach/ui`에 둔다.

## 7. 접근성·안정성 기준

### 7.1 Calendar 접근성

- Calendar container test ID: `coach-consultation-calendar`
- 날짜 test ID: `coach-consultation-calendar.day_yyyy-mm-dd`
- 예약 가능 날짜 label에 `상담 가능`을 포함한다.
- disabled 날짜는 터치와 접근성 활성 동작에서 제외한다.
- 선택 날짜 변경은 `accessibilityLiveRegion="polite"` caption으로 알릴 수 있다.

공식 Calendar testing 문서가 test ID를 날짜별로 연결하는 규칙을 제공하므로 해당 규칙을 그대로 사용한다. [공식 Testing 문서](https://wix.github.io/react-native-calendars/docs/Testing)

### 7.2 Slot 접근성

- 각 slot은 radio role
- 선택 상태는 `selected: true`
- 마감 상태는 `disabled: true`
- label은 날짜·시간·상태를 포함
- 마감 slot에 `마감`만 표시하고 색상만으로 상태를 전달하지 않는다.

### 7.3 날짜·시간 안정성

- API와 예약 저장이 없으므로 timezone 변환을 하지 않는다.
- 내부 date key는 `yyyy-MM-dd` string
- 표시용 날짜만 `date-fns` locale을 통해 포맷
- reference date를 주입해 test와 Android screenshot을 결정적으로 유지
- `markedDates`는 immutable memoized object
- Calendar built-in day renderer를 우선 사용
- app reduced motion 설정이 켜져 있으면 slot reveal에 추가 animation을 넣지 않는다.

## 8. 테스트·검증 계획

### 8.1 자동 검증

```text
npm run architecture:check -w @finapp/mobile
npm run route:check -w @finapp/mobile
npm run design-system:check -w @finapp/mobile
npm run typecheck -w @finapp/mobile
npm run test -w @finapp/mobile
npm run contract:check
```

계약·backend 변경이 없으므로 OpenAPI fixture 수가 증가하지 않아야 한다. 기존 전체 verify도 회귀 확인을 위해 실행한다.

### 8.2 Android 화면 시나리오

1. 코치 탭에서 `코치 상담 요청` 진입
2. Calendar에 예약 가능 dot와 disabled 날짜가 함께 보이는지 확인
3. 예약 가능한 날짜 선택
4. 기본 시간이 선택된 텍스트형 trigger로 보이고 모달이 닫혀 있는지 확인
5. trigger를 누르고 반투명 scrim·시간 선택 dialog 표시 확인
6. 오전·오후·저녁 세로 시간 wheel과 마감 slot disabled 확인
7. 다른 시간을 고른 뒤 `선택 완료`를 누르면 trigger가 갱신되고 dialog가 닫히는지 확인
8. 닫기 아이콘 또는 scrim을 누르면 변경 없이 닫히는지 확인
9. 전화 또는 화상 선택
10. 예약 내용 요약 확인
11. `상담 요청하기` 선택
12. 완료 카드에서 선택 날짜·시간·방식과 데모 고지 확인
13. `코치 홈으로` 복귀
14. 다른 날짜를 선택했을 때 새 날짜의 기본 시간이 표시되는지 확인

### 8.3 web export

- `npm run start:web -w @finapp/mobile`에서 Calendar가 렌더링되는지 확인
- selected day, disabled day, slot press를 확인
- 웹 호환 문제가 생기면 Calendar 자체를 제거하지 말고 `.web.tsx` adapter로 대체한다.
- Android/iOS와 다른 날짜 레이아웃을 별도 디자인으로 만들지 않는다.

## 9. 완료 조건

- 고정 3개 시간 선택지가 화면에서 사라진다.
- Calendar에서 예약 가능 날짜와 disabled 날짜가 시각적으로 구분된다.
- 날짜 선택 후 해당 날짜의 첫 번째 available 시간이 기본값으로 표시된다.
- 화면 진입과 날짜 선택 직후에는 시간 모달이 닫혀 있고 텍스트형 trigger만 보인다.
- 시간 trigger를 누르면 반투명 scrim과 세로 wheel dialog가 표시된다.
- `선택 완료` 시 최종 시간이 갱신되고 dialog가 닫힌다.
- 날짜를 바꾸면 새 날짜의 첫 번째 available 시간이 기본 선택된다.
- slot은 오전·오후·저녁 정보를 유지하면서 세로 wheel로 읽기 쉽다.
- 가운데 선택 영역이 고정되어 현재 선택 위치를 즉시 알 수 있다.
- full slot은 비활성화되고 `마감` 텍스트를 제공한다.
- 날짜·상담 방식 선택 전 상담 요청 CTA는 disabled다. 시간은 날짜 선택 시 기본값이 생긴다.
- 완료 화면에 선택한 날짜·시간·방식이 정확히 표시된다.
- 화면 숫자와 날짜 결과를 JSX에 하드코딩하지 않는다.
- 기존 디자인 시스템 component와 token을 우선 사용한다.
- 신규 API, DB, 전역 store와 native config plugin이 없다.
- Android 화면 검증과 web export smoke가 통과한다.
- 기존 코치 홈·주문·자산·종목 화면에 회귀가 없다.

## 10. 비범위

- 실제 상담 예약 생성
- 서버 availability 조회
- 예약 충돌·동시성 처리
- 캘린더 앱에 일정 추가
- 원격 푸시·문자·이메일 알림
- 실제 예약 완료를 의미하는 외부 알림
- 담당 코치 배정
- 상담 이력과 예약 취소
- 자유로운 분 단위 시간 입력
- 월별 무제한 Calendar 탐색
- 실제 사용자 시간대 선택
- 마이데이터·약관 동의

## 11. 구현 순서

1. `date-fns`와 `react-native-calendars` exact dependency 추가
2. `consultation-availability.ts`와 순수 model test 작성
3. 한국어 Calendar locale과 `markedDates` helper 작성
4. `TimeSlotWheel`와 상태·접근성 test 작성
5. `TimeSlotPicker`의 텍스트 trigger·Modal·임시 선택 상태 연결
6. `ConsultationScreen`에 Calendar → time trigger/modal → method → summary 흐름 연결
7. 기존 consultation test를 새 test ID와 상태 전이 기준으로 수정
8. architecture, route, design-system, typecheck와 mobile test 실행
9. Android 화면과 web export 검증
10. 이전 코치 명세의 상담 section, limitations와 portfolio 문서 갱신

이 범위는 상담 화면 하나에 한정되며 기존 backend와 금융 업무 흐름을 건드리지 않는다.
