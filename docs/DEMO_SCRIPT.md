# 3분 Local Demo Script

- 대상: 기술 포트폴리오 리뷰
- 전제: `make acceptance-test` 통과 후 local stack과 Development Build가 실행 중임
- 데이터: 모든 사용자·계좌·금액·시세는 합성 데이터

## 사전 준비

```bash
make acceptance-test
```

성공 JSON에서 `acceptance: passed`, `scenarioSteps: 12`, `remoteResourcesUsed: false`를 확인한다. 데모 중에는 `.env`, token, full synthetic identifier나 DB credential을 화면에 노출하지 않는다.

## 0:00–0:30 — 제품과 신뢰 경계

1. 로그인 화면의 synthetic data 안내를 보여준다.
2. “실제 금융 앱이 아니라 모바일–API–DB–외부기관 경계를 재현한 샌드박스”라고 설명한다.
3. Keycloak PKCE 로그인 후 App Lock을 해제하고 `/me` 기반 화면으로 진입한다.

설명 포인트: access token은 메모리, refresh token은 SecureStore에 두며 backend가 issuer/audience/scope를 검증한다.

## 0:30–1:10 — MyData sync와 Dashboard

1. Settings/연결 화면에서 합성 기관 `SYNTH_WEALTH_001`을 연결한다.
2. sync를 실행하고 진행 상태가 완료되는 것을 보여준다.
3. Dashboard 총자산·추이·배분, Accounts의 masked identifier와 holdings를 연다.
4. 금액 숨기기를 켜 차트 accessibility label까지 함께 가려지는 것을 보여준다.

설명 포인트: platform은 simulator를 HTTP로 호출하고 immutable raw와 processing result를 저장한 뒤 normalized wealth를 갱신한다. 모바일은 DB/simulator에 직접 연결하지 않는다.

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

- canonical 35 operations/38 fixtures, 189 automated tests와 두 backend production image runtime audit 0
- runtime DB role의 네 query가 expected `finapp_` index를 사용
- local 합성 환경만 검증했으며 실제 AWS KMS, 원격 DB/HTTPS/EAS, iOS·물리 biometric은 아직 검증하지 않음
- root moderate dependency advisory 18건은 열린 위험으로 유지하며 security-clean을 주장하지 않음

마지막으로 Settings에서 logout해 session과 Query cache가 제거되고 로그인 화면으로 돌아가는 것을 보여준다.
