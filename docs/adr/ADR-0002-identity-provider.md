# ADR-0002: Identity Provider와 모바일 인증

- 상태: Accepted
- 날짜: 2026-09-01

## Context

직접 만든 JWT 로그인은 OIDC, PKCE, token lifecycle과 Resource Server 경계를 증명하지 못한다. 모바일은 client secret을 안전하게 보관할 수 없는 public client다.

## Decision

- local과 demo 환경의 IdP는 Keycloak 26.7.3이다.
- 모바일은 Authorization Code Flow와 PKCE S256을 사용한다.
- 모바일 client에는 client secret을 두지 않는다.
- platform-api는 NestJS auth guard와 OIDC/JWKS adapter로 JWT signature, issuer, audience, expiration과 scope를 검증한다.
- access token은 메모리에만 보관한다.
- refresh token은 Expo SecureStore에 보관한다.
- LocalAuthentication은 앱 잠금과 주문 전 local gate이며 서버 MFA라고 표현하지 않는다.
- OIDC `sub`와 내부 사용자 UUID를 mapping table로 연결한다.

## Consequences

- Keycloak realm export와 redirect URI 관리가 필요하다.
- Expo Go로 OIDC redirect와 Face ID 완료 검증을 하지 않는다. Development Build가 필요하다.
- remote Keycloak 자원이 부족하면 Milestone 6에서 측정 결과와 별도 ADR을 근거로 관리형 IdP를 검토한다.
