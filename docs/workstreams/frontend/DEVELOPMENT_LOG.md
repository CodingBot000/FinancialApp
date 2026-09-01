# Frontend Workstream 개발 로그

- 기록 방식: append-only
- 다음 ID: `FE-0006`
- branch/worktree: `codex/frontend` / `/Users/switch/Development/Web/FinancialApp-frontend`
- base commit: `5ffc23edf403c56b95d15656724a23f7a62546af`
- contract revision: `platform-v1` at base commit (blob `8942e08342cd78f7e251f09b8a3005c9e797d93f`)

frontend session은 `apps/mobile/**` 변경을 commit 단위로 기록한다. 중앙 `DEVELOPMENT_LOG.md`는 integration owner만 수정한다.

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
