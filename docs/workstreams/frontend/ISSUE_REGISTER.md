# Frontend Workstream Issue와 Gap Register

- 다음 ISSUE ID: `FE-ISSUE-0012`
- 다음 GAP ID: `FE-GAP-0005`
- active issue: `FE-ISSUE-0001`
- active gap: `FE-GAP-0002`, `FE-GAP-0004`

frontend에 국한된 defect, blocker와 누락을 삭제하지 않고 추적한다. backend·계약·milestone 완료에도 영향을 주면 handoff와 중앙 `ISSUE_REGISTER.md`에 연결한다.

## Active Issue

### FE-ISSUE-0001 — Expo 57 transitive dependency advisory 재확인

- 상태: OPEN
- 심각도: MEDIUM
- 발견 FE: DEV-0005 공통 scaffold
- 마지막 갱신: 2026-09-02, FE-0008
- 관련 contract revision: `platform-v1`
- 중앙 연결: `ISSUE-0002`
- 내용: 공식 Expo SDK 57.0.18 dependency tree에서 `npm audit` moderate 13건이 보고된다.
- 영향: local 개발과 자동 검증은 통과하지만 preview/demo release 전에 upstream patch 또는 공식 호환 override를 확인해야 한다.
- 해결 조건: 중앙 `ISSUE-0002`의 해결 조건 충족
- 목표 FE: Milestone 6 preview/demo release gate 전 호환 patch 상태 재확인
- 해결 FE:
- 검증: FE-0001에서 `npm view expo@57 version --json`과 Expo 공식 SDK 57 문서를 확인한 결과 stable 최신 patch는 `57.0.18`이며 현재 manifest와 동일하다. FE-0008의 AuthSession/WebBrowser까지 추가한 뒤에도 `expo install --check`는 통과하고 `npm audit --json`은 moderate 13/high 0/critical 0으로 유지됐다. 제안된 강제 fix는 Expo 46 또는 Expo Router 5로의 비호환 downgrade다. Android API 31 Development Build chart runtime smoke는 FE-0004, LocalAuthentication과 OIDC browser native compile은 FE-0006/FE-0008에서 통과했다.

## Active Gap

### FE-GAP-0002 — iOS Development Build chart runtime 검증

- 상태: UNVERIFIED
- 심각도: LOW
- 발견 FE: FE-0004
- 누락/연기 이유: 현재 호스트의 Xcode 16.2와 설치된 iOS 17.5~18.1 Simulator runtime으로는 Expo SDK 57의 최신 iOS native toolchain 요구를 충족할 수 없다. frontend 소유 범위를 벗어난 Xcode 업그레이드를 수행하지 않았다.
- 현재 영향: Android API 31 Development Build에서 Victory Native/Skia/Reanimated chart smoke가 성공해 Milestone 1의 최소 1개 플랫폼 완료 조건에는 영향이 없다. iOS preview/release confidence만 미검증 상태다.
- 목표 Milestone: 6 preview/demo release gate 전
- 재확인 조건: Expo SDK 57 지원 Xcode/iOS simulator 또는 실제 iOS 기기에서 clean Development Build, health screen chart 렌더링, fatal native/JS log 없음 확인
- 해결 FE:
- 검증: FE-0004에서 iOS Hermes production bundle 2,312 modules/4.9MB는 성공했다. Android에서는 x86_64 Debug APK build와 API 31 runtime chart render까지 성공했다.

### FE-GAP-0004 — 실제 기기 LocalAuthentication과 background App Lock 검증

- 상태: UNVERIFIED
- 심각도: MEDIUM
- 발견 FE: FE-0006
- 누락/연기 이유: Android API 36 emulator에서는 등록 fingerprint와 실제 OS prompt를 검증했지만 물리 Face ID/Touch ID/Android biometric 기기를 사용하지 않았다.
- 현재 영향: emulator 실제 prompt/success, process restart 재인증과 자동 success/cancel/failure/lockout/60초 state test는 통과했다. 물리 기기 cancel/lockout 복구, enrollment 변경과 실제 60초 background timing만 미검증이다.
- 목표 Milestone: 2
- 재확인 조건: 승인된 OIDC test session과 실제 iOS/Android 기기에서 login → initial app lock → biometric unlock → 60초 이상 background → relock, cancel/retry, enrollment 제거 또는 lockout → local session clear/로그인 화면 흐름을 수동 확인
- 해결 FE:
- 검증: FE-0006 자동/native build에 더해 FE-0010 Android API 36 Development Build에서 fingerprint enrollment, OS prompt, unlock, process restart 뒤 재인증과 실제 `/me` 복구를 통과했다. UI는 생체인증을 server MFA로 표현하지 않는다.

## Resolved History

### FE-ISSUE-0011 — Profile 저장 결과가 developer tools 내부에서만 표시

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: DEV-0012 Settings component test
- 관련 contract revision: risk profile GET/PUT additive platform-v1
- 중앙 연결: 없음
- 내용: 공용 mutation 상태 message가 developer tools 조건부 card 안에 렌더링돼 production profile에서 risk profile 저장 성공·오류 결과가 보이지 않았다.
- 영향: server update는 수행되지만 일반 사용자는 저장 결과나 409/validation 안내를 확인할 수 없었다.
- 해결 조건: 공용 live-region status를 developer 조건 밖으로 이동하고 production-disabled component에서 실제 profile update 결과가 표시될 것.
- 목표 FE: DEV-0012
- 해결 FE: DEV-0012
- 검증: production-disabled Settings component가 profile 입력/PUT과 성공 live-region을 확인했고 mobile 전체/root gate를 통과했다.

### FE-ISSUE-0010 — Settings session fixture의 secret scan 오탐

- 상태: RESOLVED
- 심각도: LOW
- 발견 FE: FE-0014 root verify
- 관련 contract revision: `platform-v1`
- 중앙 연결: `ISSUE-0010`
- 내용: settings logout component test의 합성 session token 문자열이 credential literal secret 탐지 규칙에 일치했다.
- 영향: 실제 secret 노출은 없었지만 root release gate가 중단됐다.
- 해결 조건: detector/file을 제외하지 않고 명시적 synthetic placeholder로 통과할 것.
- 목표 FE: FE-0014
- 해결 FE: FE-0014
- 검증: `<synthetic-access-token>`/`<synthetic-refresh-token>`으로 변경한 뒤 secret scan과 root verify를 재실행했다.

### FE-ISSUE-0009 — Order component test의 native auth barrel eager import

- 상태: RESOLVED
- 심각도: LOW
- 발견 FE: FE-0013 mobile test
- 관련 contract revision: additive Holding `instrumentId` at `24e2162edcb6d3a90d498ca669da50cd0ed9a8c2`
- 내용: Order screen이 `shared/auth` barrel에서 biometric adapter를 가져오며 test에 불필요한 SecureStore native module까지 eager import해 `__DEV__` 초기화 오류가 발생했다.
- 영향: production 주문 로직이 아니라 component test/runtime composition 경계가 오염돼 suite가 시작되지 않았다.
- 해결 조건: order feature가 필요한 biometric port/adapter 파일만 import하고 전체 mobile suite가 경고 없이 통과할 것.
- 목표 FE: FE-0013
- 해결 FE: FE-0013
- 검증: direct shared module import로 분리하고 mobile 29 files/88 tests를 통과했다. 이후 async quote assertion도 history amount와 구분해 안정화했다.

### FE-ISSUE-0008 — Local smoke 고정 생성값의 재실행 충돌

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: FE-0012 local actual API smoke
- 관련 contract revision: `platform-v1` at `4e40d20842e0d13da5ea1d0fa4b5fe85a9535a3a`
- 내용: 기존 smoke가 매번 connection POST와 동일한 세 idempotency key를 사용해, 데이터를 보존한 로컬 PostgreSQL에서 재실행하면 connection 500 또는 주문 `IDEMPOTENCY_CONFLICT` 409로 중단됐다.
- 영향: fresh environment 첫 실행은 통과하지만 vertical slice별 반복 검증이 재현 가능하지 않았다. duplicate connection의 비정상 500은 중앙 `ISSUE-0009`로 별도 추적한다.
- 해결 조건: existing connection을 재사용하고 매 실행의 서로 다른 사용자 action에는 새 UUID idempotency key를 사용해 반복 smoke가 끝까지 통과할 것.
- 목표 FE: FE-0012
- 해결 FE: FE-0012
- 검증: 수정 후 보존된 local DB에서 sync, 13-point persisted simulation, FILLED/REJECTED/UNKNOWN→FILLED와 reset smoke를 통과했다.

### FE-ISSUE-0007 — Connection GET/POST test double 응답 혼용

- 상태: RESOLVED
- 심각도: LOW
- 발견 FE: FE-0011 adapter test
- 관련 contract revision: `platform-v1` at `bda9e5cdb43f4f01f58fec1acba308ea3f68ab4d`
- 내용: 동일 `/mydata/connections` URL을 사용하는 생성 POST와 목록 GET에 테스트 fetch가 모두 단일 connection 객체를 반환했다.
- 영향: 제품 adapter가 아니라 신규 consumer test double이 목록의 canonical 배열 guard에서 실패했다.
- 해결 조건: method에 따라 canonical 생성 객체/목록 배열을 반환하고 FE-0011 전체 adapter suite가 통과할 것.
- 목표 FE: FE-0011
- 해결 FE: FE-0011
- 검증: fetch double이 `RequestInit.method`를 분기하도록 수정한 뒤 mobile 26 files/75 tests와 root contract gate를 통과했다.

### FE-ISSUE-0006 — Current-user test token placeholder의 secret scan 오탐

- 상태: RESOLVED
- 심각도: LOW
- 발견 FE: FE-0010 root verify
- 관련 contract revision: `platform-v1` at `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- 내용: current-user component test의 합성 access token 문자열이 secret detector의 credential literal 규칙과 일치했다.
- 영향: 실제 secret은 아니었지만 root gate가 의도대로 실패했다.
- 해결 조건: detector를 비활성화하거나 파일을 제외하지 않고 명시적 허용 placeholder 표기로 변경할 것.
- 목표 FE: FE-0010
- 해결 FE: FE-0010
- 검증: `<synthetic-access-token>`/`<synthetic-refresh-token>` placeholder로 교체한 뒤 secret scan과 전체 root verify를 통과했다.

### FE-ISSUE-0005 — React Native core SafeAreaView runtime deprecation

- 상태: RESOLVED
- 심각도: LOW
- 발견 FE: FE-0010 Android live smoke
- 관련 contract revision: `platform-v1` at `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- 내용: Development Build가 React Native core `SafeAreaView` 제거 예정 경고를 출력했다.
- 영향: 현재 렌더링은 성공하지만 향후 React Native 갱신에서 화면 inset 처리가 깨질 수 있다.
- 해결 조건: direct dependency인 `react-native-safe-area-context` provider/view로 전환하고 component/native build gate를 통과할 것.
- 목표 FE: FE-0010
- 해결 FE: FE-0010
- 검증: root `SafeAreaProvider`와 네 화면의 safe-area-context view로 전환하고 mobile component suite와 Android Development Build/export를 검증했다.

### FE-ISSUE-0004 — OIDC callback의 Expo Router unmatched route 노출

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: FE-0010 Android live smoke
- 관련 contract revision: `platform-v1` at `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- 내용: Android AuthSession이 callback과 token exchange를 정상 처리했지만 `/oauth/callback` route가 없어 세션 활성화 직후 Expo Router의 `Unmatched Route`가 표시됐다.
- 영향: 인증 자체는 성공했으나 사용자가 수동으로 뒤로 가야 App Lock에 진입했다.
- 해결 조건: callback route가 인증 경계 처리 후 자동으로 `/`에 복귀하고 live flow에서 unmatched UI가 노출되지 않을 것.
- 목표 FE: FE-0010
- 해결 FE: FE-0010
- 검증: `src/app/oauth/callback.tsx`를 추가한 뒤 Android 시스템 브라우저 callback이 직접 App Lock으로 복귀하고 unmatched route가 재현되지 않았다.

### FE-ISSUE-0003 — Native OIDC composition의 pure adapter test eager import

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: FE-0010 mobile test
- 관련 contract revision: `platform-v1` at `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- 내용: shared API provider가 Expo SecureStore/AuthSession composition을 eager import해 pure mock/HTTP adapter test가 native global 초기화 오류로 실패했다.
- 영향: production behavior가 아니라 test/runtime composition 경계가 오염돼 mobile suite가 시작되지 않았다.
- 해결 조건: pure API context가 native module을 import하지 않고 app composition layer에서만 실제 provider를 조합할 것.
- 목표 FE: FE-0010
- 해결 FE: FE-0010
- 검증: provider를 login composition으로 이동한 뒤 mobile 23 files/67 tests와 architecture check가 통과했다.

### FE-ISSUE-0002 — Local Keycloak realm scope와 provisioning response 불일치

- 상태: RESOLVED
- 심각도: HIGH
- 발견 FE: FE-0010 clean OIDC smoke
- 관련 contract revision: `platform-v1` at `2949267de9394f14dcb8c6ce5a11aea0d0d593ed`
- 중앙 연결: `ISSUE-0008`
- 내용: Keycloak 26 realm import에 lightweight token `sub`용 `basic` scope와 optional `offline_access`가 없고 mobile은 제공되지 않은 `profile` scope를 요청했다. Admin API의 성공 201 no-content도 JSON으로 강제 파싱했다.
- 영향: authorization의 invalid scope, access token subject 누락 또는 provisioning parse 실패로 live `/me`가 진행되지 않았다.
- 해결 조건: clean realm import와 멱등 provisioning에서 PKCE, subject/scope, offline refresh와 `/me`가 모두 통과할 것.
- 목표 FE: FE-0010
- 해결 FE: FE-0010
- 검증: `basic`/`offline_access`, 최소 scope와 no-content 처리를 반영하고 볼륨 제거 뒤 clean Keycloak 26.7.3 PKCE→JWT→`/me`→refresh→logout smoke를 통과했다.

### FE-GAP-0003 — Live OIDC refresh와 native SecureStore restart 검증

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: FE-0005
- 누락/연기 이유: 초기 canonical 계약과 local IdP 합성 사용자 연결 전에는 실제 provider login/restart를 실행할 수 없었다.
- 현재 영향: 없음. iOS runtime과 물리 biometric edge case는 FE-GAP-0002/0004에 분리돼 있다.
- 목표 Milestone: 2
- 재확인 조건: 승인된 IdP 설정과 additive `/me` 계약으로 실제 Development Build에서 login → process restart → refresh single-flight → `/me`, refresh 실패 → local clear/재로그인 흐름 통과
- 해결 FE: FE-0010
- 검증: clean Compose 무인 PKCE/JWT/`/me`/refresh-only restart/logout smoke와 Android API 36 Development Build login→callback→App Lock→`/me`, force-stop/restart→SecureStore refresh→`/me`, local logout→login screen을 통과했다.

### FE-GAP-0001 — React 19 mobile component test harness

- 상태: RESOLVED
- 심각도: MEDIUM
- 발견 FE: FE-0002
- 누락/연기 이유: `react-test-renderer 19.2.3` 기반 smoke test는 deprecated 경고와 React act 환경 불일치를 발생시켜 기준선에서 제거했다. 경고를 숨기거나 deprecated renderer를 고정하지 않고 React Native Testing Library 14와 Vitest의 호환 설정을 검증해야 한다.
- 현재 영향: 없음. FE-0003에서 health loading/ready/error component test가 추가됐다.
- 목표 Milestone: 1
- 재확인 조건: React 19.2.3/React Native 0.86.3에서 경고 없이 실행되는 RNTL component suite와 lint/typecheck/web export 통과
- 해결 FE: FE-0003
- 검증: RNTL 14.0.1과 modern test-renderer 1.2.0, Vitest optimizer와 test-only RN host shim 조합에서 loading → ready와 retryable error/accessibility button component test 통과. 전체 mobile suite 7 files/16 tests, lint, strict typecheck와 web export 통과

## Issue Template

```markdown
### FE-ISSUE-#### — 제목

- 상태: OPEN | IN_PROGRESS | BLOCKED | RESOLVED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 발견 FE:
- 관련 contract revision:
- 내용:
- 영향:
- 해결 조건:
- 목표 FE:
- 해결 FE:
- 검증:
```

## Gap Template

```markdown
### FE-GAP-#### — 제목

- 상태: DEFERRED | UNVERIFIED | RESOLVED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 발견 FE:
- 누락/연기 이유:
- 현재 영향:
- 목표 Milestone:
- 재확인 조건:
- 해결 FE:
- 검증:
```
