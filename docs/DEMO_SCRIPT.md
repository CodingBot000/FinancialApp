# 3분 Local Demo Script

- 대상: 기술 포트폴리오 리뷰
- 전제: mobile verify 통과 후 Development Build가 실행 중임. backend 증거를 함께
  보여줄 때는 `make acceptance-test`도 통과한 상태여야 함
- 데이터: 모든 사용자·계좌·금액·시세는 합성 데이터

## 사전 준비

```bash
make acceptance-test
```

성공 JSON에서 `acceptance: passed`, `scenarioSteps: 12`, `remoteResourcesUsed: false`를 확인한다. 데모 중에는 `.env`, token, full synthetic identifier나 DB credential을 화면에 노출하지 않는다.

## 0:00–0:30 — 포트폴리오 진입과 신뢰 경계

1. 최초 실행에서 소개 화면, 본인인증 UI와 간편비밀번호 확인을 빠르게 보여준다.
2. 접근 권한 안내 확인 뒤 OS 알림·사진·카메라 선택 권한 요청을 보여준다. 거부해도
   다음 단계로 진행하며 재실행에는 다시 요청하지 않는다고 설명한다.
3. 실기기에서는 OS Face ID/지문, emulator에서는 테스트 gate가 선택된다고 설명한다.
4. 생체인증 성공 뒤 OIDC 설정 화면 없이 contract mock Home으로 진입한다.
5. 앱을 다시 실행해 onboarding/PIN을 생략하고 생체인증 뒤 Home으로 돌아오는 흐름을
   보여준다.

설명 포인트: SecureStore에는 setup 완료 marker만 저장하고 현재 unlock은 메모리에만
둔다. 포트폴리오 접근은 OIDC/MFA가 아니며 생체정보는 앱이나 서버에 저장되지 않는다.
실제 OIDC의 access token memory/refresh token SecureStore 경계는 별도 구현과 테스트로
보존돼 있다.

## 0:30–1:10 — MyData sync와 Dashboard

1. Settings/연결 화면에서 합성 기관 `SYNTH_WEALTH_001`을 연결한다.
2. sync를 실행하고 진행 상태가 완료되는 것을 보여준다.
3. Dashboard 총자산·추이·배분, Accounts의 masked identifier와 holdings를 연다.
4. 금액 숨기기를 켜 차트 accessibility label까지 함께 가려지는 것을 보여준다.

설명 포인트: 기본 포트폴리오 화면은 backend 연결에 의해 시연이 막히지 않도록 contract
mock 데이터를 사용한다. 실제 platform–simulator–PostgreSQL 흐름은 별도 local
acceptance 결과로 보여주며 모바일은 DB/simulator에 직접 연결하지 않는다.

## 1:10–1:40 — 서버 시뮬레이션

1. Simulation에서 기간·월 납입액을 입력한다.
2. 결과의 goal probability, p10/p50/p90 13-point chart와 engine/assumption version을 보여준다.
3. 결과가 투자 추천이나 수익 보장이 아니라 합성 가정임을 표시한 disclaimer를 짚는다.

설명 포인트: draft만 client state에 있고 계산 결과는 서버가 deterministic하게 저장·재조회한다.

## 1:40–2:25 — 안전한 BUY와 UNKNOWN 복구

1. holding에서 BUY preview를 열어 가격·만료·예상 금액을 확인한다.
2. 주문 직전 biometric gate를 통과하고 NORMAL 주문이 FILLED 되는 것을 보여준다.
3. local developer panel에서 `ORDER_UNKNOWN_THEN_FILLED`를 선택한다.
4. 두 번째 주문이 UNKNOWN으로 표시된 뒤 order GET polling/reconciliation으로 FILLED 되는 것을 보여준다.

설명 포인트: 현금 예약 후 simulator order POST는 한 번만 보낸다. 불명확한 응답은 POST retry가 아니라 GET status와 DB reconciliation으로 복구하며, idempotency key는 중복 주문을 막는다.

## 2:25–3:00 — 검증 증거와 한계

터미널에서 다음의 마지막 결과만 보여준다.

```bash
make performance-test
git status --short --branch
```

설명 포인트:

- canonical 38 operations/41 fixtures, 현재 root verify의 mobile 136/simulator 12/platform
  96 총 244 tests와 두 backend build
- runtime DB role의 네 query가 expected `finapp_` index를 사용
- Android Emulator의 portfolio first/relaunch flow는 검증했으며 실제 AWS KMS, 원격
  DB/HTTPS/EAS와 iOS·물리 biometric은 아직 검증하지 않음
- root moderate dependency advisory 18건은 열린 위험으로 유지하며 security-clean을 주장하지 않음

마지막으로 Settings의 `포트폴리오 처음부터 보기`로 launch marker와 Query cache를
초기화하고 첫 소개 화면으로 돌아가는 것을 보여준다.
