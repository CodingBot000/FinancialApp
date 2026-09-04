# Google Cloud 배포 가이드

- 대상: Wealth Sandbox 포트폴리오 데모
- 현재 사용 프로젝트: nexuslink-490118
- 현재 리전: asia-northeast3
- 데이터 성격: 합성 금융 데이터
- 보안 원칙: 이 문서에는 비밀번호, 토큰, DB 접속 문자열, 인증 코드, 암호화 키의 실제 값을 기록하지 않는다.

이 문서는 Google Cloud Run, Cloud SQL for PostgreSQL, Artifact Registry, Cloud Build와
Secret Manager를 사용해 이 프로젝트를 배포한 과정과 재배포 절차를 정리한 공개 문서다.
실제 서비스 운영을 위한 보안·규제·가용성 기준을 충족한다는 의미는 아니다.

## 1. 배포 아키텍처

~~~mermaid
flowchart LR
    M[Android arm64-v8a APK]
    A[Cloud Run<br/>finapp-platform-api]
    S[Cloud Run<br/>finapp-institution-sim]
    D[(Cloud SQL<br/>PostgreSQL 17)]
    R[Artifact Registry]
    B[Cloud Build]
    V[Secret Manager]

    M -->|HTTPS + test bearer token| A
    A --> D
    A -->|합성 기관 API| S
    S --> D
    B --> R
    R --> A
    R --> S
    V -. 비밀값 주입 .-> A
    V -. 비밀값 주입 .-> S
~~~

역할은 다음처럼 나눈다.

- 모바일 앱은 PostgreSQL에 직접 연결하지 않고 Platform API만 호출한다.
- finapp-platform-api는 사용자·자산·시장·주문 API를 제공한다.
- finapp-institution-sim은 실제 금융기관 대신 합성 MyData와 주문 결과를 제공한다.
- Cloud SQL은 두 서버가 공유하지만 DB role과 schema 권한으로 접근 범위를 나눈다.
- Artifact Registry는 컨테이너 이미지를 저장하고 Cloud Run이 해당 이미지를 실행한다.
- Secret Manager는 DB 접속 정보와 서버용 키를 보관하며 Git에는 값을 저장하지 않는다.

## 2. 실제로 만든 Google Cloud 리소스

아래 이름은 리소스 식별을 위한 공개 가능한 메타데이터다. Secret Manager의 값은 기록하지 않는다.

| 리소스 | 이름 | 용도 |
|---|---|---|
| Cloud Run service | finapp-platform-api | 모바일이 호출하는 Platform API |
| Cloud Run service | finapp-institution-sim | 합성 금융기관 simulator |
| Cloud Run job | finapp-platform-migrate | Platform API DB migration |
| Cloud Run job | finapp-platform-market-seed | 로컬 합성 종목 카탈로그 seed |
| Cloud Run job | finapp-simulator-migrate | simulator DB migration |
| Cloud Run job | finapp-simulator-seed | 합성 계좌·보유자산 seed |
| Cloud SQL instance | finapp-db | PostgreSQL 17 인스턴스 |
| Cloud SQL database | financial_app | 애플리케이션 데이터베이스 |
| Artifact Registry repository | finapp | Docker 이미지 저장소 |

현재 포트폴리오 데모 API 주소:

~~~text
https://finapp-platform-api-664672006821.asia-northeast3.run.app
~~~

Cloud Run은 별도의 a.run.app canonical URL도 표시할 수 있다. 앱과 수동 점검은
동일하게 응답하는 서비스 URL 하나를 일관되게 사용한다.

### 2.1 Secret Manager 리소스명

아래는 값이 아니라 Secret Manager 항목명만 기록한 것이다.

| Secret Manager 항목명 | 주입 대상 | 설명 |
|---|---|---|
| finapp-platform-database-url | Platform API | runtime DB role 접속 정보 |
| finapp-platform-migration-url | migration job | migration 전용 DB role 접속 정보 |
| finapp-simulator-database-url | simulator | simulator runtime DB role 접속 정보 |
| finapp-local-test-token | Platform API | 포트폴리오 데모 테스트 토큰 |
| finapp-mydata-key | Platform API | 합성 MyData 암호화 키 |
| finapp-security-event-hash-key | Platform API | 보안 이벤트 해시 키 |

값을 확인하거나 문서·로그·커밋에 복사하지 않는다. Secret Manager와 Cloud Run secret
reference만 사용한다.

## 3. 환경과 보안 경계

### 3.1 공개 설정

모바일 번들에 들어갈 수 있는 값은 공개 정보로 취급한다.

~~~dotenv
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_PLATFORM_API_MODE=http
EXPO_PUBLIC_PLATFORM_API_URL=https://<CLOUD_RUN_PLATFORM_API_HOST>
EXPO_PUBLIC_LOGIN_MODE=test
EXPO_PUBLIC_LOCAL_TEST_ACCESS_TOKEN=<LOCAL_TEST_ACCESS_TOKEN>
~~~

<LOCAL_TEST_ACCESS_TOKEN>은 자리표시자다. 실제 토큰·DB URL·비밀번호·private key를
EXPO_PUBLIC_*에 넣지 않는다. Expo 환경변수는 릴리스 JS 번들에 포함될 수 있다.

### 3.2 서버 비밀정보

다음 종류의 값은 Secret Manager에만 둔다.

- PostgreSQL role password와 전체 DB connection URL
- 테스트 bearer token의 실제 값
- MyData 암호화 키
- security event HMAC/hash 키
- OIDC, KIS 등 외부 provider credential
- Cloud SQL, Cloud Run, Google 계정의 인증 credential

Cloud Run runtime service account에는 필요한 최소 권한만 부여한다.

~~~text
roles/cloudsql.client
roles/secretmanager.secretAccessor
~~~

서비스는 포트폴리오 시연 편의를 위해 unauthenticated 호출을 허용할 수 있지만, 실제
서비스에서는 Cloud Run IAM 또는 별도 API gateway/auth 정책으로 제한해야 한다.

## 4. 사전 준비

아래 명령은 예시이며 <...> 부분은 실제 실행 환경에서만 입력한다. 실제 비밀번호나
토큰을 명령어에 직접 적지 않는다.

~~~bash
PROJECT_ID=<GCP_PROJECT_ID>
REGION=asia-northeast3
REPOSITORY=finapp
SQL_INSTANCE=finapp-db
SQL_DATABASE=financial_app

gcloud auth login
gcloud config set project $PROJECT_ID

gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com secretmanager.googleapis
~~~

Artifact Registry Docker repository는 한 번만 만든다.

~~~bash
gcloud artifacts repositories create $REPOSITORY --repository-format=docker --location=$REGION --description="Wealth Sandbox container images"
~~~

## 5. Cloud SQL PostgreSQL 생성

Cloud SQL은 Cloud Run과 달리 요청이 없을 때 자동으로 0원 상태가 되지 않는다. 인스턴스
생성은 과금이 시작될 수 있으므로 포트폴리오 시연에 필요한 기간을 확인한 뒤 실행한다.

~~~bash
gcloud sql instances create $SQL_INSTANCE --database-version=POSTGRES_17 --edition=ENTERPRISE --tier=db-custom-1-3840 --storage-type=SSD --storage-size=10GB --region=$REGION
gcloud sql databases create $SQL_DATABASE --instance=$SQL_INSTANCE
~~~

애플리케이션 role과 migration role은 분리한다. 비밀번호는 터미널에서 숨겨 입력하고
Git, 문서, shell history, 로그에 남기지 않는다.

~~~bash
read -s PLATFORM_DB_PASSWORD
gcloud sql users create financial_platform_app --instance=$SQL_INSTANCE --password=$PLATFORM_DB_PASSWORD
unset PLATFORM_DB_PASSWORD

read -s SIMULATOR_DB_PASSWORD
gcloud sql users create financial_simulator_app --instance=$SQL_INSTANCE --password=$SIMULATOR_DB_PASSWORD
unset SIMULATOR_DB_PASSWORD

read -s MIGRATION_DB_PASSWORD
gcloud sql users create financial_migration --instance=$SQL_INSTANCE --password=$MIGRATION_DB_PASSWORD
unset MIGRATION_DB_PASSWORD
~~~

## 6. Secret Manager 등록

Secret Manager 항목은 목적별로 만들고, 값은 별도의 안전한 입력 경로에서 추가한다.

~~~bash
for SECRET_NAME in finapp-platform-database-url finapp-platform-migration-url finapp-simulator-database-url finapp-local-test-token finapp-mydata-key finapp-security-event-hash-key; do
  gcloud secrets create $SECRET_NAME --replication-policy=automatic
done
~~~

값을 추가할 때는 저장소 밖의 검토된 secret file만 사용한다.

~~~bash
gcloud secrets versions add <SECRET_NAME> --data-file=<CONTROLLED_SECRET_FILE>
~~~

CONTROLLED_SECRET_FILE을 프로젝트 폴더에 만들거나 커밋하지 않는다. 생성·주입된
실제 값은 이 문서에 남기지 않는다.

## 7. 컨테이너 이미지 빌드

Dockerfile 위치:

~~~text
infra/docker/platform-api.Dockerfile
infra/docker/institution-simulator.Dockerfile
~~~

Cloud Build는 로컬 Docker daemon 대신 원격 builder에서 이미지를 만든다. Dockerfile이
하위 디렉터리에 있으므로 config 방식으로 명시한다. 아래 YAML은 임시 파일 예시이며
실제 secret이나 credential을 포함하지 않는다.

~~~yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -f
      - infra/docker/platform-api.Dockerfile
      - -t
      - REGION-docker.pkg.dev/GCP_PROJECT_ID/REPOSITORY/platform-api:COMMIT_SHA
      - .
images:
  - REGION-docker.pkg.dev/GCP_PROJECT_ID/REPOSITORY/platform-api:COMMIT_SHA
~~~

실행 예시:

~~~bash
IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/platform-api:COMMIT_SHA
gcloud builds submit . --project=$PROJECT_ID --region=$REGION --config=<CLOUDBUILD_CONFIG_FILE>
~~~

이미지 tag에는 배포 소스의 Git commit SHA를 사용하면 Cloud Run revision과 소스를
추적하기 쉽다. 이미지 digest와 Cloud Build ID도 배포 기록에 함께 남긴다.

## 8. Cloud Run 배포

이미지 빌드가 성공한 뒤 Platform API를 배포한다.

~~~bash
gcloud run deploy finapp-platform-api --image=$IMAGE --region=$REGION --quiet
~~~

최초 배포 또는 설정을 재구성할 때 필요한 연결 예시:

~~~bash
gcloud run deploy finapp-platform-api --image=$IMAGE --region=$REGION --port=8080 --allow-unauthenticated --add-cloudsql-instances=<CLOUD_SQL_CONNECTION_NAME> --set-env-vars="APP_ENV=local,MARKET_DATA_PROVIDER=LOCAL,FINAPP_DATASET_VERSION=FINANCIAL_APP_DATASET_V1,MYDATA_SCHEDULER_ENABLED=false,ORDER_RECONCILIATION_ENABLED=false,OUTBOX_PUBLISHER_ENABLED=false" --set-secrets="PLATFORM_DATABASE_URL=<PLATFORM_DATABASE_SECRET>:latest,FINAPP_LOCAL_TEST_ACCESS_TOKEN=<TEST_TOKEN_SECRET>:latest,FINAPP_MYDATA_ENCRYPTION_KEY_BASE64=<MYDATA_KEY_SECRET>:latest,FINAPP_SECURITY_EVENT_HASH_KEY_BASE64=<SECURITY_HASH_KEY_SECRET>:latest" --quiet
~~~

set-secrets 오른쪽에는 값이 아니라 Secret Manager 항목명만 넣는다. 기존 설정을
보존해야 할 때는 update-env-vars, update-secrets 사용 여부를 확인한다.

simulator도 별도 이미지와 service로 배포한다. Platform API의
INSTITUTION_SIMULATOR_BASE_URL에는 simulator의 HTTPS Cloud Run URL을 사용한다.

~~~bash
gcloud run deploy finapp-institution-sim --image=<SIMULATOR_IMAGE> --region=$REGION --port=8080 --allow-unauthenticated --add-cloudsql-instances=<CLOUD_SQL_CONNECTION_NAME> --set-env-vars="APP_ENV=local,FINAPP_DATASET_VERSION=FINANCIAL_APP_DATASET_V1" --set-secrets="SIMULATOR_DATABASE_URL=<SIMULATOR_DATABASE_SECRET>:latest" --quiet
~~~

## 9. Migration과 seed 순서

Cloud Run job은 service container와 같은 이미지를 사용하되 실행 command만 바꾼다.

### 9.1 Platform migration

~~~bash
gcloud run jobs create finapp-platform-migrate --image=$IMAGE --region=$REGION --command=node --args=services/platform-api/dist/database/migrate-cli.js --set-cloudsql-instances=<CLOUD_SQL_CONNECTION_NAME> --set-secrets="PLATFORM_MIGRATION_DATABASE_URL=<PLATFORM_MIGRATION_SECRET>:latest" --max-retries=1 --task-timeout=10m --quiet
gcloud run jobs execute finapp-platform-migrate --region=$REGION --wait --quiet
~~~

### 9.2 Runtime role 권한

migration role이 schema와 table을 만들기 때문에 runtime role에 schema USAGE, table
DML, sequence 권한을 명시한다. 이 SQL에는 비밀정보가 없다.

~~~sql
GRANT USAGE ON SCHEMA "finapp_identity", "finapp_mydata", "finapp_wealth", "finapp_simulation", "finapp_trading", "finapp_audit", "finapp_crypto", "finapp_market" TO financial_platform_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "finapp_identity", "finapp_mydata", "finapp_wealth", "finapp_simulation", "finapp_trading", "finapp_audit", "finapp_crypto", "finapp_market" TO financial_platform_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA "finapp_identity", "finapp_mydata", "finapp_wealth", "finapp_simulation", "finapp_trading", "finapp_audit", "finapp_crypto", "finapp_market" TO financial_platform_app;

GRANT USAGE ON SCHEMA "finapp_simulator" TO financial_simulator_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "finapp_simulator" TO financial_simulator_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA "finapp_simulator" TO financial_simulator_app;

ALTER DEFAULT PRIVILEGES FOR ROLE financial_migration IN SCHEMA "finapp_identity", "finapp_mydata", "finapp_wealth", "finapp_simulation", "finapp_trading", "finapp_audit", "finapp_crypto", "finapp_market" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO financial_platform_app;
ALTER DEFAULT PRIVILEGES FOR ROLE financial_migration IN SCHEMA "finapp_identity", "finapp_mydata", "finapp_wealth", "finapp_simulation", "finapp_trading", "finapp_audit", "finapp_crypto", "finapp_market" GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO financial_platform_app;
ALTER DEFAULT PRIVILEGES FOR ROLE financial_migration IN SCHEMA "finapp_simulator" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO financial_simulator_app;
ALTER DEFAULT PRIVILEGES FOR ROLE financial_migration IN SCHEMA "finapp_simulator" GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO financial_simulator_app;
~~~

권한 SQL을 실행할 때도 DB password는 Secret Manager 또는 숨겨진 입력으로만 제공한다.

### 9.3 Market catalog seed

검색 API는 catalog table에 종목이 있어야 결과를 반환한다. Platform migration만 실행하면
종목 목록은 비어 있으므로 local provider seed를 한 번 실행한다.

~~~bash
gcloud run jobs create finapp-platform-market-seed --image=$IMAGE --region=$REGION --command=node --args=services/platform-api/dist/modules/market/market-seed-cli.js --set-cloudsql-instances=<CLOUD_SQL_CONNECTION_NAME> --set-env-vars=MARKET_DATA_PROVIDER=LOCAL --set-secrets="PLATFORM_DATABASE_URL=<PLATFORM_DATABASE_SECRET>:latest" --max-retries=1 --task-timeout=10m --quiet
gcloud run jobs execute finapp-platform-market-seed --region=$REGION --wait --quiet
~~~

현재 local catalog에는 삼성전자, SK하이닉스, NAVER, 현대차, 카카오,
LG에너지솔루션 등의 합성 종목이 들어간다.

### 9.4 Simulator migration과 seed

simulator도 같은 Cloud SQL instance를 사용하지만 별도 migration/seed job을 사용한다.

~~~bash
gcloud run jobs create finapp-simulator-migrate --image=<SIMULATOR_IMAGE> --region=$REGION --command=node --args=services/institution-simulator/dist/database/migrate-cli.js --set-cloudsql-instances=<CLOUD_SQL_CONNECTION_NAME> --set-secrets="SIMULATOR_MIGRATION_DATABASE_URL=<SIMULATOR_MIGRATION_SECRET>:latest" --max-retries=1 --task-timeout=10m --quiet
gcloud run jobs execute finapp-simulator-migrate --region=$REGION --wait --quiet

gcloud run jobs create finapp-simulator-seed --image=<SIMULATOR_IMAGE> --region=$REGION --command=node --args=services/institution-simulator/dist/database/seed-cli.js --set-cloudsql-instances=<CLOUD_SQL_CONNECTION_NAME> --set-secrets="SIMULATOR_DATABASE_URL=<SIMULATOR_DATABASE_SECRET>:latest" --max-retries=1 --task-timeout=10m --quiet
gcloud run jobs execute finapp-simulator-seed --region=$REGION --wait --quiet
~~~

이미 존재하는 job은 create 대신 update 또는 재실행을 사용한다.

## 10. 배포 검증

### 10.1 공개 상태와 revision

~~~bash
gcloud run services describe finapp-platform-api --region=$REGION --format='value(status.url,status.latestReadyRevisionName,spec.template.spec.containers[0].image)'
gcloud run services get-iam-policy finapp-platform-api --region=$REGION --format='value(bindings.members)'
~~~

포트폴리오 데모에서만 allUsers와 100% traffic routing을 허용한다. 실제 서비스는
인증된 호출 주체와 필요한 ingress 정책을 별도로 설정한다.

### 10.2 API smoke check

실제 token 값은 <REDACTED_TEST_TOKEN> 자리에 로컬에서만 제공한다. 값을 출력하거나
문서에 붙여넣지 않는다.

~~~bash
API_URL=https://<CLOUD_RUN_PLATFORM_API_HOST>
DEMO_TOKEN=<REDACTED_TEST_TOKEN>

curl --fail-with-body $API_URL/api/v1/health
curl --fail-with-body $API_URL/api/v1/health/ready
curl --fail-with-body -H "Authorization: Bearer $DEMO_TOKEN" $API_URL/api/v1/me
curl --fail-with-body -H "Authorization: Bearer $DEMO_TOKEN" $API_URL/api/v1/assets/summary
curl --fail-with-body -H "Authorization: Bearer $DEMO_TOKEN" "$API_URL/api/v1/market/stocks?q=005930&limit=30"
curl --fail-with-body -H "Authorization: Bearer $DEMO_TOKEN" $API_URL/api/v1/market/stocks/005930/quote
unset DEMO_TOKEN
~~~

정상 기준:

- /api/v1/health: 200, status=ok
- /api/v1/health/ready: 200, database=up
- /api/v1/me: 합성 테스트 사용자 응답
- /api/v1/assets/summary: 합성 자산 요약 응답
- 시장 검색: 005930 또는 삼성 조회 시 삼성전자 응답
- 현재가: LOCAL provider의 합성 시세 응답

## 11. Android 릴리스 APK

현재 앱은 Expo Router 기반의 독립 릴리스 APK다. JS bundle이 APK 안에 포함되므로
Metro 개발 서버가 필요하지 않다.

~~~bash
cd apps/mobile/android
ANDROID_HOME=<ANDROID_SDK_PATH> ANDROID_SDK_ROOT=<ANDROID_SDK_PATH> ./gradlew assembleRelease --rerun-tasks -PreactNativeArchitectures=arm64-v8a --no-daemon
~~~

생성 파일:

~~~text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
~~~

포트폴리오 산출물로 복사:

~~~bash
cp apps/mobile/android/app/build/outputs/apk/release/app-release.apk artifacts/wealth-flow-arm64-v8a-release.apk
~~~

### 11.1 ABI와 서명 확인

~~~bash
APK=artifacts/wealth-flow-arm64-v8a-release.apk
<ANDROID_BUILD_TOOLS>/aapt dump badging $APK
<ANDROID_BUILD_TOOLS>/apksigner verify --verbose $APK
unzip -Z1 $APK | rg '^lib/' | sed -E 's#^lib/([^/]+)/.*#\1#' | sort -u
~~~

ABI 출력은 다음 한 줄만 남아야 한다.

~~~text
arm64-v8a
~~~

릴리스 APK는 현재 프로젝트 데모 서명을 사용한다. 공개 배포나 Play Store 배포에는
별도 보관된 release keystore와 signing policy가 필요하며 keystore/private key는 절대
저장소에 올리지 않는다.

## 12. 장애 대응

### /health는 200인데 /me 또는 자산 API가 500인 경우

Cloud SQL migration role은 schema owner이고 runtime role은 별도이므로
permission denied for schema finapp_identity가 발생할 수 있다. 9.2의 권한 SQL을
적용한 뒤 API를 재검증한다.

### 종목 검색이 빈 배열인 경우

검색 호출 자체는 성공했지만 catalog table이 비어 있을 수 있다. Platform migration
후 finapp-platform-market-seed를 실행하고 다음 호출을 확인한다.

~~~text
GET /api/v1/market/stocks?q=005930&limit=30
~~~

### 앱에서 클라이언트 ID 또는 인증 서버 주소가 없다고 표시되는 경우

릴리스 bundle이 process.env를 직접 읽으면 Expo 공개 환경변수가 비어 있을 수 있다.
앱의 bundled public environment reader를 사용하고 새 릴리스 APK를 다시 생성한다.

### 앱에서 연결 오류가 보이지만 Cloud Run 로그에 요청이 없는 경우

대부분 오래된 APK, 이전 API 주소, 또는 로컬 세션/로그인 설정 문제다. HTTPS API 주소가
현재 APK에 포함됐는지 확인하고, 동일 version code 설치가 거부되면 기존 앱을 삭제 후
다시 설치한다.

### 차트 축 글자가 네모로 표시되는 경우

Android Skia 축 폰트가 한글 단위 문자를 fallback하지 못할 수 있다. 차트 축은 K/M/B와
숫자 연도처럼 ASCII 표기를 사용하고, 사용자 설명·tooltip은 React Native 텍스트로
표시한다.

## 13. 비용과 종료 절차

Cloud Run service는 요청이 없을 때 비용이 낮아지지만, Cloud SQL instance는 계속 실행될
수 있다. 포트폴리오 시연이 끝나면 먼저 상태를 확인한다.

~~~bash
gcloud sql instances describe finapp-db --format='value(state,connectionName,region,settings.tier)'
~~~

일시 중지:

~~~bash
gcloud sql instances patch finapp-db --activation-policy=NEVER
~~~

다시 시연할 때:

~~~bash
gcloud sql instances patch finapp-db --activation-policy=ALWAYS
~~~

인스턴스 삭제는 백업·복구 여부를 확인한 뒤 별도 판단한다. 이 문서는 삭제를 자동으로
수행하지 않는다.

## 14. 공개 저장소 보안 체크리스트

커밋 전에 다음을 확인한다.

- [ ] DB password, DB URL, bearer token의 실제 값이 문서와 diff에 없는가
- [ ] API key prefix, private key header, OAuth authorization code가 없는가
- [ ] .env, keystore, .p12, .pem, service account JSON이 추가되지 않았는가
- [ ] Secret Manager 값이 아닌 secret resource name만 기록했는가
- [ ] Cloud Run set-secrets를 사용하고 set-env-vars에 비밀값을 넣지 않았는가
- [ ] 모바일 EXPO_PUBLIC_*에는 공개 설정과 placeholder만 있는가
- [ ] 로그, screenshot, crash report에 Authorization header와 token이 없는가
- [ ] public Cloud Run service는 합성 데이터 포트폴리오 데모라는 점이 명시되어 있는가
- [ ] Cloud SQL instance 중지 또는 운영 비용 계획이 있는가

권장 확인 명령:

~~~bash
git status --short
git diff --check
git grep -nE 'postgres(ql)?://|AIza|ghp_|sk-|-----BEGIN|Bearer [A-Za-z0-9._-]{20,}' -- . ':!docs/GOOGLE_CLOUD_DEPLOYMENT.md' || true
~~~

검사에서 실제 secret이 발견되면 커밋하지 말고 즉시 해당 credential을 폐기·교체한다.

## 15. 현재 데모 배포 기록

실제 실행 결과 중 비밀이 아닌 추적 정보만 기록한다.

| 항목 | 기록 |
|---|---|
| Google Cloud project | nexuslink-490118 |
| Region | asia-northeast3 |
| Platform API image tag | platform-api:da82149 |
| Platform API Cloud Run revision | finapp-platform-api-00002-jjr |
| Market seed execution | finapp-platform-market-seed-w4dw9 |
| Latest APK artifact commit | 27dc9df |
| APK ABI | arm64-v8a only |

위 기록에는 password, token, DB URL, private key, 인증 코드, Cloud SQL public IP를
포함하지 않는다.

