# AI 에이전트 최적화

**최적화 목표:** 정확성 · 안정성 · 속도 · 비용 · 안전성

```text
요청 분석 → 경로 선택 → 도구 실행 → 결과 검증 → 응답 생성 → 평가
```

## 1. 최적화 대상

| 구간 | 대표 문제 | 최적화 방향 |
|---|---|---|
| 요청 분석 | 의도·제약조건 누락 | 입력 구조화, 필수값 검증 |
| 경로 선택 | 불필요한 Agent 호출 | 규칙 기반 라우팅, 단순 경로 분리 |
| 계획 | 과도한 단계, 목표 이탈 | 단계 상한, 완료 조건, 계획 재사용 |
| 도구 선택 | 잘못된 도구·인자 | 명확한 도구 명세, 입력 스키마 |
| 도구 실행 | 재시도 폭주, 중복 작업 | timeout, 재시도 정책, 멱등성 키 |
| Context | 토큰 증가, 중요 정보 손실 | 요약, 우선순위, 토큰 예산 |
| 메모리 | 오래된 정보와 오염 | 범위·TTL·출처·삭제 정책 |
| 응답 | 근거 없는 결론 | 결과 검증, 출처, 불확실성 표시 |
| 운영 | 실패 원인 추적 불가 | Trace, 구조화 로그, 평가 데이터 |

## 2. 기준선과 평가셋

### 평가 데이터 필드

| 필드 | 내용 |
|---|---|
| `case_id` | 평가 사례 식별자 |
| `request` | 사용자 요청 |
| `expected_route` | 기대 처리 경로 |
| `expected_tools` | 기대 도구 목록 |
| `expected_arguments` | 필수 입력 인자 |
| `expected_result` | 기대 결과 또는 판정 기준 |
| `forbidden_actions` | 금지 도구·쓰기·외부 전송 |
| `max_steps` | 최대 실행 단계 |
| `requires_approval` | 사용자 승인 필요 여부 |

### 핵심 지표

| 평가 축 | 지표 |
|---|---|
| 과업 성공 | Task Success Rate |
| 경로 선택 | Route Accuracy |
| 도구 선택 | Tool Selection Accuracy |
| 인자 생성 | Argument Validity Rate |
| 실행 효율 | 평균 Tool Call 수, 평균 Step 수 |
| 응답 성능 | P50·P95 지연시간 |
| 비용 | 요청당 입력·출력 토큰, 모델·도구 비용 |
| 안정성 | 오류율, 재시도율, timeout 비율 |
| 안전성 | 승인 우회율, 금지 행동 실행률 |

**비교 조건:** 동일 평가셋 · 동일 외부 데이터 · 동일 제한시간 · 동일 실패 정책

## 3. 경로 최적화

**적용 원칙:** 복합 과업에만 Agent Loop 사용

| 요청 유형 | 권장 경로 |
|---|---|
| 단순 인사·고정 안내 | 규칙 또는 템플릿 |
| 한 번의 조회 | 단일 Tool Call |
| 문서 기반 질문 | RAG 파이프라인 |
| 여러 단계의 조사·판단 | Agent Loop |
| 쓰기·삭제·설비 제어 | 승인 포함 Workflow |

```text
입력
 ├─ 고정 응답 가능 → 템플릿
 ├─ 단일 조회 가능 → Tool
 ├─ 문서 근거 필요 → RAG
 └─ 복합 과업 → Agent
```

**효과:** 불필요한 모델 호출 감소, 예측 가능성 향상, 지연시간·비용 절감

## 4. 도구 최적화

### 도구 명세

- 한 도구당 하나의 명확한 책임
- 동사형 이름과 구체적인 설명
- 필수·선택 인자 구분
- 단위·형식·허용 범위 명시
- 반환값과 오류 구조 표준화
- 읽기·쓰기 도구 분리
- 유사 도구 간 선택 기준 명시

### 입력 스키마

<details>
<summary><code>tool_schema.py</code> 코드 보기</summary>

```python
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ProductionQuery(BaseModel):
    """지정 설비의 생산 실적 조회 입력."""

    equipment_id: str = Field(
        min_length=2,
        description="설비 마스터의 식별자. 예: CNC-02",
    )
    start_date: date
    end_date: date
    metric: Literal["output", "defect_rate", "oee"]

    @model_validator(mode="after")
    def validate_period(self) -> "ProductionQuery":
        if self.start_date > self.end_date:
            raise ValueError("start_date는 end_date보다 늦을 수 없습니다.")
        if (self.end_date - self.start_date).days > 31:
            raise ValueError("조회 기간은 최대 31일입니다.")
        return self


def get_production_metrics(query: ProductionQuery) -> dict:
    """읽기 전용 생산 지표 조회."""
    return {
        "status": "success",
        "equipment_id": query.equipment_id,
        "period": [str(query.start_date), str(query.end_date)],
        "metric": query.metric,
        "value": 0.87,
        "unit": "%" if query.metric == "defect_rate" else "ratio",
        "data_timestamp": "2026-09-03T09:00:00+09:00",
    }
```

</details>

### 반환 구조

```json
{
  "status": "success | error | partial",
  "data": {},
  "error_code": null,
  "message": null,
  "source": "production-db",
  "data_timestamp": "2026-09-03T09:00:00+09:00"
}
```

**필수 항목:** 상태 · 데이터 시점 · 출처 · 오류 코드 · 사용자용 메시지

## 5. Agent Loop 최적화

### 종료 조건

- 목표 달성
- 최대 단계 도달
- 전체 제한시간 초과
- 동일 도구·동일 인자 반복
- 복구 불가능한 오류
- 승인 거절
- 충분한 근거 부족

### 재시도 정책

| 오류 유형 | 처리 |
|---|---|
| 일시적 네트워크 오류 | 지수 백오프 기반 제한 재시도 |
| 잘못된 입력 인자 | 스키마 오류를 반영한 1회 수정 |
| 권한 부족 | 즉시 중단·권한 안내 |
| 데이터 없음 | 조건 확인 또는 근거 부족 응답 |
| 서버 내부 오류 | 제한 재시도 후 실패 반환 |
| 안전 정책 위반 | 재시도 없이 차단 |

### 제한된 실행 루프

<details>
<summary><code>bounded_agent.py</code> 코드 보기</summary>

```python
from collections.abc import Callable
from dataclasses import dataclass, field
from time import monotonic
from typing import Any


@dataclass
class AgentState:
    goal: str
    max_steps: int = 6
    timeout_seconds: float = 20.0
    step: int = 0
    history: list[dict[str, Any]] = field(default_factory=list)


class AgentLimitError(RuntimeError):
    pass


def run_agent(
    state: AgentState,
    decide: Callable[[AgentState], dict[str, Any]],
    tools: dict[str, Callable[..., Any]],
) -> dict[str, Any]:
    started_at = monotonic()
    previous_signature: tuple[str, str] | None = None

    while state.step < state.max_steps:
        if monotonic() - started_at > state.timeout_seconds:
            raise AgentLimitError("전체 제한시간 초과")

        action = decide(state)
        if action["type"] == "finish":
            return {
                "status": "success",
                "answer": action["answer"],
                "steps": state.step,
            }

        tool_name = action["tool"]
        arguments = action.get("arguments", {})
        signature = (tool_name, repr(sorted(arguments.items())))

        if signature == previous_signature:
            raise AgentLimitError("동일 도구와 인자의 반복 호출")
        if tool_name not in tools:
            raise AgentLimitError(f"허용되지 않은 도구: {tool_name}")

        result = tools[tool_name](**arguments)
        state.history.append(
            {
                "tool": tool_name,
                "arguments": arguments,
                "result": result,
            }
        )
        previous_signature = signature
        state.step += 1

    raise AgentLimitError("최대 단계 도달")
```

</details>

## 6. Context 최적화

### Context 우선순위

1. 시스템 정책과 안전 규칙
2. 현재 사용자 요청과 제약조건
3. 승인 상태와 실행 권한
4. 최신 도구 결과
5. 관련 문서 근거
6. 압축된 대화 요약
7. 장기 메모리

### 토큰 예산

| 영역 | 관리 기준 |
|---|---|
| 시스템 정책 | 축약 금지, 중복 제거 |
| 대화 기록 | 오래된 내용 요약 |
| 도구 결과 | 필요한 필드만 선택 |
| RAG 문서 | 중복 제거, 관련 구간 우선 |
| 중간 추론 | 사용자에게 필요한 결과만 보존 |
| 출력 | 형식과 최대 길이 지정 |

**제거 대상:** 중복 로그 · 전체 API 응답 · 무관한 이전 대화 · 이미 해결된 오류 · 오래된 상태

## 7. 메모리 최적화

| 메모리 유형 | 내용 | 관리 정책 |
|---|---|---|
| 작업 메모리 | 현재 요청의 상태·결과 | 요청 종료 후 삭제 |
| 세션 메모리 | 대화 내 선호·결정 | 세션 범위 유지 |
| 장기 메모리 | 반복 활용 정보 | 동의·출처·갱신 시점 관리 |
| 지식 저장소 | 문서·규정·매뉴얼 | 버전·권한·폐기 정책 |

**저장 제외:** 비밀번호 · API Key · 불필요한 개인정보 · 검증되지 않은 추론 · 일시적 오류 메시지

**메모리 필드:** 값 · 출처 · 생성 시각 · 만료 시각 · 신뢰도 · 사용자 범위

## 8. 모델과 비용 최적화

### 모델 라우팅

| 작업 | 모델 전략 |
|---|---|
| 분류·추출·형식 변환 | 작고 빠른 모델 |
| 복합 계획·상충 정보 판단 | 추론 성능 중심 모델 |
| 반복 요약 | 캐시 또는 저비용 모델 |
| 안전·승인 판정 | 결정적 규칙 + 모델 보조 |

### 비용 절감

- 프롬프트 중복 제거
- 정적 시스템 프롬프트 캐시 활용
- 구조화 출력 기반 재질문 감소
- 동일 Tool Call 결과 캐시
- 변화 없는 외부 데이터 재조회 방지
- 단순 요청의 Agent 경로 제외
- 병렬 가능한 읽기 작업의 동시 실행

**캐시 금지 또는 주의:** 실시간 데이터 · 사용자별 권한 결과 · 쓰기 작업 · 민감 정보 · 짧은 유효기간 데이터

## 9. 병렬 실행

```text
독립 작업: 병렬
의존 작업: 순차
쓰기 작업: 충돌·순서 검증 후 실행
```

| 작업 조합 | 처리 방식 |
|---|---|
| 생산량 조회 + 품질률 조회 | 병렬 가능 |
| 문서 검색 + 설비 상태 조회 | 병렬 가능 |
| 주문 생성 → 결제 | 순차 실행 |
| 정비 요청 생성 → 승인 | 순차 실행 |
| 동일 레코드 수정 2건 | 직렬화 또는 충돌 제어 |

## 10. 안전성과 Human-in-the-Loop

### 승인 필요 작업

- 데이터 생성·수정·삭제
- 메시지·메일·보고서 외부 전송
- 구매·예약·결제
- 설비 제어와 정비 명령
- 권한 변경
- 개인정보·영업비밀 외부 전달

### 승인 화면 필수 정보

```text
실행 작업: CNC-02 정비 요청 생성
대상: 설비 CNC-02
입력: 과열 경보 점검
영향: 정비 티켓 신규 생성
근거: 센서 경보 A-104, 매뉴얼 4.2절
복구: 티켓 취소 가능
```

**승인 원칙:** 실행 직전 확인 · 대상과 영향 표시 · 승인 범위 고정 · 승인 후 인자 변경 금지 · 감사 로그 보존

## 11. 관측성과 Trace

### 요청 단위 기록

- Trace ID와 사용자 범위
- 입력 분류와 선택 경로
- 모델명과 프롬프트 버전
- Tool 이름·인자·결과 상태
- 단계별 시작·종료 시각
- 토큰·지연시간·비용
- 재시도·오류·중단 이유
- 승인 요청과 승인 결과
- 최종 응답과 출처

### 민감 정보 처리

- 비밀번호·토큰·인증 헤더 미기록
- 개인정보 마스킹
- 도구 인자의 허용 필드만 기록
- 로그 접근 권한과 보존 기간 설정
- 원문 대신 해시·식별자 활용

## 12. 회귀 평가 Harness

<details>
<summary><code>evaluate_agent.py</code> 코드 보기</summary>

```python
from collections.abc import Callable
from dataclasses import dataclass
from statistics import mean
from time import perf_counter
from typing import Any


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    request: str
    expected_tools: set[str]
    max_steps: int


def evaluate_cases(
    cases: list[EvalCase],
    invoke_agent: Callable[[str], dict[str, Any]],
) -> dict[str, float]:
    results: list[dict[str, float | bool]] = []

    for case in cases:
        started_at = perf_counter()
        output = invoke_agent(case.request)
        latency = perf_counter() - started_at

        called_tools = set(output.get("called_tools", []))
        steps = int(output.get("steps", 0))
        results.append(
            {
                "tool_match": called_tools == case.expected_tools,
                "within_limit": steps <= case.max_steps,
                "latency": latency,
            }
        )

    return {
        "tool_accuracy": mean(float(row["tool_match"]) for row in results),
        "step_limit_rate": mean(float(row["within_limit"]) for row in results),
        "average_latency": mean(float(row["latency"]) for row in results),
    }
```

</details>

## 13. 실험 기록

| 실험 ID | 변경 사항 | 성공률 | 평균 Step | P95 | 요청당 비용 | 안전 위반 | 판정 |
|---|---|---:|---:|---:|---:|---:|---|
| baseline-001 | 기본 Agent |  |  |  |  |  | 기준선 |
| exp-002 | 규칙 기반 라우팅 |  |  |  |  |  |  |
| exp-003 | Tool 스키마 개선 |  |  |  |  |  |  |
| exp-004 | Step·timeout 제한 |  |  |  |  |  |  |
| exp-005 | Context 요약·캐시 |  |  |  |  |  |  |

**실험 원칙:** 한 번에 한 변수 · 동일 평가셋 · 실패 사례 보존 · 품질·속도·비용 동시 비교

## 14. 최적화 순서

1. 과업 성공 기준과 금지 행동 정의
2. 최소 20개의 정상·오류·안전 평가 사례 준비
3. 성공률·Step·지연시간·비용 기준선 측정
4. 단순 요청의 비-Agent 경로 분리
5. Tool 설명·입력·출력 스키마 정리
6. Step·timeout·재시도·반복 호출 제한
7. Context·메모리·캐시 최적화
8. 쓰기 작업의 승인 흐름 적용
9. 회귀 평가와 운영 Trace 확인
10. 개선 설정 채택 또는 롤백

## 15. 제조 AI 에이전트 체크리스트

### 정확성

- [ ] 사용자 요청과 설비·기간·지표의 구조화
- [ ] 기대 도구와 실제 호출 도구의 일치
- [ ] Tool 결과의 상태·시점·단위 검증
- [ ] 근거와 불확실성이 포함된 최종 응답

### 효율성

- [ ] 단순 요청의 Agent Loop 제외
- [ ] 최대 단계와 전체 timeout 설정
- [ ] 동일 Tool Call 반복 차단
- [ ] 독립적인 읽기 작업의 병렬 처리
- [ ] 토큰·도구·모델 비용 측정

### 안전성

- [ ] 읽기와 쓰기 도구의 분리
- [ ] 설비 제어와 외부 전송의 사전 승인
- [ ] 권한 필터의 서버 측 적용
- [ ] 사용자 입력과 도구 결과의 비신뢰 데이터 처리
- [ ] 민감 정보의 로그 마스킹

### 운영

- [ ] 요청별 Trace ID
- [ ] 모델·프롬프트·Tool 버전 기록
- [ ] 실패 유형별 알림과 대응 절차
- [ ] 변경 전 회귀 평가
- [ ] 이전 설정으로의 롤백 경로

## 16. 완료 기준

- [ ] 20개 이상의 평가 사례
- [ ] 정상·오류·근거 부족·승인 필요 사례 포함
- [ ] 기준선과 최소 3개 최적화 실험 비교
- [ ] 과업 성공률·도구 정확도·지연시간·비용 측정
- [ ] 최대 Step·timeout·재시도 제한 검증
- [ ] 승인 없는 쓰기 작업 차단 확인
- [ ] 재현 가능한 설정과 평가 리포트

## 17. 핵심 정리

```text
좋은 AI 에이전트
= 명확한 경로
+ 작은 도구
+ 제한된 실행
+ 검증된 결과
+ 승인과 추적
+ 반복 가능한 평가
```
