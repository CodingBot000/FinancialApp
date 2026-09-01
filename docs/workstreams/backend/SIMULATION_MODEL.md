# Backend Synthetic Simulation Model

- model owner: backend workstream
- engine version: `1.0.0`
- assumption version: `SYNTHETIC_V1`
- purpose: 기술 시연용 합성 금융 계산. 실제 시장 예측이나 투자 조언이 아니다.

## 입력과 한계

- currency는 MVP에서 `KRW`다.
- initial assets, monthly contribution, target amount는 0 이상이며 각각 application validation 상한 이하여야 한다.
- duration은 1~600개월이다.
- allocation asset class는 `CASH`, `BOND`, `EQUITY`만 허용하고 중복을 금지한다.
- allocation weight 합은 절대 오차 `1e-8` 이내에서 1이어야 한다.
- client는 seed를 지정할 수 없다. API가 seed를 생성하고 run row에 저장한다.
- 기본 path count는 1,000이다.

## 합성 가정

`SYNTHETIC_V1`은 migration에 immutable version row로 저장한다.

| Asset class | Expected annual return | Annual volatility | Annual fee |
|---|---:|---:|---:|
| CASH | 0.025 | 0.005 | 0.001 |
| BOND | 0.040 | 0.080 | 0.002 |
| EQUITY | 0.070 | 0.180 | 0.004 |

상관행렬 순서는 CASH, BOND, EQUITY이며 다음 값을 사용한다.

```text
1.00  0.15  0.05
0.15  1.00  0.25
0.05  0.25  1.00
```

## 계산

각 월과 path에서 seeded PRNG의 독립 표준정규값에 Cholesky factor를 곱해 상관된 `z`를 만든다. 자산군 `i`의 월 gross return factor는 다음이다.

```text
exp(((annualReturn_i - annualFee_i) - 0.5 * annualVolatility_i^2) / 12
    + annualVolatility_i / sqrt(12) * z_i)
```

월초 목표 weight로 재조정된 것으로 단순화한 portfolio factor를 적용하고 월말 contribution을 더한다.

```text
value_month = value_previous * sum(weight_i * grossFactor_i)
              + monthlyContribution
```

month 0은 initial assets다. 각 월의 path 분포를 오름차순 정렬해 nearest-rank 방식의 p10, p50, p90을 저장한다. goal probability는 최종 월 value가 target 이상인 path 비율이다.

## 재현성과 저장

- 같은 input snapshot, seed, engine version, assumption row와 path count는 같은 series와 summary를 만든다.
- run input, seed, version과 계산된 모든 monthly percentile point를 PostgreSQL에 저장한다.
- 사용된 assumption row와 completed run/result는 update/delete하지 않는다.
- 알고리즘 또는 PRNG 변경 시 engine version을 증가시킨다.

## 알려진 제한

- nominal value이며 세금, inflation, tail-risk regime, liquidity, 환율과 실제 상품 제약을 모델링하지 않는다.
- monthly constant rebalancing과 정규 상관 구조는 교육용 단순화다.
- 결과는 synthetic dataset의 기술 시연이며 실제 금융 성과를 의미하지 않는다.
