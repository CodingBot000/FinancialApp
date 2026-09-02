# 이슈와 누락 Register

- 마지막 갱신: 2026-09-03
- 다음 ISSUE ID: `ISSUE-0018`
- 다음 GAP ID: `GAP-0010`

이 문서는 defect, blocker, 위험과 불가피한 누락을 삭제하지 않고 추적한다.

frontend 내부 항목은 `workstreams/frontend/ISSUE_REGISTER.md`의 `FE-ISSUE-####`/`FE-GAP-####`, backend 내부 항목은 `workstreams/backend/ISSUE_REGISTER.md`의 `BE-ISSUE-####`/`BE-GAP-####`를 사용한다. 두 영역 또는 milestone 완료에 영향을 주는 항목만 integration owner가 이 중앙 register의 `ISSUE-####`/`GAP-####`에 연결한다.

## 상태

- `OPEN`: 해결 작업이 필요함
- `IN_PROGRESS`: 현재 해결 중
- `BLOCKED`: 외부 입력이나 상태가 필요함
- `DEFERRED`: 이유와 목표 milestone을 정해 연기함
- `UNVERIFIED`: 구현했지만 필요한 환경에서 검증하지 못함
- `RESOLVED`: 수정과 검증 완료
- `ACCEPTED_RISK`: 사용자가 잔여 위험을 명시적으로 수용함

## Active Issue

### ISSUE-0017 — iOS native simulator destination unavailable

- 상태: OPEN
- 심각도: MEDIUM
- 최초 발견: 2026-09-03
- 마지막 갱신: 2026-09-03
- 발견 FE: FE-0017 / native design regression
- 영향 Milestone: 7A 모바일 고객 UI 디자인 리팩터링
- 내용: Xcode 16.2와 iOS Simulator device 목록은 존재하지만 `xcodebuild -showdestinations`가 WealthFlow scheme에 placeholder destination만 노출했다. Xcode SDK는 iOS 18.2이고 설치된 simulator runtime은 iOS 17.5/18.0/18.1이라 `build_sim`이 iPhone 15 UDID를 찾지 못했다.
- 재현: `apps/mobile/ios` prebuild 후 XcodeBuildMCP `build_sim` 실행 → `Unable to find a destination matching ... platform:iOS Simulator, id:D045E4B7...`; `xcodebuild -showdestinations` → Any iOS Device/Any iOS Simulator Device placeholder만 표시.
- 영향: iOS native build/run과 화면 screenshot을 완료하지 못했다. web export, component/route tests와 backend/local verify에는 영향이 없다.
- 해결 조건: Xcode에서 사용 가능한 iOS Simulator runtime(현재 SDK 18.2에 대응) 설치 또는 eligible simulator를 boot한 뒤 WealthFlow build/run, UI snapshot/screenshot을 재검증할 것.
- 목표 FE: FE-0017
- 해결 FE: 미해결
- 원격 작업: 원격 DB/credential/deploy와 무관한 로컬 환경 문제이며 원격 시스템은 사용하지 않았다.

### ISSUE-0016 — Fresh-clone dependency/runtime verification drift

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-03
- 마지막 갱신: 2026-09-03
- 발견 FE: FE-0015 / integration verify
- 영향 Milestone: local verification gate
- 내용: pull 직후 stale `node_modules`에는 manifest에 있는 `adm-zip`과 `@aws-sdk/client-kms`가 없어 root typecheck가 실패했고, plain `npm run verify`는 Colima Testcontainers socket 환경이 없어 migration suite를 시작하지 못했다. Node 24에서 10ms loopback timeout fixture도 요청 도착 전에 종료될 수 있었다.
- 영향: 첫 전체 verify가 실패했다. migration/test를 비활성화하거나 remote DB를 사용하지 않았다.
- 해결 조건: Node 24 `npm ci`, Makefile의 local Docker wrapper, 안정적인 짧은 timeout으로 fresh local verify가 통과할 것.
- 목표 FE: FE-0015
- 해결 FE: FE-0015
- 검증: Node `v24.19.0` `npm ci` 후 dependencies가 복구됐다. `make verify`가 Colima socket 자동 설정으로 format/contract/design/security/architecture/lint/typecheck, mobile 35/104, simulator 4/12, platform 19/90와 두 backend build를 통과했다. timeout fixture는 10ms→50ms로 조정해 단일 POST/no-retry invariant를 유지하며 5 tests 통과.

### ISSUE-0015 — Shared design-system feature import boundary

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-03
- 마지막 갱신: 2026-09-03
- 발견 FE: FE-0015
- 영향 Milestone: 7A frontend design refactor
- 내용: `MarketChange` 공통 primitive가 market feature model의 `formatMarketRate`를 직접 import해 shared → feature 아키텍처 경계를 위반했다.
- 영향: 구현 화면은 렌더 가능했지만 architecture gate가 실패해 slice 완료를 선언할 수 없었다.
- 해결 조건: market rate formatter를 shared layer로 이동하고 기존 feature public import 호환성을 유지한 뒤 architecture/typecheck/test를 통과할 것.
- 목표 FE: FE-0015
- 해결 FE: FE-0015
- 검증: `shared/format/market-format.ts`를 canonical implementation으로 추가하고 feature model은 re-export adapter로 전환했다. mobile architecture 154 files, strict typecheck, 35 files/104 tests 통과.

### ISSUE-0014 — Mobile export invocation/runtime PATH drift

- 상태: RESOLVED
- 심각도: LOW
- 최초 발견: 2026-09-03
- 마지막 갱신: 2026-09-03
- 발견 FE: FE-0015
- 영향 Milestone: 7A mobile design validation
- 내용: monorepo root에서 `npx expo export`를 실행하면 Expo `AppEntry`가 workspace 밖 `App`을 찾지 못했고, 셸의 `node` 해시가 Node 20.15를 선택해 Node 24 기준 경고가 발생했다.
- 영향: 첫 export 검증 명령이 실패했으며, 앱 구현이나 원격 시스템에는 변경이 없었다.
- 해결 조건: mobile workspace cwd와 Node.js 24 runtime을 명시한 export가 성공하고 동일 조건을 문서화할 것.
- 목표 FE: FE-0015
- 해결 FE: FE-0015
- 검증: `/Users/switch/.nvm/versions/node/v24.19.0/bin`을 PATH 앞에 둔 mobile workspace에서 Expo web export가 2,186 modules/3.4MB bundle로 성공했다. root에서의 잘못된 cwd 실행은 완료 증거로 사용하지 않는다.

### ISSUE-0013 — Design system primitive API/type compatibility

- 상태: RESOLVED
- 심각도: LOW
- 최초 발견: 2026-09-03
- 마지막 갱신: 2026-09-03
- 발견 FE: FE-0015
- 영향 Milestone: 7A frontend design refactor
- 내용: 신규 design-system 공통 primitive가 React Native의 `ReactNode` export와 기존 `formatWon` 인자 계약을 잘못 가정해 첫 strict typecheck가 실패했다.
- 영향: 디자인 리팩터링 slice의 typecheck가 중단됐으며 runtime 동작에는 배포된 변경이 없었다.
- 해결 조건: React type import와 기존 formatter 계약에 맞춰 primitive를 수정하고 strict typecheck 및 component test를 통과할 것.
- 목표 FE: FE-0015
- 해결 FE: FE-0015
- 검증: React에서 `ReactNode`/`ComponentProps`를 직접 import하고 signed 표시를 primitive에서 조합하도록 수정한 뒤 `npm run typecheck -w @finapp/mobile` 통과. 실패 원인은 숨기거나 비활성화하지 않았다.

### ISSUE-0002 — Expo 57 transitive dependency moderate advisory

- 상태: OPEN
- 심각도: MEDIUM
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0005
- 영향 Milestone: 1 frontend dependency, 6 preview/demo release
- 내용: frontend/backend 통합 lockfile에서 `npm audit`이 Expo SDK 57, Expo Router, Expo Splash Screen과 관련 전이 dependency 경로의 moderate advisory 14건을 보고한다.
- 영향: local scaffold, contract mock, typecheck, test와 build는 성공한다. 그러나 원격 preview/demo release 전에 upstream patch 또는 안전한 override 가능 여부를 다시 확인해야 한다.
- 임시 우회: 공식 Expo SDK 57 template 조합을 exact/compatible range로 고정하고 `npm audit fix --force`를 실행하지 않는다. 실제 개인정보를 사용하지 않고 untrusted deep-link 입력 처리는 frontend security test에 포함한다.
- 해결 조건: Expo SDK 57 호환 patch로 advisory가 해소되거나, 공식 호환성이 확인된 override 후 Expo Doctor·native build·전체 test를 통과하거나, 사용자가 잔여 위험을 명시적으로 수용한다.
- 목표 DEV: 단계 11 원격 preview release gate 전 재판정
- 해결 DEV:
- 검증: DEV-0013에서 Expo `~57.0.19`, Expo Router `~57.0.18`이 registry current stable과 일치하고 `expo install --check`가 통과함을 재확인했다. root audit은 Expo 경로 moderate 14를 포함해 총 moderate 18/high 0/critical 0이며 제안 fix는 Expo 46/Router 5 등 비호환 downgrade이므로 적용하지 않았다. local release gate는 조건부 통과, 향후 원격 preview는 upstream 해소 또는 사용자 위험 수용 전 security-clean 판정하지 않는다.

### ISSUE-0003 — Drizzle Kit build-time transitive advisory

- 상태: OPEN
- 심각도: MEDIUM
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-02
- 발견 DEV: `BE-0001`, 중앙 연결 `DEV-0006`
- 영향 Milestone: 1 migration toolchain, 6 release gate
- 내용: stable `drizzle-kit@0.31.10`이 advisory 대상 `@esbuild-kit/*`와 `esbuild` 경로를 build-time dependency로 포함해 moderate 4건을 만든다.
- 영향: schema generation과 migration 개발 도구에만 존재한다. platform/simulator production image의 workspace-scoped runtime audit은 각각 0이다.
- 임시 우회: exact version을 lock하고 production image에서 devDependency를 제외한다. beta downgrade/upgrade나 전역 esbuild override를 강제하지 않는다.
- 해결 조건: 안전한 stable Drizzle Kit 갱신 후 schema generation, migration, Testcontainers, lint, typecheck와 build가 모두 통과한다.
- 목표 DEV: 단계 11 원격 preview release gate 전 재판정
- 해결 DEV:
- 검증: DEV-0013에서 registry current stable이 Drizzle Kit `0.31.10`, ORM `0.45.2`로 현재 pin과 같음을 확인했다. root audit은 Drizzle build-time 경로 moderate 4건을 유지하고 두 production backend image workspace audit은 vulnerability 0이다. local release gate는 조건부 통과하며 강제 downgrade/override는 적용하지 않았다.

## Active Gap

### GAP-0002 — iOS Development Build runtime 검증

- 상태: UNVERIFIED
- 심각도: LOW
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: `FE-0004`, 중앙 연결 `DEV-0006`
- 원래 요구사항: iOS에서 chart, SecureStore, AuthSession과 LocalAuthentication runtime smoke
- 누락/연기 이유: 현재 호스트 Xcode 16.2가 Expo SDK 57의 iOS toolchain 요구를 충족하지 않는다.
- 현재 영향: Android build/runtime과 iOS bundle은 검증됐으나 iOS preview/release gate는 미완료다.
- 목표 Milestone: 6 이전
- 재확인 조건: 지원 Xcode/iOS Simulator 또는 실제 iOS 기기에서 clean Development Build smoke 통과
- 해결 DEV:
- 검증: frontend `FE-GAP-0002` 참조

### GAP-0003 — 실제 기기 biometric/background App Lock 검증

- 상태: UNVERIFIED
- 심각도: LOW
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: `FE-0006`, 중앙 연결 `DEV-0006`
- 원래 요구사항: 실제 Face ID/Touch ID/Android biometric의 성공·취소·lockout과 background timeout 검증
- 누락/연기 이유: native autolinking/build와 자동 테스트는 통과했지만 등록된 실제 biometric 기기를 사용하지 않았다.
- 현재 영향: Milestone 2 실기기 완료 판정만 보류한다.
- 목표 Milestone: 6 이전
- 재확인 조건: 지원 실제 기기에서 prompt, cancel, lockout, background 60초와 재인증 흐름 통과
- 해결 DEV:
- 검증: FE-0010에서 Android API 36 emulator의 실제 시스템 fingerprint prompt, 성공 unlock, process force-stop 뒤 재인증과 `/me` 복구는 통과했다. 남은 범위는 물리 기기의 cancel/lockout/enrollment 변경과 60초 background timing이다. frontend `FE-GAP-0004` 참조.

### GAP-0007 — Local Full-stack E2E와 Fresh-clone 인수

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0007
- 원래 요구사항: local Keycloak login부터 sync, Dashboard, simulation, BUY settlement, UNKNOWN reconciliation까지 실제 mobile/platform/simulator/PostgreSQL을 연결한 12단계 인수와 fresh-clone 실행 명령
- 누락/연기 이유: DEV-0006은 service test, clean Compose와 개별 smoke를 검증했지만 mobile 업무 화면과 거래 외부 경계가 아직 없어 전체 흐름을 실행할 수 없었다. Makefile도 현재 기본 formatter/test/build wrapper만 제공한다.
- 현재 영향: 없음. 실기기/iOS와 Milestone 6 로컬·원격 하드닝은 별도 gap/범위로 유지한다.
- 목표 Milestone: 2~5 local MVP / DEV-0011
- 재확인 조건: clean 환경에서 문서화된 단일 명령 집합으로 migration/seed/service를 기동하고 `MVP_SCOPE.md` 12단계 정상·UNKNOWN 시나리오, 전체 verify와 smoke가 통과
- 해결 DEV: DEV-0011
- 검증: DEV-0011 clean local volume에서 최초 인수를 통과했다. DEV-0014에서 migration history 10개, root 189 tests/build, actual OIDC/risk-profile, 12단계 business smoke, runtime-role query plan과 production image audit 0까지 재검증했다. 최종 JSON은 `acceptance=passed`, `clean=true`, `scenarioSteps=12`, `remoteResourcesUsed=false`를 기록했다.

## Resolved History

### GAP-0009 — 주문 목록 keyset 정렬과 index tie-breaker 불일치

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0013 local query plan
- 원래 요구사항: 핵심 조회 3개 이상의 actual PostgreSQL query plan과 성능 근거
- 누락/연기 이유: 기존 주문 index는 `(user_id, created_at DESC)`까지만 포함해 실제 `(created_at DESC, id DESC)` keyset order의 UUID tie-breaker를 incremental sort했다.
- 현재 영향: 없음. 보강 전에도 결과와 1.458ms local latency는 정상이었으나 cardinality 증가 시 불필요한 sort 가능성이 있었다.
- 목표 Milestone: 6A local hardening
- 재확인 조건: exact keyset index migration, 빈/보존 PostgreSQL 적용과 plan에서 incremental sort 제거
- 해결 DEV: DEV-0013
- 검증: migration `0009_finapp_order_list_index` 후 owner order page가 composite index를 직접 사용하고 `Incremental Sort` 없이 1.126ms를 기록했다. `make performance-test`의 네 plan이 expected index와 100ms ceiling을 통과했다.

### ISSUE-0012 — `make smoke-test`가 stale host build 실행

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: BE-0012 local Compose smoke
- 원래 영향 Milestone: 6A local hardening acceptance
- 원래 내용: `make infra-up`의 Docker image build가 host `dist`를 갱신하지 않아, 별도로 실행한 `make smoke-test`가 이전 platform build를 시작하고 새 outbox 완료를 기다리다 timeout됐다.
- 해결 DEV: BE-0012
- 해결 내용: `smoke-test` entrypoint가 host platform build를 명시적으로 선행하도록 변경했다.
- 검증: 재실행에서 OIDC와 12단계 business smoke가 통과하고 processed outbox/delivery 각 3건, `remoteResourcesUsed:false`를 확인했다.

### ISSUE-0011 — `make infra-up` readiness race

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0011 개별 Make 진입점 검증
- 원래 영향 Milestone: 2~5 fresh-clone local smoke
- 원래 내용: `make infra-up`이 API 컨테이너를 생성한 즉시 반환해 직후 `make smoke-test`의 Keycloak admin token 요청이 startup 중 소켓 종료로 실패했다.
- 해결 DEV: DEV-0011
- 해결 내용: platform/simulator health와 Keycloak realm discovery 200을 90초 내 bounded polling하는 `wait:local-infra`를 `infra-up` 완료 gate로 추가했다.
- 검증: volume을 보존한 `make infra-down && make infra-up && make smoke-test`를 재실행해 readiness JSON 후 actual OIDC와 12단계 smoke가 통과함을 확인했다.

### ISSUE-0010 — FE-0014 session fixture의 secret scan 오탐

- 상태: RESOLVED
- 심각도: LOW
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: FE-0014 root verify
- 원래 영향 Milestone: 2 settings logout test
- 원래 내용: settings component test의 합성 session 문자열이 credential literal 규칙에 일치해 secret gate가 의도대로 실패했다. 실제 credential은 아니다.
- 해결 DEV: FE-0014
- 해결 내용: detector를 제외하지 않고 명시적 `<synthetic-*-token>` placeholder로 변경했다.
- 검증: `npm run security:secrets`와 FE-0014 최종 root `npm run verify`로 재검증했다.

### GAP-0008 — Mobile 주문에 필요한 instrument UUID 조회 계약 누락

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: FE-0013 contract entry review
- 원래 요구사항: mobile holding 선택에서 `POST /orders/preview`의 불투명 `instrumentId`를 구성할 수 있어야 한다.
- 누락/연기 이유: canonical Holding은 표시용 `instrumentCode`만 반환했지만 주문 요청은 DB UUID `instrumentId`를 요구해 API만으로 요청을 만들 수 없었다.
- 현재 영향: 없음. BE-0011 additive Holding 계약으로 해결했다.
- 목표 Milestone: 5 / FE-0013
- 재확인 조건: provider fixture/schema, PostgreSQL repository와 mobile strict adapter가 같은 instrument UUID를 반환하고 client가 code를 ID로 추측하지 않을 것.
- 해결 DEV: BE-0011
- 검증: Holding에 additive required `instrumentId`를 추가하고 contract 31 operations/34 fixtures, provider E2E와 PostgreSQL integration을 통과했다.

### ISSUE-0009 — Duplicate MyData connection이 canonical 409 대신 500 반환

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: FE-0012 repeatable local smoke
- 원래 영향 Milestone: 3 local API robustness / DEV-0011 acceptance
- 원래 내용: 동일 사용자·기관 active connection의 PostgreSQL unique error가 Drizzle wrapper 안에 있어 controller의 `MYDATA_CONNECTION_ALREADY_EXISTS` 409로 변환되지 않고 500이 반환됐다.
- 해결 DEV: BE-0011
- 해결 내용: bounded cause-chain에서 PostgreSQL `23505`를 식별해 기존 domain conflict로 변환하도록 repository 경계를 수정했다.
- 검증: Testcontainers duplicate repository test와 보존된 local DB actual duplicate POST의 409 `MYDATA_CONNECTION_ALREADY_EXISTS`, 이후 전체 smoke를 통과했다.

### ISSUE-0008 — Local Keycloak access token subject/offline scope 누락

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: FE-0010 clean Compose OIDC smoke
- 원래 영향 Milestone: 2 live identity
- 원래 내용: realm import가 Keycloak 25+ lightweight token의 `sub`를 공급하는 `basic` client scope와 `offline_access` optional scope를 포함하지 않았고 mobile이 realm에 없는 `profile` scope를 요청해 authorization 또는 backend subject 검증이 실패했다.
- 해결 DEV: FE-0010
- 해결 내용: `basic`의 `oidc-sub-mapper`, mobile default/optional scope와 최소 `openid offline_access` 요청을 canonical local realm 및 멱등 provisioning에 반영했다.
- 검증: 볼륨을 제거한 clean Keycloak 26.7.3 import에서 PKCE S256 login, access token JWT signature/issuer/audience/subject/scope, 실제 `/api/v1/me`, refresh rotation과 logout 뒤 refresh 거부를 통과했다.

### GAP-0001 — live OIDC와 native session restart 검증

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: `FE-0005`, 중앙 연결 `DEV-0006`
- 원래 요구사항: 실제 OIDC Authorization Code + PKCE 로그인, refresh rotation, `/api/v1/me`와 SecureStore process restart 검증
- 누락/연기 이유: adapter, backend resource server, local Keycloak와 redirect는 준비됐지만 합성 login user와 native end-to-end 실행을 아직 통합하지 않았다.
- 현재 영향: 없음. iOS와 물리 biometric edge case는 `GAP-0002`/`GAP-0003`에 분리돼 있다.
- 목표 Milestone: 2 / FE-0010
- 재확인 조건: local Keycloak login→callback→`/me`→process restart refresh→logout을 native build에서 통과
- 해결 DEV: FE-0010
- 검증: clean Compose 무인 PKCE/JWT/`/me`/refresh-only restart/logout smoke와 Android API 36 Development Build login→callback→OS fingerprint→`/me`, force-stop/restart→SecureStore refresh→`/me`, local logout→login screen을 통과했다.

### ISSUE-0007 — Developer audit correlation ID 미전파

- 상태: RESOLVED
- 심각도: LOW
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: BE-0010 final review
- 원래 영향 Milestone: 5 audit traceability
- 원래 내용: developer scenario/reset 감사 이벤트가 Fastify가 정규화한 실제 correlation ID 대신 고정 문자열을 저장했다.
- 해결 DEV: BE-0010
- 해결 내용: controller의 `x-correlation-id`를 developer service와 append-only audit event까지 전달했다.
- 검증: 실제 Fastify 요청에 지정한 scenario/reset correlation ID가 `DEV_SCENARIO_CHANGED` audit 호출에 그대로 전달되는 E2E assertion을 추가하고 platform/root 전체 gate를 통과했다.

### ISSUE-0006 — 동일 생성 시각 주문의 cursor pagination 누락

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: BE-0010 final review
- 원래 영향 Milestone: 5 order history
- 원래 내용: 주문 목록은 `(created_at DESC, id DESC)`로 정렬하지만 cursor 조건은 `created_at`만 비교해 같은 시각의 다음 주문을 건너뛸 수 있었다.
- 해결 DEV: BE-0010
- 해결 내용: cursor 조건도 `(created_at, id)` 복합 keyset 비교로 맞췄다.
- 검증: PostgreSQL에서 네 주문의 `created_at`을 동일하게 만든 뒤 2개씩 두 page를 조회해 네 ID가 중복·누락 없이 반환되는 integration test와 전체 gate를 통과했다.

### ISSUE-0005 — Body 없는 simulator reset POST의 JSON content-type

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: BE-0010 clean Compose smoke
- 원래 영향 Milestone: 5 developer reset
- 원래 내용: platform simulator admin adapter가 body 없는 reset POST에도 `Content-Type: application/json`을 강제해 Fastify가 400을 반환하고 platform이 500으로 변환했다.
- 해결 DEV: BE-0010
- 해결 내용: body가 있을 때만 JSON content-type을 보내도록 admin adapter와 smoke helper를 수정했다.
- 검증: actual HTTP adapter test가 bodyless header를 확인하고 clean Compose full flow의 마지막 platform `/api/v1/dev/dataset/reset` 200과 simulator NORMAL reset을 통과했다.

### GAP-0006 — 로컬 MVP 최소 Audit Event

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0007
- 원래 요구사항: MyData, simulation과 주문의 중요 행위를 trace ID와 allowlist metadata가 있는 append-only `finapp_audit.finapp_audit_event`로 기록
- 누락/연기 이유: schema namespace와 테이블 정의만 만들고 BE-0002~BE-0008의 vertical slice에는 audit migration/module/event 기록을 포함하지 않았다.
- 현재 영향: 없음. 추가 AUTH/security event 보강은 Milestone 6A 범위이며 로컬 MVP 주문 증거는 충족한다.
- 목표 Milestone: 5 / BE-0010
- 재확인 조건: 최소 `ORDER_CREATED`, `ORDER_SUBMITTED`, `ORDER_RECONCILED`, `ORDER_FILLED`와 핵심 sync/simulation event가 append-only transaction으로 저장되고 runtime UPDATE/DELETE 거부 및 redaction test가 통과
- 해결 DEV: BE-0010
- 검증: Testcontainers/Compose에서 MyData connection/sync, order created/submitted/reconciled/filled와 `DEV_SCENARIO_CHANGED` 4건을 확인했다. order audit은 settlement transaction에 포함되고 runtime audit/ledger UPDATE·DELETE는 모두 false다. metadata는 allowlist key만 허용한다.

### ISSUE-0004 — Expo SDK 57 patch compatibility drift

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: BE-0009 root verification
- 원래 영향 Milestone: 1 dependency gate, 2 mobile runtime
- 원래 내용: BE-0009 전체 `npm run verify`에서 Expo SDK 57의 expected patch가 갱신되어 `expo install --check`가 8개 package를 outdated로 판정했다.
- 해결 DEV: BE-0009
- 해결 내용: Node 24 workspace context에서 Expo가 요구한 SDK 57 compatible patch를 적용하고 `expo-secure-store` config plugin을 명시했다. `npm audit fix --force`는 사용하지 않았다.
- 검증: `expo install --check`와 root `npm run verify`가 통과했다. mobile 60, simulator 12, platform 51로 총 123 tests와 두 backend build가 성공했다. 첫 자동 수정 시도는 app directory가 시스템 Node 20.15를 선택해 engine guard에서 안전하게 실패했으며, root Node 24.19 workspace 명령으로 재실행했다.

### GAP-0005 — Simulator 로컬 MVP API와 장애 Scenario

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0007
- 원래 요구사항: simulator 시세, brokerage submit/status, `clientOrderId` 중복 방지, NORMAL/TIMEOUT/HTTP_500/MALFORMED_RESPONSE/ORDER_REJECT/ORDER_UNKNOWN_THEN_FILLED와 reset/reseed
- 누락/연기 이유: BE-0003은 MyData account/holding/transaction source와 seed에 집중했고 이후 platform 기능이 먼저 진행됐다.
- 현재 영향: 없음. platform settlement/reconciliation과 developer proxy는 BE-0010 범위에서 이 provider 계약을 소비한다.
- 목표 Milestone: 5 / BE-0009
- 재확인 조건: 실제 simulator HTTP에서 시세와 order submit/status, scenario 격리, duplicate clientOrderId, reset/reseed 멱등성과 production/public 차단을 자동 검증
- 해결 DEV: BE-0009
- 검증: canonical simulator operation 7개 추가, 실제 Fastify scenario E2E, production admin 404/no-mutation, PostgreSQL 10-way idempotency와 conflict/UNKNOWN→FILLED, clean Compose migration·seed 2회·400/201/200 replay·reset smoke를 통과했다.

### GAP-0004 — Controller·OpenAPI·Consumer 전체 계약 추적

- 상태: RESOLVED
- 심각도: MEDIUM
- 최초 발견: 2026-09-02
- 마지막 갱신: 2026-09-02
- 발견 DEV: DEV-0007
- 원래 요구사항: backend controller와 canonical OpenAPI 일치, 모든 frontend mock/API client의 schema 검증, 실제 provider/consumer contract smoke와 하위 호환성 감지
- 누락/연기 이유: 분리 단계에서 frontend는 health 계약에 고정된 반면 backend가 `/me`, MyData, wealth, simulation과 order 계약을 확장했다. DEV-0006 통합 gate는 OpenAPI lint와 health fixture 1건만 실행해 전체 operation 일치를 증명하지 못했다.
- 현재 영향: 없음. 신규 operation이나 controller route가 coverage/provider fixture 없이 추가되거나 기존 path/status/schema/property가 제거되면 `contract:check`가 실패한다.
- 목표 Milestone: 2~5 통합 전 / DEV-0010
- 재확인 조건: canonical operation 전체가 provider test와 consumer fixture/adapter 상태로 추적되고 주요 성공/ProblemDetails 응답이 schema 검증을 통과하며 호환되지 않는 계약 제거가 CI에서 실패함
- 해결 DEV: DEV-0010
- 검증: `contracts/operation-coverage.yaml`에서 platform 16개와 simulator 4개 operation의 controller/handler, provider test와 consumer 상태를 추적한다. 22개 registry fixture와 기존 mobile health fixture가 response schema를 통과했고 실제 Fastify provider test가 20개 성공 응답과 주요 400/401/403 ProblemDetails를 검증했다. `contract:check`는 controller/OpenAPI 양방향 route, response schema 존재와 compatibility baseline의 path/status/schema/property 제거를 검사한다.

### ISSUE-0001 — 로컬 Java 21 미준비

- 상태: RESOLVED
- 심각도: HIGH
- 최초 발견: 2026-09-01
- 마지막 갱신: 2026-09-01
- 발견 DEV: DEV-0001
- 원래 영향 Milestone: 0, 1~5 backend 개발
- 원래 내용: 최초 문서가 Java 21/Spring Boot backend를 잘못 전제했고 로컬 Java는 17이었다.
- 해결 DEV: DEV-0003
- 해결 내용: 사용자가 backend 기술을 Node.js + TypeScript와 NestJS/Fastify로 정정했다. Java toolchain 요구를 폐기하고 로컬 Node.js 24 LTS 환경을 기준으로 변경했다.
- 검증: `node --version`은 `v24.19.0`, `npm --version`은 `11.17.0`이며 Node.js 24는 2026-09-01 기준 LTS다.

## 새 Issue Template

```markdown
### ISSUE-#### — 제목

- 상태: OPEN
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 최초 발견: YYYY-MM-DD
- 마지막 갱신: YYYY-MM-DD
- 발견 DEV: DEV-####
- 영향 Milestone:
- 내용:
- 영향:
- 임시 우회:
- 해결 조건:
- 목표 DEV:
- 해결 DEV:
- 검증:
```
## 새 Gap Template

```markdown
### GAP-#### — 제목

- 상태: DEFERRED | UNVERIFIED
- 심각도: CRITICAL | HIGH | MEDIUM | LOW
- 최초 발견: YYYY-MM-DD
- 마지막 갱신: YYYY-MM-DD
- 발견 DEV: DEV-####
- 원래 요구사항:
- 누락/연기 이유:
- 현재 영향:
- 목표 Milestone:
- 재확인 조건:
- 해결 DEV:
- 검증:
```
