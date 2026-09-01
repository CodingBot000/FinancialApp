# Frontend Workstream 개발 로그

- 기록 방식: append-only
- 다음 ID: Milestone 6A frontend 보강 발견 시 배정
- 운영 상태: `codex/frontend`는 DEV-0006 통합 이력으로 보존, 신규 FE commit은 단일 `main`에서 수행
- 활성 worktree: `/Users/switch/Development/Web/FinancialApp`
- 통합 검토 기준: `main` at `2574ad0`, `platform-v1` at DEV-0006

기존 FE-0001~FE-0009 항목의 base/contract revision은 분리 당시 사실로 보존한다. FE-0010 이후에는 `INTEGRATED_DEVELOPMENT_PLAN.md`에 따라 `main`의 `apps/mobile/**` 변경을 commit 단위로 기록하고 중앙 상태·issue도 같은 단계에서 갱신한다.

## 새 기록 Template

```markdown
## FE-#### — 제목

- 날짜: YYYY-MM-DD
- Milestone: N
- 상태: COMPLETED | BLOCKED | PARTIAL
- base commit:
- contract revision:
- commit: `<type>(fe): <summary> [FE-####]`

### 완료
- ...

### 변경 파일
- ...

### 검증
- 명령:
- 결과:

### 이슈·누락·Handoff
- FE-ISSUE/FE-GAP/Handoff:

### 다음 작업
- FE-####:
```

## FE-0001 — Mobile health vertical slice와 architecture gate

- 날짜: 2026-09-01
- Milestone: 1
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add contract-driven mobile health slice [FE-0001]`

### 완료

- 별도 worktree `/Users/switch/Development/Web/FinancialApp-frontend`와 `codex/frontend` branch가 공통 base commit을 가리키는지 확인
- `app → features → shared`와 feature public entry, route의 API transport deep import, import cycle을 검사하는 mobile architecture gate 추가
- canonical `/api/v1/health` 계약만 사용하는 `PlatformApi` port, 실제 HTTP adapter, request ID, runtime response 검증과 오류 정규화 구현
- 같은 port를 구현하는 deterministic contract mock에 success, timeout, documented 429 시나리오와 abort 처리를 추가
- route에는 조합만 남기고 loading, ready, error/retry와 synthetic-data disclaimer를 표시하는 접근 가능한 health 화면 구현
- generated·gitignored `expo-env.d.ts`가 없을 때 lint가 실패하던 baseline script를 수정
- Expo SDK 57 upstream patch와 transitive advisory를 재확인하고 `FE-ISSUE-0001` 갱신

### 변경 파일

- `apps/mobile/package.json`
- `apps/mobile/scripts/check-architecture.mjs`
- `apps/mobile/src/app/**`
- `apps/mobile/src/features/health/**`
- `apps/mobile/src/shared/api/**`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: Node `v24.19.0`, npm `11.17.0`으로 `npm ci`
- 결과: install 성공, npm audit moderate 13/high 0/critical 0 재현
- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 14 source files, boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 3 files, 9 tests 통과
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo dependency 호환성 통과
- 명령: `npm audit --json`
- 결과: 기존 moderate 13/high 0/critical 0 유지; FE-ISSUE-0001의 비호환 major downgrade 외 자동 fix 없음
- 명령: `npm run contract:check`
- 결과: OpenAPI 2개 lint와 health fixture schema validation 통과
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0001-web` (`apps/mobile`에서 실행)
- 결과: Expo Router entry 784 modules bundle 성공
- 명령: `npm view expo@57 version --json`, `npm view expo-router@57 version --json`, `npm audit --json`
- 결과: stable Expo 57 최신 patch는 `57.0.18`, Expo Router 57 최신 patch는 `57.0.17`; 기존 moderate 13건은 그대로이며 안전한 non-breaking 자동 fix 없음

### 이슈·누락·Handoff

- FE-ISSUE-0001: OPEN 유지. Expo SDK 57 official compatible tree의 transitive moderate advisory 13건은 release gate 전 재확인 필요
- CONTRACT_CHANGE_REQUEST: 현재 canonical `platform-v1`에는 health만 존재한다. backend/integration owner가 `/me`, 표준 problem response와 Milestone 2 소비 계약을 additive schema로 통합한 뒤 frontend mock/API client를 확장해야 한다. 이 요청은 다음 독립 mobile foundation 작업을 막지 않는다.
- root `package-lock.json`은 변경하지 않았다. 추후 mobile dependency manifest가 추가되면 integration owner가 통합 상태에서 lockfile을 재생성해야 한다.

### 다음 작업

- FE-0002: TanStack Query 기반 server-state provider, AppState/online adapter와 health query component test foundation

## FE-0002 — Mobile server-state와 native lifecycle 기반

- 날짜: 2026-09-01
- Milestone: 1
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add mobile query lifecycle foundation [FE-0002]`

### 완료

- TanStack Query v5 provider와 QueryClient factory를 추가하고 server state의 단일 소유권을 Query cache로 고정
- GET query는 명시적으로 retryable인 `PlatformApiError`만 최대 2회 retry하고 mutation은 기본 retry를 금지
- React Native AppState를 `focusManager`, Expo Network를 `onlineManager`에 연결하고 listener cleanup/초기 상태 race를 분리된 adapter로 구현
- health 호출을 feature-owned query key/options와 `useQuery`로 전환하고 mock response가 Query cache에 저장되는 integration test 추가
- Expo SDK 57 공식 호환 `expo-network ~57.0.1`과 `@tanstack/react-query 5.102.8`을 mobile manifest에 추가

### 변경 파일

- `apps/mobile/package.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/features/health/api/**`
- `apps/mobile/src/features/health/hooks/use-platform-health.ts`
- `apps/mobile/src/shared/query/**`
- `apps/mobile/vitest.config.ts`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm install --package-lock=false --ignore-scripts`
- 결과: branch-local dependency 설치 성공, root lockfile 미변경, audit moderate 13/high 0/critical 0 유지
- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 22 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 6 files, 14 tests 통과
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo dependency 호환성 통과
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0002-web`
- 결과: Expo Router entry 839 modules bundle 성공

### 이슈·누락·Handoff

- FE-GAP-0001: React 19에서 deprecated된 `react-test-renderer`는 채택하지 않았다. RNTL 14/Vitest 호환 harness로 loading/ready/error component test를 추가해야 한다.
- INTEGRATION_HANDOFF: `apps/mobile/package.json`의 신규 dependency를 main에 통합할 때 integration owner가 root `package-lock.json`을 package manager로 재생성하고 clean install을 검증해야 한다.
- CONTRACT_CHANGE_REQUEST: FE-0001과 동일하게 health 이후 API consumer 계약을 기다리며, Query foundation 자체는 계약 변경 없이 독립 완료했다.

### 다음 작업

- FE-0003: React 19/RN 0.86 호환 component test harness와 health loading/ready/error rendering test

## FE-0003 — React 19 mobile component test harness

- 날짜: 2026-09-01
- Milestone: 1
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `test(fe): add React 19 mobile component harness [FE-0003]`

### 완료

- React Native Testing Library `14.0.1`과 React 19.2 호환 modern `test-renderer 1.2.0` 기준 component test harness 추가
- Vitest dependency optimizer로 RNTL CommonJS tree를 변환하고 test-only React Native host shim으로 application source를 변경하지 않는 구성 확정
- deprecated `react-test-renderer`와 경고 억제를 사용하지 않고 async RNTL API로 health loading → ready와 retryable error/accessibility button을 검증
- `FE-GAP-0001`을 RESOLVED로 갱신

### 변경 파일

- `apps/mobile/package.json`
- `apps/mobile/scripts/react-native-test-shim.mjs`
- `apps/mobile/src/features/health/ui/health-screen.test.tsx`
- `apps/mobile/vitest.config.ts`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm install --package-lock=false --ignore-scripts`
- 결과: RNTL/test renderer branch-local 설치 성공, audit moderate 13/high 0/critical 0 유지
- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 23 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 7 files, 16 tests 통과; RNTL loading/ready/error component tests 포함
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo dependency 호환성 통과
- 명령: `npm ls @testing-library/react-native test-renderer --depth=0`
- 결과: RNTL `14.0.1`, test-renderer `1.2.0` 확인
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0003-web`
- 결과: Expo Router entry 839 modules bundle 성공

### 이슈·누락·Handoff

- FE-GAP-0001: RESOLVED. React 19.2/RN 0.86 조합에서 deprecated warning 없이 component suite 통과
- INTEGRATION_HANDOFF: FE-0002와 같이 mobile manifest의 RNTL/test-renderer dependency를 포함해 root lockfile 재생성과 clean install이 필요
- 새 frontend issue/gap 없음

### 다음 작업

- FE-0004: Victory Native/Reanimated/Skia compatibility spike와 deterministic chart smoke UI

## FE-0004 — Native chart compatibility spike와 Development Build smoke

- 날짜: 2026-09-02
- Milestone: 1
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add native chart compatibility spike [FE-0004]`

### 완료

- Expo SDK 57/RN 0.86 조합에 `victory-native 42.0.0`, `@shopify/react-native-skia 2.6.2`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`, `expo-dev-client ~57.0.16`을 고정
- 6개 합성 자산 포인트로 결정적 smoke series와 Victory `CartesianChart`/animated `Line`을 구현하고 reduced-motion 시 animation을 제거
- native chart를 지원하지 않는 web에는 동일 데이터의 접근 가능한 deterministic bar fallback을 platform file로 분리
- health 화면에 chart compatibility card를 추가하고 data/unit/component test를 17개로 확장
- Android Development Build 런타임에서 발견한 `expo-splash-screen` native module 누락을 SDK 호환 `~57.0.8`로 보완
- Android API 31 Development Build에서 health mock 상태, synthetic disclaimer와 Victory/Skia/Reanimated line chart의 실제 렌더링을 확인해 Milestone 1의 최소 1개 플랫폼 chart smoke 완료 조건을 충족

### 변경 파일

- `apps/mobile/package.json`
- `apps/mobile/src/features/health/model/chart-smoke-data.ts`
- `apps/mobile/src/features/health/model/chart-smoke-data.test.ts`
- `apps/mobile/src/features/health/ui/chart-smoke.tsx`
- `apps/mobile/src/features/health/ui/chart-smoke.web.tsx`
- `apps/mobile/src/features/health/ui/health-screen.tsx`
- `apps/mobile/src/features/health/ui/health-screen.test.tsx`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 27 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 8 files, 17 tests 통과; deterministic data와 health component test 포함
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo dependency 호환성 통과
- 명령: `npx expo export --platform ios --output-dir /tmp/financialapp-fe0004-ios`
- 결과: 2,312 modules, Hermes production bundle 4.9MB 성공
- 명령: `npx expo export --platform android --output-dir /tmp/financialapp-fe0004-android`
- 결과: 2,406 modules, Hermes production bundle 5.1MB 성공
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0004-web.lJxvUv`
- 결과: platform-specific web fallback 841 modules bundle 성공
- 명령: 임시 mobile 복제본에서 `npx expo prebuild --platform android --no-install` 후 `./android/gradlew -p android -PreactNativeArchitectures=x86_64 assembleDebug`
- 결과: `expo-splash-screen`을 포함한 API 31 x86_64 Development Build APK 생성 성공, Gradle 670 tasks 통과
- 명령: API 31 emulator에 Debug APK 설치, `adb reverse tcp:8081 tcp:8081`, Metro dev-client 실행과 화면 캡처
- 결과: `MainActivity`에서 health ready 상태와 Victory/Skia line chart 실제 렌더링 확인; app process의 fatal/Skia/ReactNativeJS error 없음

### 이슈·누락·Handoff

- FE-GAP-0002: Android smoke는 완료했지만 현재 호스트 Xcode 16.2에는 Expo SDK 57이 요구하는 최신 iOS toolchain이 없어 iOS Development Build runtime smoke는 연기했다. Milestone 1 최소 조건에는 영향이 없고 preview/release 전 iOS 검증이 필요하다.
- FE-ISSUE-0001: OPEN 유지. native dependency 추가 후에도 audit moderate 13/high 0/critical 0이며 안전한 호환 fix가 없다.
- INTEGRATION_HANDOFF: `apps/mobile/package.json`에 추가한 Skia/Victory/dev-client/splash dependency를 통합할 때 integration owner가 root `package-lock.json`을 재생성하고 Skia postinstall 승인·prebuilt 복사, clean Android/iOS install을 확인해야 한다.
- CONTRACT_CHANGE_REQUEST: chart는 deterministic local synthetic data와 기존 health mock만 사용하며 canonical OpenAPI를 확장하지 않았다. `/me`와 Milestone 2 계약 요청은 FE-0001 handoff와 동일하게 유지한다.

### 다음 작업

- FE-0005: OIDC와 App Lock의 contract-independent mobile port/session foundation; `/api/v1/me` 소비는 canonical additive contract 통합 후 연결

## FE-0005 — Secure mobile session과 refresh single-flight foundation

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add secure session foundation [FE-0005]`

### 완료

- access token을 process memory에만 두는 `MemoryAccessTokenStore`와 refresh token만 저장하는 `RefreshTokenStore` port 구현
- Expo SDK 57 공식 호환 `expo-secure-store ~57.0.2` adapter를 추가하고 iOS에서는 `WHEN_UNLOCKED_THIS_DEVICE_ONLY` 접근성으로 device-bound 저장 구성
- credential establish, boot 시 refresh session 확인, corrupt empty credential 제거와 local logout clear를 담당하는 `AuthSessionManager` 구현
- app root에 injectable `AuthSessionProvider`를 조합해 향후 Login/Boot/App Lock feature가 동일 session owner를 사용하도록 구성
- 동시 401이 하나의 refresh 요청만 공유하는 `RefreshCoordinator`와 refresh token rotation, 성공 후 memory access token 교체를 구현
- refresh 없음/실패/storage 실패 시 두 local store를 제거하고 token value를 오류 message에 포함하지 않는 재인증 경계 구현
- canonical 계약에 없는 OIDC token endpoint나 `/api/v1/me`를 발명하지 않고 provider-specific refresh는 `TokenRefreshPort` 뒤로 보류

### 변경 파일

- `apps/mobile/package.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/shared/auth/**`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 38 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 11 files, 27 tests 통과; access/refresh 분리, corrupt credential clear, logout, concurrent single-flight, rotation, refresh failure와 SecureStore error redaction 포함
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo SDK dependency 호환성 통과
- 명령: `npx expo export --platform android --output-dir /tmp/financialapp-fe0005-android.XZssLU`
- 결과: SecureStore provider를 포함한 2,415 modules, Hermes bundle 5.1MB 성공
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0005-web.LiaZA2`
- 결과: 850 modules bundle 성공

### 이슈·누락·Handoff

- FE-GAP-0003: 실제 IdP와 canonical `/me` 계약이 아직 없으므로 `TokenRefreshPort`의 AuthSession adapter와 native SecureStore process-restart 검증은 Milestone 2 integration으로 연기했다.
- CONTRACT_CHANGE_REQUEST: backend/integration owner는 환경별 OIDC issuer/client ID/redirect URI와 additive `/api/v1/me`, 인증 problem response 계약을 확정해야 한다. frontend는 확정 전 임의 token/me endpoint를 호출하지 않는다.
- INTEGRATION_HANDOFF: integration owner가 `expo-secure-store`를 root lockfile에 반영하고 clean Development Build autolinking을 확인해야 한다.
- token은 source log/AsyncStorage/Zustand에 추가하지 않았고 test credential도 secure adapter 오류 message에 노출되지 않음을 검증했다.

### 다음 작업

- FE-0006: LocalAuthentication App Lock state machine, AppState timeout adapter와 non-token auth UI state

## FE-0006 — Local biometric App Lock와 session-aware boundary

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add biometric app lock foundation [FE-0006]`

### 완료

- Expo SDK 57 공식 호환 `expo-local-authentication ~57.0.2`와 client-only app lock 상태 전용 `zustand 5.0.15` 추가
- Android Class 3 `strong`, device passcode fallback 비활성화, hardware/enrollment 선검사를 적용한 `ExpoBiometricGate` adapter 구현
- success, cancel, retryable authentication failure/timeout, 미지원·미등록·device lockout·OIDC 재인증 필요 결과를 token-free domain result로 정규화
- active session의 화면을 초기 잠금 상태로 가리고 성공한 로컬 생체인증 이후에만 공개하는 `AppLockBoundary`를 root에 조합
- 60초의 주입 가능한 AppState background timeout과 `active → inactive → background`에서 최초 이탈 시간을 보존하는 lifecycle adapter 구현
- secure session 존재 여부를 `unknown/active/absent/unavailable`로 관찰하고, SecureStore 검사 실패 시 protected content를 노출하지 않는 fail-closed recovery UI 구현
- 앱 잠금 상태만 Zustand에 두고 access/refresh token이나 server state를 저장하지 않도록 상태 소유권 분리
- Face ID usage description config plugin을 추가하고 UI에 local device unlock이며 server MFA가 아니라는 경계를 명시

### 변경 파일

- `apps/mobile/app.json`
- `apps/mobile/package.json`
- `apps/mobile/scripts/react-native-test-shim.mjs`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/features/app-lock/**`
- `apps/mobile/src/shared/auth/**`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 48 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 15 files, 43 tests 통과; session presence/fail-closed, biometric result mapping, Zustand transition, background timeout과 잠금 UI success/cancel/reauthentication branch 포함
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo SDK dependency 호환성 통과
- 명령: `npm run security:secrets`
- 결과: token/secret scan 통과
- 명령: `npx expo config --type public`
- 결과: `expo-local-authentication` plugin과 Face ID permission 반영 확인
- 명령: `npx expo export --platform android --output-dir /tmp/financialapp-fe0006-android.LlBpYB`
- 결과: LocalAuthentication/Zustand boundary를 포함한 2,426 modules, Hermes bundle 5.2MB 성공
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0006-web.RX4J6U`
- 결과: 859 modules bundle 성공
- 명령: 임시 mobile 복제본에서 `npx expo prebuild --platform android --no-install` 후 `./android/gradlew -p android -PreactNativeArchitectures=x86_64 assembleDebug`
- 결과: `expo-local-authentication 57.0.2` autolinking 확인, Gradle 670 tasks와 x86_64 Development Build APK 생성 성공

### 이슈·누락·Handoff

- FE-GAP-0004: native module autolinking/build는 통과했지만 현재 실제 Face ID/Touch ID/Android biometric 등록 기기를 사용하지 않았으므로 실제 prompt, 성공, cancel, lockout와 background timeout 수동 검증을 Milestone 2 integration으로 기록했다.
- FE-ISSUE-0001: OPEN 유지. LocalAuthentication/Zustand 추가 후에도 audit moderate 13/high 0/critical 0이며 Expo 호환성을 깨지 않는 자동 fix가 없다.
- CONTRACT_CHANGE_REQUEST: LocalAuthentication과 app lock은 로컬 경계라 canonical OpenAPI를 변경하지 않았다. OIDC 재인증 화면 연결에는 FE-GAP-0003의 승인된 IdP 설정과 `/me` 계약이 필요하다.
- INTEGRATION_HANDOFF: integration owner는 `expo-local-authentication`, Zustand와 app config plugin을 root lockfile에 반영하고 iOS `NSFaceIDUsageDescription`, Android clean Development Build와 실제 기기 권한 prompt를 확인해야 한다.
- 생체인증 성공은 local unlock으로만 처리하며 서버가 검증한 MFA 또는 거래 승인으로 사용하지 않는다.

### 다음 작업

- FE-0007: Expo AuthSession Authorization Code + PKCE port/adapter와 환경 config validation; live redirect와 `/me`는 승인된 IdP/계약 통합 후 검증

## FE-0007 — OIDC Authorization Code + PKCE mobile adapter

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add OIDC PKCE session adapter [FE-0007]`

### 완료

- Expo SDK 57 공식 호환 `expo-auth-session ~57.0.10`을 추가하고 OIDC browser flow를 `OidcAuthorizationPort` 뒤에 격리
- `EXPO_PUBLIC_OIDC_ISSUER`와 `EXPO_PUBLIC_OIDC_CLIENT_ID`만 받는 public config validator와 비밀값이 없는 mobile `.env.example` 추가
- issuer는 HTTPS를 요구하되 local Keycloak 개발을 위해 `localhost`/`127.0.0.1`만 HTTP를 허용하고 client secret 입력 경로를 만들지 않음
- OIDC discovery, Authorization Code, PKCE S256, state를 포함하는 Expo `AuthRequest`, `wealthsandbox://oauth/callback` redirect와 `openid profile offline_access` scope 구현
- system browser cancel/dismiss를 credential 생성 없이 반환하고 잘못된 authorization response와 provider 오류를 token value 없는 typed error로 정규화
- code verifier로 token exchange 후 access token과 필수 refresh token을 FE-0005 `AuthSessionManager`에 전달하는 `OidcLoginService` 구현
- 동일 discovery/client 설정으로 refresh token rotation을 지원하는 `TokenRefreshPort` 구현
- config가 유효할 때만 login/refresh adapter를 조립하는 composition factory를 추가하고 승인되지 않은 issuer/client 값을 하드코딩하지 않음

### 변경 파일

- `apps/mobile/.env.example`
- `apps/mobile/package.json`
- `apps/mobile/src/features/login/**`
- `apps/mobile/src/shared/auth/**`
- `apps/mobile/src/shared/config/**`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 58 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 18 files, 52 tests 통과; public config, HTTPS/local issuer, PKCE S256/verifier exchange, browser cancel, missing refresh token, rotation과 secure session establish 포함
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: Expo SDK dependency 호환성 통과
- 명령: `npm run security:secrets`
- 결과: mobile env template과 source token/secret scan 통과
- 명령: `npx expo export --platform android --output-dir /tmp/financialapp-fe0007-android.UGdPgU`
- 결과: 2,427 modules, Hermes bundle 5.2MB 성공
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0007-web.FKj8dU`
- 결과: 862 modules bundle 성공

### 이슈·누락·Handoff

- FE-GAP-0003: adapter와 test는 완료했지만 승인된 issuer/public client와 실행 중인 IdP가 없어 live browser redirect, code exchange, process restart refresh와 canonical `/me`는 계속 UNVERIFIED다.
- CONTRACT_CHANGE_REQUEST: backend/integration owner는 OIDC issuer, public client ID, `wealthsandbox://oauth/callback` 등록, offline refresh 정책과 additive `/api/v1/me`/authentication problem 계약을 확정해야 한다.
- INTEGRATION_HANDOFF: integration owner는 `expo-auth-session`과 transitive native browser dependency를 root lockfile에 반영하고 clean Development Build의 redirect scheme 등록을 확인해야 한다.
- frontend는 client secret, undocumented password grant, 자체 JWT login 또는 canonical OpenAPI에 없는 `/me` 응답을 구현하지 않았다.

### 다음 작업

- FE-0008: session-aware Login Boundary와 OIDC configured/missing/opening/cancel/error UI; live login success는 FE-GAP-0003 조건 충족 후 연결 검증

## FE-0008 — Session-aware OIDC Login Boundary

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add session-aware OIDC login UI [FE-0008]`

### 완료

- secure session이 `absent`일 때만 OIDC login을 노출하고 `unknown/unavailable/active`는 FE-0006의 fail-closed 검사와 App Lock으로 전달하는 `LoginBoundary` 구현
- 승인된 OIDC config가 없으면 env 변수 이름만 안내하고 browser/token 요청을 시작하지 않는 설정 누락 화면 구현
- 설정 완료 시 시스템 브라우저 로그인, opening progress, cancel/dismiss, generic provider error와 retry 가능한 UI 상태 구현
- OIDC 성공은 FE-0007 `OidcLoginService`가 session을 establish하도록 연결해 session active 전에는 보호 화면이 렌더링되지 않도록 root provider 순서 구성
- Expo web callback popup completion을 등록하고 direct native dependency로 `expo-web-browser ~57.0.2` 고정
- client secret 부재, PKCE S256, access token memory 보관과 Synthetic Financial Data 경계를 로그인 화면에 명시

### 변경 파일

- `apps/mobile/package.json`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/features/login/index.ts`
- `apps/mobile/src/features/login/ui/**`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 61 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 19 files, 55 tests 통과; browser opening/cancel, redacted error와 config missing no-action UI 포함
- 명령: `npm run dependency:check -w @finapp/mobile`
- 결과: local Expo SDK dependency map 기준 호환성 통과
- 명령: `npm run security:secrets`
- 결과: source/env template token/secret scan 통과
- 명령: `npx expo export --platform android --output-dir /tmp/financialapp-fe0008-android.UVyl7R`
- 결과: AuthSession/WebBrowser Login Boundary를 포함한 2,461 modules, Hermes bundle 5.2MB 성공
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0008-web.9R8TfR`
- 결과: OIDC popup completion을 포함한 896 modules, 1.3MB bundle 성공
- 명령: 임시 mobile 복제본에서 `npx expo prebuild --platform android --no-install` 후 `./android/gradlew -p android -PreactNativeArchitectures=x86_64 assembleDebug`
- 결과: `expo-web-browser 57.0.2`, Expo Crypto/Application autolinking, `wealthsandbox` intent scheme과 Gradle 670-task x86_64 Debug APK build 성공

### 이슈·누락·Handoff

- FE-GAP-0003: config missing UI가 승인되지 않은 provider 호출을 막고 있으며, 실제 issuer/client가 없으므로 login success → App Lock → `/me` 흐름은 계속 UNVERIFIED다.
- FE-ISSUE-0001: OPEN 유지. AuthSession/WebBrowser 추가 후 audit moderate 13/high 0/critical 0으로 변화가 없다.
- CONTRACT_CHANGE_REQUEST: FE-0007과 동일하게 issuer/public client/redirect 등록, refresh 정책과 canonical `/api/v1/me`/authentication problem 계약 확정이 필요하다.
- INTEGRATION_HANDOFF: integration owner는 Expo AuthSession/WebBrowser/Crypto/Application dependency와 `wealthsandbox` Android intent/iOS URL scheme을 root lockfile 및 clean Development Build에서 확인해야 한다.
- browser/provider 오류 원문과 authorization code/token은 UI, log와 Zustand에 저장하지 않는다.

### 다음 작업

- FE-0009: authenticated fetch의 memory Bearer 주입, 401 refresh single-flight/replay-once와 logout Query cache clear foundation; endpoint는 canonical 계약 외에 추가하지 않음

## FE-0009 — Authenticated request와 session cache lifecycle

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)
- commit: `feat(fe): add authenticated request lifecycle [FE-0009]`

### 완료

- FE-0005 memory access token만 `Authorization: Bearer`로 주입하고 일반 storage/cache에서 token을 읽지 않는 endpoint-agnostic `AuthenticatedFetch` 구현
- process restart로 access token이 없으면 SecureStore refresh credential을 통한 single-flight refresh 후 최초 요청을 한 번만 전송
- 동시 GET 401이 하나의 refresh promise를 공유하고 새 access token으로 각 요청을 정확히 1회만 replay하도록 구성
- 자동 replay는 GET/HEAD/OPTIONS로 제한하고 POST 등 mutation의 401은 refresh 후 원 요청 response를 반환해 주문 POST 자동 재전송을 금지
- replay된 조회가 다시 401이면 local credential을 지우고 `SessionExpiredError` 및 session `absent`를 발행해 Login Boundary로 fail closed
- refresh 실패도 manager session presence에 `absent`를 발행하도록 FE-0005 coordinator와 manager composition 연결
- session `absent` 전이 시 TanStack Query의 사용자별 cache를 즉시 clear하는 lifecycle listener를 MobileQueryProvider에 연결
- canonical OpenAPI에 인증 endpoint가 없으므로 transport에 임의 `/me`나 업무 endpoint를 추가하지 않음

### 변경 파일

- `apps/mobile/src/features/login/model/create-oidc-session-composition.ts`
- `apps/mobile/src/shared/api/**`
- `apps/mobile/src/shared/auth/**`
- `apps/mobile/src/shared/query/**`
- `docs/workstreams/frontend/DEVELOPMENT_LOG.md`
- `docs/workstreams/frontend/ISSUE_REGISTER.md`

### 검증

- 명령: `npm run architecture:check -w @finapp/mobile`
- 결과: 65 source files boundary/cycle check 통과
- 명령: `npm run lint -w @finapp/mobile`
- 결과: 통과
- 명령: `npm run typecheck -w @finapp/mobile`
- 결과: TypeScript strict 통과
- 명령: `npm run test -w @finapp/mobile`
- 결과: 21 files, 60 tests 통과; concurrent 401 single-flight, GET replay-once, POST no replay, second 401/refresh failure fail-closed와 session cache clear 포함
- 명령: `npm run security:secrets`
- 결과: source token/secret scan 통과
- 명령: `npx expo export --platform android --output-dir /tmp/financialapp-fe0009-android.cnbJxJ`
- 결과: session cache listener를 포함한 2,463 modules, Hermes bundle 5.3MB 성공
- 명령: `npx expo export --platform web --output-dir /tmp/financialapp-fe0009-web.sQU8el`
- 결과: 898 modules, 1.3MB bundle 성공

### 이슈·누락·Handoff

- FE-GAP-0003: 401/refresh/logout client lifecycle은 자동 검증됐지만 실제 `/me`와 IdP가 없어 live access token으로의 첫 요청, 실제 401과 refresh rotation은 계속 UNVERIFIED다.
- CONTRACT_CHANGE_REQUEST: integration owner가 additive `/api/v1/me`, bearer authentication problem response와 IdP 값을 제공하면 `AuthenticatedFetch`를 generated/contract endpoint adapter에 조합한다.
- mutation 401은 의도적으로 자동 replay하지 않는다. 주문은 사용자가 명시적으로 다시 확인하거나 업무별 idempotency flow가 처리해야 한다.
- session absent 시 QueryClient가 clear되며 token/server response는 Zustand에 복제하지 않는다.

### 다음 작업

- FE-0010: 승인된 OIDC provider 설정과 additive `/api/v1/me` 계약 통합. 현재 base contract에는 health 외 endpoint가 없어 FE-GAP-0003 외부 조건 충족 전에는 contract-driven Milestone 2 완료와 Milestone 3 API 화면 개발을 진행하지 않는다.

## FE-0010 — Live OIDC와 현재 사용자 통합

- 날짜: 2026-09-02
- Milestone: 2
- 상태: COMPLETED
- base commit: `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- contract revision: `platform-v1` blob `e2f4581bdf17c91fec1383c8f0b75b1669f98f7c`
- 예정 commit: `feat(fe): connect live OIDC current user [FE-0010]`

### 완료

- canonical `/api/v1/me` response를 strict UUID/risk/dataset/synthetic mapper와 `PlatformApi.getCurrentUser` port에 추가하고 mock/HTTP/config-unavailable adapter가 같은 port를 구현
- 실제 mode에서 AuthSession manager, ExpoOidcClient, refresh coordinator, AuthenticatedFetch와 HttpPlatformApi를 composition root에서 조합하고 public health fetch와 authenticated fetch를 분리
- TanStack Query current-user hook과 loading/ready/non-retryable/retry UI, risk/dataset/synthetic disclaimer와 local logout 화면 구현
- Expo Router callback 전용 route를 추가해 Android AuthSession callback 처리 후 unmatched route 없이 App Lock과 home으로 자동 복귀
- Keycloak 25+ lightweight token의 subject를 위한 `basic` scope mapper와 optional `offline_access`, 최소 mobile scope를 realm JSON 및 멱등 provisioning에 반영
- 합성 사용자 provisioning과 PKCE/JWT/`/me`/refresh restart/invalid token/logout smoke script를 추가하고 credential/token/code를 source와 출력에서 제외
- React Native core SafeAreaView를 safe-area-context provider/view로 교체하고 Vitest host shim을 추가

### 변경 파일

- mobile composition/UI/API: `apps/mobile/src/app/**`, `apps/mobile/src/features/identity/**`, `apps/mobile/src/features/login/**`, `apps/mobile/src/shared/api/**`
- local identity: `infra/keycloak/finapp-realm.json`, `scripts/provision-local-oidc-user.mjs`, `scripts/smoke-local-oidc.mjs`
- contract/test config: `contracts/operation-coverage.yaml`, `apps/mobile/vitest.config.ts`, `apps/mobile/scripts/**`
- 문서: `infra/README.md`, 중앙/frontend 상태·결정·보안·issue/log

### 검증

- 명령: mobile architecture, lint, strict typecheck, test
- 결과: architecture 74 source files, 23 test files/67 tests 통과. 최초 SafeAreaView 전환은 package Flow syntax import로 4 suite가 시작 전에 실패했고 전용 host shim 추가 후 전체 통과
- 명령: Android/web Expo production export
- 결과: Android 1,361 modules/Hermes 3MB, web 899 modules/1.3MB 통과
- 명령: Android API 36 x86_64 `expo run:android` Development Build
- 결과: Gradle 484 tasks, APK install, system browser redirect scheme, Expo native modules autolinking 통과
- 명령: Android live UI smoke
- 결과: Keycloak browser login→callback→OS fingerprint App Lock→실제 `/api/v1/me`; app force-stop/restart→SecureStore refresh→App Lock→`/me`; local logout→login screen 통과
- 명령: clean Compose `oidc:local:user`와 `smoke:local-oidc`
- 결과: 볼륨 제거/reimport 뒤 PKCE S256, state, JWT signature/issuer/audience/subject/scope, 실제 `/me`, refresh-only restart, invalid token 401, logout 뒤 refresh 거부 통과
- 명령: Colima socket을 명시한 root `npm run verify`
- 결과: formatter, 31 operation/34 fixture 계약, Expo dependency, secret, architecture, lint, strict typecheck, mobile 67/simulator 12/platform 61 총 140 tests와 두 backend build 통과

### 이슈·누락·Handoff

- `FE-ISSUE-0002`~`FE-ISSUE-0006`: 발견과 수정·재검증을 기록하고 RESOLVED
- `FE-GAP-0003`: live OIDC와 native SecureStore restart를 해결
- `FE-GAP-0002`: 현재 Xcode 제약의 iOS runtime은 유지
- `FE-GAP-0004`: Android emulator 실제 fingerprint prompt까지 검증했고 물리 기기 cancel/lockout/enrollment/background timing만 남김
- client secret, 실제 개인정보/계좌정보, password grant와 주문 POST 자동 retry를 추가하지 않음

### 다음 작업

- FE-0011: MyData connection/sync와 Dashboard/Accounts vertical slice

## FE-0011 — MyData와 자산 Dashboard 통합

- 날짜: 2026-09-02
- Milestone: 3
- 상태: COMPLETED
- base commit: `bda9e5cdb43f4f01f58fec1acba308ea3f68ab4d`
- contract revision: `platform-v1` at base commit
- 예정 commit: `feat(fe): add MyData wealth dashboard [FE-0011]`

### 완료

- canonical MyData connection/sync 4개와 자산 summary/accounts/detail/holdings/transactions/history 6개 operation을 strict authenticated adapter와 deterministic fixture에 연결
- TanStack Query 기반 manual sync polling과 완료 후 server-state invalidation을 구현하고 backend summary만 총자산 기준으로 표시
- account/holding/transaction, total/history/allocation chart와 loading/empty/stale/partial error/retry/mutation error UX 구현
- canonical decimal money·quantity mapper, masked identifier와 MVP null cursor를 fail-closed response guard로 검증
- synthetic-only disclaimer, accessibility label/live region, 최소 48px action과 Reduce Motion chart 설명 구현

### 변경 파일

- `apps/mobile/src/features/wealth/**`
- `apps/mobile/src/shared/api/**`
- `apps/mobile/src/app/index.tsx`
- `contracts/operation-coverage.yaml`
- `scripts/smoke-local-order-flow.mjs`
- frontend/central 상태·개발 문서

### 검증

- mobile lint와 strict typecheck 통과
- mobile 26 files/75 tests 통과: adapter exact schema, money/quantity/masking/cursor, loading/partial error, account detail/chart/sync 포함
- local Compose PostgreSQL에서 simulator migration/seed와 simulator 기동 통과
- 실제 local Platform API smoke: sync, account 1, transaction 1, history 1, FILLED/REJECTED/UNKNOWN→FILLED 통과
- 첫 root verify는 local Colima socket 자동 탐지 실패로 Testcontainers가 시작 전에 종료됐고 test를 건너뛰지 않고 기존 환경 계약의 socket 값을 명시해 재실행
- Colima socket을 명시한 root `npm run verify`: formatter, 31 operation/34 fixture 계약, Expo dependency, secret, architecture, lint, strict typecheck, mobile 75/simulator 12/platform 61 총 148 tests와 두 backend build 통과

### 이슈·누락·Handoff

- 테스트 더블이 동일 connection URL의 GET/POST 응답을 구분하지 않던 실패를 같은 slice에서 수정했으며 제품 defect나 잔여 gap은 없음
- 원격 DB·credential·migration·deploy는 사용자 STOP 규칙에 따라 실행하지 않음

### 다음 작업

- FE-0012: server simulation 입력/실행/결과와 percentile chart vertical slice

## FE-0012 — Server Simulation Mobile 통합

- 날짜: 2026-09-02
- Milestone: 4
- 상태: COMPLETED
- base commit: `4e40d20842e0d13da5ea1d0fa4b5fe85a9535a3a`
- contract revision: `platform-v1` at base commit
- 예정 commit: `feat(fe): add persisted simulation flow [FE-0012]`

### 완료

- 네 개 pre-submit draft만 Zustand에 두고 create mutation이 반환한 ID로 저장 결과를 Query 재조회해 server result만 표시
- canonical simulation request/response types, strict exact guard와 config/mock/HTTP adapter를 구현하고 operation coverage 2개를 implemented로 전환
- 입력 money precision과 1~600개월 검증, canonical Problem code 보존과 error UX 구현
- goal probability, final p50, engine/assumption version, synthetic disclaimer와 p10/p50/p90 chart·month tooltip·Reduce Motion 접근성 구현
- app shell에 자산/시뮬레이션 48px tab을 추가하고 formatter를 shared 계층으로 승격

### 검증

- mobile architecture 91 files, lint, strict typecheck와 28 files/82 tests 통과
- actual local API: 12개월 simulation create/get, 13 persisted points, `1.0.0`/`SYNTHETIC_V1` 확인
- 반복 smoke에서 connection 500과 고정 idempotency key 409를 발견해 `ISSUE-0009`/`FE-ISSUE-0008`로 기록; 목록 재사용과 action별 UUID로 smoke 재실행 통과
- 첫 root verify의 feature→feature formatter import 차단을 shared formatter 승격으로 해결하고 동일 gate 재실행
- Colima socket을 명시한 root `npm run verify`: mobile 82/simulator 12/platform 61 총 155 tests와 두 backend build 통과

### 이슈·누락·Handoff

- `FE-ISSUE-0008`: repeatable smoke 생성값 충돌 RESOLVED
- 중앙 `ISSUE-0009`: duplicate MyData connection의 비정상 500은 OPEN, 정상 mobile flow는 목록 우선으로 영향 없음
- 원격 DB·credential·migration·deploy는 실행하지 않음

### 다음 작업

- FE-0013: quote/biometric/idempotent BUY, order status/history와 UNKNOWN recovery

## FE-0013 — BUY Order와 UNKNOWN Recovery

- 날짜: 2026-09-02
- Milestone: 5
- 상태: COMPLETED
- base commit: `24e2162edcb6d3a90d498ca669da50cd0ed9a8c2`
- contract revision: additive Holding `instrumentId`, platform-v1
- 예정 commit: `feat(fe): add biometric BUY recovery flow [FE-0013]`

### 완료

- quote/order/list/detail canonical types와 strict guards, mock/HTTP/unavailable adapter를 구현하고 4개 consumer coverage를 implemented로 전환
- holding의 opaque instrument UUID, 입력 수량과 60초 expiry를 사용해 preview하고 local biometric 성공 전에는 submit하지 않는 화면 구현
- 각 preview 사용자 action에서 UUID idempotency key를 한 번 만들고 order mutation retry를 false로 고정
- POST 401 automatic replay 금지 foundation을 유지하고 UNKNOWN은 GET status polling만 수행
- FILLED 뒤 summary/accounts/holdings/history/order list exact invalidation과 order history, REJECTED/FAILED/UNKNOWN/error code UX 구현

### 검증

- mobile architecture 95 files, lint, strict typecheck와 29 files/88 tests 통과
- component/adapter: expiry 전 biometric, cancel 차단, 단일 POST, UUID header, UNKNOWN GET polling과 response exact guard 통과
- 첫 component run의 native auth barrel eager import와 history amount를 quote로 오인한 async assertion을 각각 direct import/role wait로 해결
- actual local FILLED, REJECTED, UNKNOWN→FILLED와 duplicate connection 409, sync/simulation smoke 통과
- root `npm run verify`: mobile 88/simulator 12/platform 61 총 161 tests와 두 backend build 통과

### 이슈·누락·Handoff

- `FE-ISSUE-0009`: native barrel eager import RESOLVED
- 주문 POST 자동 retry/replay, biometric 전 submit과 code→instrument ID 추측 없음
- 원격 DB·credential·migration·deploy는 실행하지 않음

### 다음 작업

- FE-0014: Settings, synthetic/dataset, money hide, developer scenario/reset와 accessibility review

## FE-0014 — Settings·Developer Scenario·접근성

- 날짜: 2026-09-02
- Milestone: 2~5 로컬 MVP 마무리
- 상태: COMPLETED
- base commit: `229fe4dd40246661659e0a7bd366a71b38b56ff3`
- contract revision: `platform-v1`
- 예정 commit: `feat(fe): add safe settings and scenario controls [FE-0014]`

### 완료

- 설정 tab에 current-user dataset/synthetic 안내, 로컬 session logout과 공통 금액 숨기기를 구현
- 금액 숨기기를 Dashboard/account/holding/transaction/chart accessibility label, simulation input/result/chart와 order quote/status/history에 적용
- Expo가 정적 치환하는 `EXPO_PUBLIC_APP_ENV` 명시 값으로 local/demo만 developer panel을 열고 production·누락·미지값을 fail-closed 처리
- 6개 canonical scenario PUT과 bodyless reset POST를 strict guard, HTTP/mock/unavailable adapter와 연결
- simulator instrument 목록은 mobile이 private simulator를 직접 소비하지 않도록 operation coverage를 internal platform boundary `not-applicable`로 정정

### 검증

- mobile architecture 102 source files, lint, strict typecheck 통과
- mobile 31 files/95 tests: environment fail-closed, production UI 미노출, logout/money toggle, scenario/reset, HTTP method/body/header와 exact response guard 포함
- actual local Compose 상태에서 sync/simulation/NORMAL FILLED/REJECTED/UNKNOWN→FILLED/developer reset smoke 통과
- 최초 root verify에서 기존 Colima 환경 계약 중 host `DOCKER_HOST`만 지정해 Ryuk socket mount가 실패했고 test를 비활성화하지 않음. 기존 문서화된 `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`를 함께 지정해 재실행
- 최종 root `npm run verify`: mobile 95/simulator 12/platform 61, 총 168 tests와 두 backend build 통과

### 이슈·누락·Handoff

- `FE-ISSUE-0010` synthetic session fixture secret scan 오탐은 명시적 placeholder로 교체해 RESOLVED. iOS/physical biometric과 Expo advisory는 기존 active gap/issue를 유지
- production은 developer UI 진입점이 없고 backend developer module도 미등록이며, mobile은 simulator private endpoint를 직접 호출하지 않음
- 원격 DB·credential·migration·deploy는 실행하지 않음

### 다음 작업

- DEV-0011: clean local MVP 12-step acceptance와 fresh-clone/release gate
