# 포트폴리오 생체인증 온보딩·재실행 개발계획

- 상태: `IMPLEMENTED_LOCAL_PHYSICAL_PENDING`
- 작성일: 2026-09-03
- 작업 ID: `FE-0019`
- 대상: `apps/mobile` React Native / Expo 앱
- API·DB 계약 변경: 없음
- 원격 자원 사용: 없음
- 선행 기준: 현재 `main`의 launch onboarding, OIDC session, App Lock, LocalAuthentication 구현

## 구현 결과 (2026-09-03)

- `expo-device@57.0.1`과 `Device.isDevice` 기반 gate factory 구현
- physical device는 `ExpoBiometricGate`, emulator/simulator/web은
  `LocalTestBiometricGate`를 사용하도록 환경변수 의존 제거
- PIN 완료 뒤 biometric setup을 수행하고 성공한 경우에만 SecureStore 완료 key 기록
- process 재실행 시 onboarding/verification/PIN을 생략하고 biometric unlock 수행
- 포트폴리오 접근 상태는 메모리, setup 완료 여부는 SecureStore로 분리
- 포트폴리오 접근 성공 시 OIDC configuration 화면을 우회하고 contract mock Home 표시
- 60초 background timeout 뒤 동일 gate로 재인증하는 단일 lock owner 구현
- Android API 36 Emulator에서 clean 첫 흐름과 force-stop/relaunch 흐름 통과
- Android Debug Development Build 484 Gradle tasks 통과
- mobile 46 files/136 tests, dependency/architecture/route/design/lint/typecheck 통과
- root verify 통과: 38 operations/41 fixtures, mobile 136, simulator 12,
  platform 96 총 244 tests와 두 backend build
- iOS와 Android/iOS 물리 기기 prompt 검증은 외부 기기 조건으로 남음

## 1. 목적

포트폴리오 시연에 맞춰 최초 실행과 재실행의 진입 흐름을 다음과 같이 구성한다.

```text
최초 실행
스플래시
  → 접근 권한 안내
  → 4페이지 온보딩
  → 휴대폰 본인인증 UI
  → 간편비밀번호 생성·확인
  → 생체인증
      ├─ 실기기: Face ID / Touch ID / Android Biometrics
      └─ 에뮬레이터·웹: 로컬 성공 adapter
  → 성공 시 홈

재실행
스플래시
  → 로컬 완료 상태 확인
  → 온보딩·본인인증·간편비밀번호 생략
  → 생체인증
      ├─ 실기기: OS 생체인증
      └─ 에뮬레이터·웹: 로컬 성공 adapter
  → 성공 시 홈
```

현재 PIN 완료 후 표시되는 OIDC 설정 차단 화면을 포트폴리오 진입 경로에서는 제거한다.
생체인증 성공은 서버 MFA나 사용자 신원 증명이 아니라 **현재 기기에서 앱 화면을
잠금 해제한 로컬 결과**로만 취급한다.

## 2. 확정 구현 원칙

### 2.1 기기 구분은 환경변수가 아니라 runtime 기기 정보로 수행

- `expo-device`의 `Device.isDevice`를 사용한다.
- `Platform.OS === 'web'`도 비실기기로 처리한다.
- `EXPO_PUBLIC_BIOMETRIC_MODE`는 생체인증 adapter 선택에 사용하지 않는다.
- 실기기 여부는 서버 로그인 우회 근거로 사용하지 않는다.
- 분기 결과는 테스트에서 주입할 수 있도록 작은 `DeviceRuntime` port 뒤에 둔다.

```ts
export interface DeviceRuntime {
  isPhysicalDevice(): boolean;
}

export const expoDeviceRuntime: DeviceRuntime = {
  isPhysicalDevice: () => Platform.OS !== 'web' && Device.isDevice,
};
```

adapter 선택 규칙:

| 실행 환경 | 선택 adapter | OS 인증창 | 성공 조건 |
|---|---|---|---|
| Android 실기기 | `ExpoBiometricGate` | 표시 | 등록된 생체정보 인증 성공 |
| iOS 실기기 | `ExpoBiometricGate` | 표시 | Face ID/Touch ID 인증 성공 |
| Android Emulator | `LocalTestBiometricGate` | 표시하지 않음 | 즉시 `authenticated` |
| iOS Simulator | `LocalTestBiometricGate` | 표시하지 않음 | 즉시 `authenticated` |
| Web | `LocalTestBiometricGate` | 표시하지 않음 | 즉시 `authenticated` |

실기기에서도 생체정보 미등록, lockout, 사용자 취소, 시스템 오류 시 OS 인증 성공을
만들어낼 수 없다. 이 경우 홈으로 보내지 않고 상태별 복구 UI를 표시한다.

### 2.2 저장 상태와 현재 잠금 해제 상태를 분리

다음 두 상태를 절대 같은 의미로 사용하지 않는다.

1. `biometricSetupCompleted`
   - 최초 흐름에서 실제 또는 에뮬레이터 adapter가 `authenticated`를 반환한 적이
     있음을 나타낸다.
   - SecureStore에 저장한다.
   - 다음 실행에서 온보딩을 건너뛰고 생체인증 단계로 진입할지를 결정한다.
2. `unlockedForCurrentProcess`
   - 현재 앱 실행에서 생체인증을 통과했음을 나타낸다.
   - 메모리에만 보관한다.
   - 앱 process가 종료되면 반드시 초기화된다.

따라서 `biometricSetupCompleted=true`만으로 홈을 렌더링하지 않는다. 재실행 시
항상 새 `authenticate()` 결과가 `authenticated`여야 `unlockedForCurrentProcess`를
활성화하고 홈으로 진입한다.

### 2.3 포트폴리오 접근 상태와 OIDC 세션을 분리

이번 범위에서는 OIDC access/refresh token을 가짜로 생성하지 않는다.

- 포트폴리오 진입은 별도 `PortfolioAccessProvider`가 소유한다.
- 홈의 예시 데이터는 `ContractMockPlatformApi`를 사용한다.
- 기존 `AuthSessionManager`, `ExpoOidcClient`, refresh token 정책은 삭제하지 않는다.
- 기존 OIDC 경로는 실제 backend 연동용 코드로 보존한다.
- 포트폴리오 접근이 잠금 해제된 경우에만 `LoginBoundary`의 OIDC 화면을 건너뛴다.
- 포트폴리오 접근 중에는 `ConfiguredPlatformApiProvider`가 mock API를 선택한다.
- 실제 backend 모드에서 물리 기기라는 이유만으로 OIDC를 우회하면 안 된다.

이 결정은 PIN → 생체인증 성공 후 현재 발생하는 “로그인을 준비하고 있습니다” 화면을
제거하면서, 로컬 생체인증을 서버 인증으로 오인하거나 가짜 bearer token을 만드는
문제를 피하기 위한 것이다.

### 2.4 PIN의 현재 역할을 명확히 유지

현재 `PinSetupScreen`은 두 번 입력한 6자리 값의 일치 여부만 메모리에서 확인하며,
PIN 자체를 저장하지 않는다. 이번 범위에서도 PIN은 포트폴리오 가입 UX로만 사용한다.

- PIN 원문을 SecureStore, AsyncStorage, 로그 또는 analytics에 저장하지 않는다.
- PIN hash/PIN 기반 재로그인은 이번 범위에 포함하지 않는다.
- PIN 확인 완료 상태는 기존 verification 완료 흐름으로 관리한다.
- 실제 PIN 인증 기능이 필요해지면 별도 보안 설계와 작업으로 분리한다.

## 3. 현재 구현과 변경이 필요한 이유

### 3.1 PIN 완료가 인증 세션을 만들지 않음

`PinSetupScreen`은 PIN이 일치하면 `onComplete()`만 호출한다. 이 callback은 launch
verification 완료 상태를 저장하고 phase를 `ready`로 바꾸지만 사용자 세션이나
포트폴리오 접근 상태는 만들지 않는다.

현재 결과:

```text
PIN 일치
  → verification 완료
  → AuthSessionProvider mount
  → refresh session 없음
  → LoginBoundary
  → OIDC 설정 unavailable
  → “로그인을 준비하고 있습니다” 고정 화면
```

### 3.2 생체인증은 active OIDC session 뒤 App Lock에서만 실행

기존 `AppLockBoundary`는 session presence가 `active`일 때만 잠금 UI를 표시한다.
PIN 직후에는 OIDC session이 없으므로 이 생체인증 경로까지 도달하지 못한다.

### 3.3 로컬 환경의 생체인증 우회는 환경변수에 의존

현재 `isLocalBiometricBypassEnabled()`는
`EXPO_PUBLIC_APP_ENV=local`과 `EXPO_PUBLIC_BIOMETRIC_MODE=skip`을 함께 요구한다.
이 방식은 사용자가 원하는 실기기/에뮬레이터 기준과 다르며, 오래된 bundle이나 다른
빌드 환경에서 동작이 달라질 수 있다.

### 3.4 물리 기기 데이터 연결도 별도 고려가 필요

현재 로컬 API 주소 `10.0.2.2`는 Android Emulator에서 host machine을 가리키는
주소이며 일반 물리 기기에서는 동일하게 동작하지 않는다. 포트폴리오 기본 흐름을
mock API로 고정해 생체인증 데모가 backend 연결 상태에 의해 막히지 않도록 한다.

## 4. 목표 상태 모델

### 4.1 영속 상태

기존 `LaunchNoticeStore`에 다음 API를 추가한다.

```ts
interface LaunchNoticeStore {
  hasCompletedBiometricSetup(): Promise<boolean>;
  markBiometricSetupCompleted(): Promise<void>;
  clearPortfolioSetup(): Promise<void>;
}
```

제안 키:

```text
wealth-flow.launch-notice-seen.v1
wealth-flow.onboarding-completed.v1
wealth-flow.verification-completed.v1
wealth-flow.biometric-setup-completed.v1
```

저장 규칙:

- `markBiometricSetupCompleted()`는 생체인증 결과가 `authenticated`일 때만 호출한다.
- `cancelled`, `retryable-failure`, `reauthentication-required`, 예외에서는 저장하지 않는다.
- SecureStore write 실패 시 완료로 간주하지 않고 홈 진입을 차단한다.
- 누락된 key는 `false`로 간주한다.
- 기존 설치 사용자는 신규 key가 없으므로 한 번 생체인증 설정 단계를 거친다.
- 생체정보 template, 인증 결과 원문, PIN, token은 이 key에 저장하지 않는다.

### 4.2 메모리 상태

제안 `PortfolioAccessState`:

```ts
type PortfolioAccessPhase =
  | 'locked'
  | 'authenticating'
  | 'unlocked'
  | 'blocked';
```

필수 action:

```ts
authenticate(): Promise<BiometricGateResult>;
lock(): void;
reset(): Promise<void>;
```

상태 규칙:

- process 시작 상태는 항상 `locked`다.
- 저장 완료 key와 최초/재실행 phase는 `AppLaunchBoundary`가 판정한다.
- `authenticate()`는 기존 요청이 있으면 같은 Promise를 반환해 single-flight를 유지한다.
- `authenticated`만 `unlocked`로 전이한다.
- 앱 process 재실행 시 이전 `unlocked` 상태를 복원하지 않는다.
- 인증창이 열린 동안 React re-render가 발생해도 두 번째 prompt를 열지 않는다.

### 4.3 launch phase

기존 launch phase에 `biometric-setup`과 `biometric-unlock`을 추가한다.

```ts
type LaunchPhase =
  | 'splash'
  | 'notice'
  | 'onboarding'
  | 'verification'
  | 'biometric-setup'
  | 'biometric-unlock'
  | 'ready';
```

결정표:

| notice | onboarding | verification/PIN | biometric setup | 다음 phase |
|---|---|---|---|---|
| 미완료 | 무관 | 무관 | 무관 | `notice` |
| 완료 | 미완료 | 무관 | 무관 | `onboarding` |
| 완료 | 완료 | 미완료 | 무관 | `verification` |
| 완료 | 완료 | 완료 | 미완료 | `biometric-setup` |
| 완료 | 완료 | 완료 | 완료 | `biometric-unlock` |

`biometric-unlock` 성공 후에만 `ready`로 전이한다.

## 5. 목표 컴포넌트 구조

```text
RootLayout
└─ SafeAreaProvider
   └─ AuthSessionProvider                     기존 OIDC 코드 보존
      └─ PortfolioAccessProvider              신규: setup + 현재 unlock 소유
         └─ AppLaunchBoundary                 launch phase orchestration
            ├─ SplashScreen
            ├─ LaunchPermissionSheet
            ├─ OnboardingScreen
            ├─ PhoneVerificationScreen
            │  └─ PinSetupScreen
            ├─ BiometricAccessScreen          신규: setup/unlock 공용
            └─ LoginBoundary                  portfolio unlock 분기 확장
               └─ ConfiguredPlatformApiProvider
                  └─ ContractMockPlatformApi  portfolio unlock 시 선택
                  └─ MobileQueryProvider
                     └─ Expo Router Stack / Home
```

구조 원칙:

- `AppLaunchBoundary`가 SecureStore 구현 세부사항을 직접 알지 않도록 store/context를
  주입한다.
- `BiometricAccessScreen`은 UI와 사용자 action만 담당하고 adapter 선택은 composition
  layer에서 수행한다.
- `PinSetupScreen`은 PIN 입력 책임만 유지한다.
- 생체인증 결과와 launch phase 전이는 store/controller에서 처리한다.
- 포트폴리오 접근과 기존 주문 직전 생체인증은 같은 `BiometricGate` port를 재사용한다.
- 주문 생체인증의 기존 prompt 문구와 idempotency 흐름은 변경하지 않는다.

## 6. 상세 구현 단계

### Phase 0 — 범위와 문서 기준선 정리

작업:

1. 이 계획을 `FE-0019` 실행 기준으로 등록한다.
2. `IMPLEMENTATION_DECISIONS.md`에 포트폴리오 접근 상태가 OIDC를 대체하는 서버
   인증이 아니라는 결정을 추가한다.
3. 과거 “별도 onboarding wizard 제외” 문서와 현재 실제 onboarding 구현의 차이를
   `MVP_SCOPE.md`와 `IMPLEMENTATION_STATUS.md`에서 정정한다.
4. API·DB·OpenAPI 변경이 없음을 확정한다.

완료 조건:

- 포트폴리오 launch UX와 production-style OIDC 경계가 문서상 구분된다.
- 실제 생체인증을 서버 MFA로 표현하는 문구가 없다.

### Phase 1 — `expo-device`와 기기 판별 port 추가

작업:

1. mobile workspace에서 `npx expo install expo-device`를 실행한다.
2. `package.json`과 root lockfile을 함께 갱신한다.
3. `DeviceRuntime` port와 Expo adapter를 추가한다.
4. `createPortfolioBiometricGate(deviceRuntime)` factory를 추가한다.
5. `isLocalBiometricBypassEnabled()` 의존을 신규 포트폴리오 흐름에서 제거한다.
6. 더 이상 사용하지 않게 되면 `.env.local`, `.env.example`, config export/test에서
   `EXPO_PUBLIC_BIOMETRIC_MODE`를 제거한다.

제안 파일:

```text
apps/mobile/src/shared/auth/device-runtime.ts
apps/mobile/src/shared/auth/create-portfolio-biometric-gate.ts
```

완료 조건:

- physical device에서는 `ExpoBiometricGate`가 선택된다.
- emulator/simulator/web에서는 `LocalTestBiometricGate`가 선택된다.
- adapter 선택에 Expo public 환경변수가 사용되지 않는다.

### Phase 2 — 포트폴리오 접근 상태와 SecureStore 확장

작업:

1. `LaunchNoticeStore`에 biometric setup read/write/reset API를 추가한다.
2. 신규 key를 `WHEN_UNLOCKED_THIS_DEVICE_ONLY` 수준으로 저장하도록 검토한다.
3. `PortfolioAccessStore`와 context/provider를 추가한다.
4. 영속 setup 상태와 메모리 unlock 상태를 분리한다.
5. SecureStore 오류를 fail-closed 상태로 매핑한다.
6. Query cache와 함께 초기화할 수 있는 명시적 `resetPortfolioDemo()`를 추가한다.

제안 파일:

```text
apps/mobile/src/shared/auth/portfolio-access-context.tsx
apps/mobile/src/features/launch/model/launch-notice-store.ts
```

완료 조건:

- 인증 성공 전에는 biometric setup key가 생성되지 않는다.
- process 재생성 후 unlock 상태는 `locked`로 돌아간다.
- setup 완료 key는 앱 재실행 후 유지된다.

### Phase 3 — 최초 PIN 완료 뒤 생체인증 연결

작업:

1. PIN 일치 callback의 의미를 `verification 완료`에서 `biometric setup으로 이동`으로
   변경한다.
2. PIN effect에서 비동기 인증을 직접 중복 호출하지 않도록 callback과 phase를 분리한다.
3. `BiometricAccessScreen`을 `mode="setup"`으로 렌더링한다.
4. 화면 mount 후 앱이 active일 때 인증을 한 번 자동 시작한다.
5. `authenticated`이면 biometric setup 완료 key를 저장하고 현재 process를 unlock한다.
6. 저장까지 성공한 경우에만 `ready`와 홈으로 이동한다.
7. 취소/실패 시 PIN 화면으로 되돌리지 않고 생체인증 화면에서 재시도할 수 있게 한다.

중복 prompt 방지:

- `authenticate()`는 이미 요청 중이면 같은 in-flight Promise를 반환한다.
- effect cleanup 후 늦게 도착한 결과는 무시한다.
- React Strict Mode 또는 빠른 re-render에서도 native prompt는 한 번만 열린다.

완료 조건:

- PIN 두 번 일치 후 다른 로그인 화면 없이 생체인증 단계가 시작된다.
- `authenticated` 전에는 홈이 렌더링되지 않는다.
- 실패 후 재시도할 수 있다.

### Phase 4 — 재실행 시 온보딩 생략과 자동 잠금 해제

작업:

1. splash 종료 시 biometric setup 완료 상태를 기존 launch 상태와 함께 읽는다.
2. 모든 최초 setup 단계가 완료되어 있으면 `biometric-unlock`으로 이동한다.
3. `BiometricAccessScreen mode="unlock"`이 실기기에서 OS prompt를 한 번 자동 호출한다.
4. 성공 시 메모리 unlock 상태만 활성화하고 홈으로 이동한다.
5. 이 단계에서는 biometric setup key를 다시 쓰지 않는다.
6. process force-stop/relaunch에서도 동일 흐름을 확인한다.
7. 기존 background 60초 App Lock 정책과 충돌하지 않도록 하나의 lock owner만 둔다.

완료 조건:

- 재실행 시 notice/onboarding/verification/PIN 컴포넌트가 mount되지 않는다.
- splash 다음 실기기 OS 인증창이 열린다.
- 인증 성공 시 홈으로 이동한다.
- 인증 취소 시 홈을 노출하지 않는다.

### Phase 5 — OIDC 차단 화면 제거와 포트폴리오 홈 연결

작업:

1. `PortfolioAccessState === 'unlocked'`이면 `LoginBoundary`가 OIDC 구성 여부와 무관하게
   children을 렌더링하도록 명시적 경계를 추가한다.
2. portfolio unlock 상태에서는 `ContractMockPlatformApi`를 주입한다.
3. portfolio unlock 전에는 Home과 Query provider를 mount하지 않는다.
4. 포트폴리오 경로에서 `LocalTestOidcClient`로 가짜 token을 생성하지 않는다.
5. 기존 OIDC session이 필요한 실제 HTTP 경로는 그대로 유지하고 회귀 테스트한다.
6. “로그인을 준비하고 있습니다” 화면은 portfolio launch 경로에서 도달 불가능함을
   component test로 고정한다.

완료 조건:

- PIN → 생체인증 성공 → 홈 흐름에서 OIDC configuration screen이 나타나지 않는다.
- 물리 기기가 local backend 주소에 접근하지 못해도 mock 홈이 정상 표시된다.
- 기존 OIDC unit/component test가 유지된다.

### Phase 6 — 실패·복구·초기화 UX

상태별 동작:

| 결과 | 사용자 화면 | 홈 이동 | local 완료 저장 | 다음 action |
|---|---|---:|---:|---|
| `authenticated` | 성공 후 즉시 전환 | 예 | 최초 setup에서만 예 | 없음 |
| `cancelled` | “생체인증이 취소되었습니다” | 아니오 | 아니오 | 다시 시도 |
| `authentication_failed` | “생체정보를 확인하지 못했습니다” | 아니오 | 아니오 | 다시 시도 |
| `timeout` | “인증 시간이 초과되었습니다” | 아니오 | 아니오 | 다시 시도 |
| `not_enrolled` | 기기 설정 안내 | 아니오 | 아니오 | 생체정보 등록 후 재시도 |
| `not_available` | 지원하지 않는 기기 안내 | 아니오 | 아니오 | 포트폴리오 초기화 또는 종료 |
| `locked_out` | 잠금 상태 안내 | 아니오 | 아니오 | OS 제한 해제 후 재시도 |
| `system_error` | 일반 시스템 오류 | 아니오 | 아니오 | 다시 시도 |
| SecureStore 오류 | 로컬 상태 저장 실패 | 아니오 | 아니오 | 다시 확인/초기화 |

UX 규칙:

- 실패 직후 자동으로 prompt를 무한 반복하지 않는다.
- 사용자가 누르는 “다시 시도” 버튼을 제공한다.
- 버튼은 최소 48px target과 accessibility label을 갖는다.
- 인증 중에는 버튼을 비활성화하고 중복 입력을 막는다.
- 생체인증이 앱 내부에서만 사용된다는 안내를 유지한다.
- 실제 생체정보를 앱이나 서버가 읽는다는 문구를 사용하지 않는다.

초기화 의미:

- `앱 잠그기`: setup 완료는 유지하고 메모리 unlock만 제거한다.
- `로그아웃`: 기존 OIDC session이 있으면 token/cache를 제거하고 portfolio access도 잠근다.
- `포트폴리오 처음부터 보기`: notice/onboarding/verification/biometric setup key와 Query
  cache를 제거한다.
- 초기화 action은 개발자/설정 화면의 명시적 사용자 action으로만 실행한다.

### Phase 7 — native 설정과 브랜드 문구 정합성

작업:

1. Android manifest의 `USE_BIOMETRIC`, `USE_FINGERPRINT`를 보존한다.
2. iOS `NSFaceIDUsageDescription`을 “Wealth Flow 앱 잠금을 해제하기 위해 Face ID를
   사용합니다.”로 통일한다.
3. Expo config plugin과 생성된 native project의 문구가 다른 경우 prebuild 결과를
   동기화한다.
4. `expo-device` autolinking 반영을 위해 development build를 다시 생성한다.
5. Expo Go가 아니라 LocalAuthentication module을 포함한 Development Build 또는
   standalone build에서 검증한다.

완료 조건:

- Android/iOS native permission metadata가 앱 브랜드와 일치한다.
- physical build에서 `expo-device`와 `expo-local-authentication` module을 찾지 못하는
  runtime error가 없다.

### Phase 8 — 테스트, 문서와 인수

자동 테스트와 native 수동 검증을 모두 완료한 뒤 상태를 `DONE`으로 바꾼다.

갱신 문서:

```text
docs/MVP_SCOPE.md
docs/IMPLEMENTATION_DECISIONS.md
docs/IMPLEMENTATION_STATUS.md
docs/DEVELOPMENT_LOG.md
docs/workstreams/frontend/DEVELOPMENT_LOG.md
docs/workstreams/frontend/ISSUE_REGISTER.md
docs/SECURITY_MODEL.md
docs/TEST_STRATEGY.md
docs/LIMITATIONS.md
docs/REQUIREMENTS_TRACEABILITY.md
docs/DEMO_SCRIPT.md
docs/ENV_FILES_GUIDE.md
docs/ENVIRONMENT_MATRIX.md
```

## 7. 파일별 변경 예상

| 파일/영역 | 계획된 변경 |
|---|---|
| `apps/mobile/package.json` | `expo-device` 추가 |
| `package-lock.json` | Expo 호환 dependency lock 반영 |
| `shared/auth/device-runtime.ts` | physical device 판별 port/adapter 추가 |
| `shared/auth/create-portfolio-biometric-gate.ts` | 실기기/에뮬레이터 gate factory 추가 |
| `features/launch/model/launch-notice-store.ts` | biometric setup 완료 key와 reset API 추가 |
| `shared/auth/portfolio-access-context.tsx` | 메모리 unlock 상태와 single-flight 추가 |
| `features/launch/ui/app-launch-boundary.tsx` | biometric setup/unlock phase 추가 |
| `features/onboarding/ui/pin-setup-screen.tsx` | PIN 완료 callback 중복 방지 및 biometric phase 연결 |
| `features/onboarding/ui/phone-verification-screen.tsx` | PIN 완료를 최종 ready가 아닌 biometric setup으로 전달 |
| `features/app-lock/ui/biometric-access-screen.tsx` | 자동 prompt, retry, 오류 UI 추가 |
| `features/login/ui/login-boundary.tsx` | portfolio unlocked 시 OIDC 차단 화면 우회 |
| `features/login/model/configured-platform-api-provider.tsx` | portfolio 경로에서 contract mock 주입 |
| `features/app-lock/ui/app-lock-boundary.tsx` | 환경변수 bypass 제거 또는 portfolio lock owner와 역할 통합 |
| `shared/config/app-environment.ts` | 사용되지 않는 biometric env 판별 제거 |
| `apps/mobile/.env.local`, `.env.example` | `EXPO_PUBLIC_BIOMETRIC_MODE` 제거 |
| `apps/mobile/app.json`, native config | Face ID/Android permission과 브랜드 문구 확인 |
| Settings UI | 앱 잠그기/로그아웃/포트폴리오 초기화 의미 분리 |

구현 중 실제 소유권이 겹치는 경우 `PortfolioAccessProvider`가 launch와 app lock의
단일 상태 소유자가 되도록 하고, 동일한 `locked/unlocked` 상태를 Zustand와 React
local state에 중복 보관하지 않는다.

## 8. 자동 테스트 계획

### 8.1 Device adapter 단위 테스트

- `Platform.OS !== web && Device.isDevice=true` → native gate
- Android/iOS simulator의 `Device.isDevice=false` → local test gate
- web → local test gate
- 환경변수 값이 gate 선택에 영향을 주지 않음

### 8.2 SecureStore 단위 테스트

- biometric setup key 미존재 → false
- 성공 write 후 read → true
- 인증 실패 결과에서는 write 호출 없음
- write 실패 시 unlock/home 진입 없음
- reset 시 네 launch key 제거

### 8.3 Portfolio access store 테스트

- 신규 provider의 시작 상태 `locked`
- `locked → authenticating → unlocked`
- cancel/failure → locked
- not enrolled/lockout → blocked
- 인증 중 `authenticate()` 재호출은 native gate를 추가 호출하지 않음
- 신규 store 생성 시 이전 process의 unlocked 상태 미복원

### 8.4 최초 실행 component 테스트

- notice → onboarding → verification → PIN 순서
- PIN 불일치 시 biometric 호출 없음
- PIN 일치 시 biometric 호출 정확히 1회
- biometric success + SecureStore write success 후 Home 표시
- biometric cancel/failure 시 Home 미표시
- portfolio 경로에서 OIDC configuration screen 미표시

### 8.5 재실행 component 테스트

- 모든 setup flag true → onboarding/verification/PIN 미표시
- splash 후 biometric unlock 표시
- native adapter success → Home
- cancel → 잠금 화면 유지
- retry success → Home
- re-render/Strict Mode에서 prompt 중복 호출 없음

### 8.6 회귀 테스트

- 기존 OIDC login/refresh/logout tests
- 기존 App Lock lifecycle 60초 timeout tests
- 기존 주문 전 biometric success/cancel/expiry tests
- Query cache logout/reset tests
- launch onboarding tests의 phase 확장
- architecture, route, design-system 검사

필수 자동 명령:

```bash
npm run dependency:check -w @finapp/mobile
npm run lint -w @finapp/mobile
npm run typecheck -w @finapp/mobile
npm run test -w @finapp/mobile -- --run
npm run route:check -w @finapp/mobile
npm run design-system:check -w @finapp/mobile
npm run architecture:check -w @finapp/mobile
npm run verify
```

## 9. native 수동 검증 계획

### 9.1 Android Emulator

- biometric 미등록 상태에서도 local test gate로 최초 흐름 완료
- Home 진입 확인
- 앱 force-stop/relaunch 후 onboarding 생략 확인
- OS prompt 없이 자동 unlock 후 Home 확인
- 포트폴리오 초기화 후 최초 흐름 복귀 확인

### 9.2 Android 물리 기기

- 지문 또는 강한 생체정보 등록 상태 확인
- PIN 완료 직후 Android system biometric prompt 확인
- 성공 후 Home 확인
- 앱 force-stop/relaunch 후 splash → biometric → Home 확인
- 취소 시 Home 미노출과 재시도 확인
- 잘못된 생체정보 실패 후 재시도 확인
- 생체정보 삭제 후 `not_enrolled` 안내 확인
- lockout 시 fail-closed 확인
- background 60초 이상 후 재인증 확인

### 9.3 iOS 물리 기기

- Face ID 또는 Touch ID 등록 상태 확인
- 최초 prompt의 앱 이름과 권한 문구 확인
- 성공/취소/실패 분기 확인
- force quit/relaunch 후 onboarding 생략과 재인증 확인
- biometric enrollment 변경 후 fail-closed 확인
- background timeout 재인증 확인

native 검증 기록에는 기기 모델, OS 버전, 앱 commit, build 종류와 각 시나리오 결과를
남긴다. 생체정보 자체나 화면에 표시되는 민감정보는 캡처하지 않는다.

## 10. 완료 기준

다음 항목을 모두 만족해야 `FE-0019 DONE`으로 판정한다.

- [x] `expo-device`가 Expo SDK 57 호환 버전으로 설치되고 lockfile에 반영됨
- [x] gate 선택이 환경변수가 아닌 `Device.isDevice` 기준임
- [x] emulator/simulator/web에서는 native biometric API를 호출하지 않음
- [ ] physical device에서는 등록된 OS 생체인증 prompt를 호출함
- [x] PIN 성공 직후 biometric setup 단계로 이동함
- [x] biometric success 전에는 Home이 렌더링되지 않음
- [x] biometric success 후에만 setup 완료 key가 SecureStore에 저장됨
- [x] 재실행 시 onboarding/verification/PIN이 생략됨
- [x] 재실행 시 저장된 boolean만으로 Home에 진입하지 않고 인증을 다시 수행함
- [x] 인증 취소/실패/미등록/lockout에서 Home을 노출하지 않음
- [x] portfolio 경로에서 OIDC configuration screen이 나타나지 않음
- [x] portfolio Home이 backend 연결 없이 contract mock 데이터로 표시됨
- [x] fake OIDC access/refresh token을 생성하거나 저장하지 않음
- [x] 앱 잠그기, 로그아웃, 포트폴리오 초기화 semantics가 구분됨
- [x] 기존 OIDC/App Lock/주문 생체인증 테스트가 회귀 없이 통과함
- [x] mobile lint/typecheck/test와 root verify가 통과함
- [ ] Android 물리 기기 또는 iOS 물리 기기 중 최소 1대에서 실제 prompt 성공 검증
- [x] 미검증 플랫폼은 `LIMITATIONS.md`와 issue register에 명시됨

## 11. 보안·포트폴리오 표현 기준

허용 표현:

- “기기에 등록된 생체정보로 앱 잠금을 해제합니다.”
- “생체정보는 기기에서 확인되며 앱이나 서버에 저장되지 않습니다.”
- “포트폴리오 시연을 위한 예시 데이터입니다.”

금지 표현:

- “서버가 Face ID 결과를 검증했습니다.”
- “생체인증으로 법적 본인확인이 완료되었습니다.”
- “실제 금융기관 수준의 인증이 완료되었습니다.”
- “생체정보를 앱에 저장합니다.”

SecureStore의 setup 완료 boolean은 UX 진행 상태일 뿐 인증 증거가 아니다. 앱을
변조할 수 있는 공격자나 탈옥/root 기기를 막는 서버 보안 통제로 설명하지 않는다.

## 12. 위험과 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| 실기기 생체정보 미등록 | native prompt 없이 차단 | 사전 등록 체크와 명확한 설정 안내 |
| prompt가 re-render마다 중복 호출 | UX 오류·system cancel | store phase와 단일-flight guard |
| setup boolean만 보고 Home 진입 | 인증 우회 | unlock은 메모리 전용, 매 process 재인증 |
| fake OIDC token 사용 | 보안 경계 혼동·API 실패 | 별도 portfolio access + contract mock |
| `10.0.2.2`를 물리 기기에서 사용 | Home API 오류 | portfolio 기본 데이터는 mock 사용 |
| App Lock과 launch biometric가 이중 prompt | 사용성 저하 | 단일 lock owner와 공통 controller 사용 |
| biometric prompt 중 AppState 변경 | 즉시 재잠금 가능 | 인증 중 lifecycle event 무시, 완료 후 기준시각 갱신 |
| SecureStore write 실패 | 다음 실행 흐름 불일치 | 홈 진입 차단, retry/reset 제공 |
| iOS native project 문구 drift | 잘못된 브랜드 권한 문구 | app config/prebuild/Info.plist 동기 검증 |
| 실제 기기 검증 부재 | 완료를 과장할 위험 | physical smoke 전 `PARTIAL` 유지 |

## 13. 구현 순서와 commit 제안

작업은 단일 `main`에서 다음 순서로 진행한다.

1. `feat(mobile): add device-aware biometric gate [FE-0019]`
   - `expo-device`, runtime port, adapter factory, unit test
2. `feat(mobile): persist portfolio biometric setup [FE-0019]`
   - SecureStore key, portfolio access store/context, tests
3. `feat(mobile): connect pin biometric launch flow [FE-0019]`
   - 최초 setup과 재실행 unlock phase, failure UI, component tests
4. `feat(mobile): open mock portfolio home after unlock [FE-0019]`
   - LoginBoundary/API provider integration, reset semantics
5. `test(mobile): verify native biometric resume flow [FE-0019]`
   - Android/iOS evidence와 regression
6. `docs(mobile): record portfolio biometric flow [FE-0019]`
   - status/security/test/demo/limitations 문서 갱신

각 commit 전 관련 mobile test를 실행하고, 마지막 commit 전에 root `npm run verify`를
실행한다. 구현 중 사용자 소유의 기존 미커밋 변경은 덮어쓰지 않는다.

## 14. 이번 계획에서 제외하는 범위

- 실제 휴대폰 본인확인 API 연동
- PIN 원문/hash 저장과 PIN 기반 로그인
- 생체정보 template 접근 또는 서버 전송
- 생체인증을 OAuth2/OIDC MFA로 승격
- Keycloak/API/DB 계약 변경
- 실제 금융계좌 또는 개인정보 사용
- App Store/Play Store 배포와 signing
- 원격 DB, AWS KMS, 원격 migration/deploy

## 15. 최종 인수 시나리오

### Scenario A — 최초 실행, Android Emulator

1. 앱 데이터를 초기화하고 실행한다.
2. 접근 안내, 4페이지 온보딩, 본인인증 UI와 PIN 생성·확인을 완료한다.
3. native prompt 없이 local biometric adapter가 성공한다.
4. OIDC 설정 화면 없이 mock Home이 표시된다.
5. biometric setup 완료 key가 저장된다.

### Scenario B — 재실행, Android Emulator

1. 앱을 force-stop하고 다시 실행한다.
2. splash 뒤 온보딩/PIN이 표시되지 않는다.
3. local biometric adapter가 현재 process를 unlock한다.
4. mock Home이 표시된다.

### Scenario C — 최초 실행, 물리 기기

1. 기기에 Face ID/Touch ID/Android Biometrics가 등록되어 있다.
2. PIN 완료 직후 OS biometric prompt가 표시된다.
3. 취소하면 Home이 표시되지 않는다.
4. 다시 시도하고 성공하면 setup 완료가 저장되고 Home으로 이동한다.

### Scenario D — 재실행, 물리 기기

1. 앱을 완전히 종료하고 다시 실행한다.
2. splash 뒤 온보딩 없이 OS biometric prompt가 표시된다.
3. 성공하면 Home으로 이동한다.
4. 실패/취소하면 잠금 화면에 머문다.

### Scenario E — 생체정보 미등록 또는 변경

1. setup 완료 상태에서 기기의 생체정보를 삭제하거나 사용할 수 없게 한다.
2. 앱을 재실행한다.
3. Home이 표시되지 않는다.
4. 생체정보 등록 안내, 다시 시도와 포트폴리오 초기화 action이 제공된다.

이 다섯 시나리오와 자동 품질 gate가 모두 통과한 시점을 구현 완료로 정의한다.
