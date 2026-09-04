# 한화생명 PLUS WM 지원 경력기술서 요약

## 모바일 앱 프론트엔드

- 자산 통합 조회, WM 코치, 실제 KIS 국내 주식 시세, 목표 자산 시뮬레이션과 매수 흐름을 제공하는 금융 모바일 플랫폼 Wealth Flow를 설계·개발했습니다.
- React Native 0.86, TypeScript strict, Expo SDK 57 기반으로 iOS·Android 공통 feature와 플랫폼별 native project를 구성했습니다.
- Swift·Kotlin 네이티브 앱 개발에 능통하며, React Native 브리지와 네이티브 모듈을 직접 설계·작성하고 Expo native 설정과 연동할 수 있습니다.
- route·feature·shared 계층을 분리한 feature-first 아키텍처를 적용하고 deep import, 역방향 의존성과 순환 참조를 자동 검사했습니다.
- TanStack Query는 서버 상태와 캐시·polling·invalidation을, Zustand는 화면 초안·앱 잠금·개인정보 표시 상태를 담당하도록 소유권을 분리했습니다.
- Expo Router의 Root Stack과 Bottom Tabs를 결합해 주 탐색과 집중 작업 흐름을 분리하고, 동적 route·OIDC callback·lazy mount·최초 방문 skeleton·탭 스크롤 복귀를 구현했습니다.
- Route Adapter가 navigation callback만 feature 화면에 전달하도록 구성해 화면을 Router로부터 분리하고 독립적인 component test가 가능하게 했습니다.
- 디자인 토큰과 공통 컴포넌트로 웹·모바일의 색상·간격·타이포그래피·레이아웃·인터랙션 규칙을 표준화하고 safe area·접근성·모션 감소 설정을 반영했습니다.
- 아키텍처·API 계약·디자인 시스템·품질 gate를 개발 표준으로 문서화하고 코드 리뷰와 디자이너 시안 구현 협업에 활용할 수 있는 기준을 수립했습니다.
- OAuth2/OIDC Authorization Code + PKCE를 적용하고 access token은 메모리, refresh token은 SecureStore의 Keychain·Keystore-backed 영역에 보관했습니다.
- 동시 401 요청의 single-flight token refresh, 안전한 조회 요청의 1회 replay, 세션 종료 시 사용자 Query cache 제거까지 재인증 흐름을 구성했습니다.
- LocalAuthentication을 port와 adapter로 격리해 Face ID·지문 기반 앱 잠금과 주문 전 생체인증을 구현하고 background 60초 경과 시 재인증하도록 설계했습니다.
- 알림·사진·카메라 native 권한을 순차 처리하고 OS 상태, 사용자 선택과 재실행 여부를 반영하는 온보딩 흐름을 구현했습니다.
- 증권사의 실제 API를 연동하여 해당 데이터를 기반으로 Victory Native·Skia·Reanimated를 활용한 기간별 차트와 gesture tooltip을 구현했습니다.
- 시계열 memoization, symbol·interval별 Query cache, Reanimated shared value와 reduced-motion 분기를 적용해 차트 렌더링과 상호작용을 최적화했습니다.
- 합성 자산과 투자 성향을 순수 TypeScript 규칙으로 결합한 WM 코치, 성향 변경, 동일 배분 기반 simulation과 상담·알림 흐름을 구현했습니다.
- 주문 preview·quote 만료·생체인증·Idempotency Key·UNKNOWN polling 복구를 연결하고 OpenAPI 38개 operation과 41개 fixture, 모바일 209개 테스트를 CI 품질 기준으로 운영했습니다.

## 서버·플랫폼 이해도 — 선택 기재

- Node.js 24와 TypeScript, NestJS·Fastify 기반 Platform API를 feature module 중심의 모듈형 모놀리스와 ports/adapters 구조로 설계했습니다.
- 자산·성향·시뮬레이션·주문 REST API를 OpenAPI로 정의하고 모바일 runtime mapper·contract mock·실제 provider의 호환성을 자동 검증했습니다.
- PostgreSQL 17과 Drizzle ORM을 사용해 서비스별 schema·role·migration을 분리하고 금융 금액, 주문과 체결의 트랜잭션 정합성을 구성했습니다.
- Keycloak OAuth2·OIDC, JWKS 기반 JWT 검증, scope·사용자 소유권 검사와 세션 체계를 모바일 인증 흐름에 연결했습니다.
- Institution Simulator와 KIS 시세 adapter를 HTTP port로 분리하고 timeout, circuit breaker와 안정적인 오류 변환을 적용했습니다.
- MyData sync, UNKNOWN 주문 reconciliation과 transactional outbox를 PostgreSQL durable job, lease·backoff·`SKIP LOCKED` 방식으로 구현했습니다.
- AES-256-GCM envelope encryption, AWS KMS adapter, append-only audit·security event와 민감정보 비노출 structured log를 구성했습니다.
- Vitest·Testcontainers, Docker Compose와 GitHub Actions로 API·DB·동시성·보안·계약 검증을 자동화했습니다.

별첨: `HANWHA_LIFE_PLUS_WM_MOBILE_FRONTEND_PORTFOLIO.md`
