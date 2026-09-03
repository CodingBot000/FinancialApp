# Environment File Guide

이 문서는 clone 후 각 실행 영역의 환경변수 경계를 확인하기 위한 안내다. 저장소에 커밋된 `*.env.local` 파일은 모두 무해한 템플릿이며 실제 비밀번호, token, private key, AWS credential을 넣지 않는다.

## 파일 배치

| 파일 | 용도 | 실제 값 |
|---|---|---|
| `.env.local` | root에서 backend/migration 변수 전체를 확인하는 참고 템플릿 | 로컬 shell 또는 별도 ignored secret file로 주입 |
| `apps/mobile/.env.local` | Expo 공개 설정 | `EXPO_PUBLIC_*`만 허용; secret 금지 |
| `services/platform-api/.env.local` | Platform API와 Drizzle migration 변수 | local process에만 주입 |
| `services/institution-simulator/.env.local` | Simulator와 Drizzle migration 변수 | local process에만 주입 |
| `infra/docker/.env.local` | Compose 변수 참고 템플릿 | 실제 local Compose는 `infra/docker/.env` 사용 |
| `infra/remote/.env.local` | Lightsail/demo migration 변수 참고 템플릿 | Stage 11 별도 승인 전에는 복사·수정·사용 금지 |

## 변수 소유권

- `PLATFORM_DATABASE_URL`: platform runtime role의 DML 연결
- `SIMULATOR_DATABASE_URL`: simulator runtime role의 DML 연결
- `PLATFORM_MIGRATION_DATABASE_URL`: platform Drizzle migration CLI가 읽는 DDL 연결
- `SIMULATOR_MIGRATION_DATABASE_URL`: simulator Drizzle migration CLI가 읽는 DDL 연결
- `EXPO_PUBLIC_*`: 앱 번들에 들어갈 수 있는 공개 설정이다. DB URL, password, private key, production token과 AWS secret은 절대 넣지 않는다.
- `EXPO_PUBLIC_LOGIN_MODE=test`와 `EXPO_PUBLIC_LOCAL_TEST_ACCESS_TOKEN`은 local development build에서만 사용하는 명시적 테스트 로그인 설정이다. demo/production에서는 사용하지 않는다.
- 생체인증 adapter 선택에는 Expo public 환경변수를 사용하지 않는다. physical 여부는
  `expo-device` runtime 결과로 판별한다.
- `AWS_REGION`, `AWS_KMS_*`: remote/demo KMS 경계용 설정이다. 실제 credential은 파일 대신 workload identity/secret store를 사용한다.
- `AWS_KMS_KEY_VERSION`: KMS로 생성된 envelope의 논리적 key version이다. 미지정 시 backend는 `kms-v1`을 사용하며, rotation 시 새 값을 명시한다.

현재 migration CLI는 `.env.local` 파일을 자동으로 읽지 않고 process environment에서 값을 읽는다. 따라서 승인된 환경에서만 검토된 secret loader 또는 shell export를 사용해 주입한다. `source`로 임의의 untrusted 파일을 실행하지 않는다.

## 로컬 설정

```bash
cp infra/docker/.env.example infra/docker/.env
cp apps/mobile/.env.example apps/mobile/.env
```

`.env.local` 템플릿은 clone 후 구조 확인용이다. 로컬 Compose는 `infra/docker/.env`를 사용하며, 해당 파일은 Git에 커밋하지 않는다.

## Remote/demo migration 경계

`infra/remote/.env.local`에는 Lightsail endpoint와 credential의 자리만 정의되어 있다. 실제 값은 사용자가 Stage 11을 새로 승인하고 backup/snapshot, TLS, role, `finapp_` catalog와 rollback 절차를 확인한 뒤에만 별도 secret store 또는 ignored local file에서 주입한다.

이번 실행에서는 remote 파일에 실제 값을 넣지 않았고 AWS endpoint, credential, catalog, migration, seed, deploy를 실행하지 않았다. 과거 remote migration 승인은 재사용하지 않는다.

## 점검

```bash
npm run security:secrets
git status --short
```

템플릿의 placeholder는 secret scan에서 허용되지만 실제 값으로 바꾼 파일은 커밋하지 않는다. 특히 `EXPO_PUBLIC_` 변수는 Expo 번들에 정적으로 포함될 수 있으므로 공개 값만 사용한다.
