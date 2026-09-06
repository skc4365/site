# Pydantic은 왜 필요한가

## 수업 목표

- 외부 데이터 검증의 필요성
- 타입 힌트와 런타임 검증의 차이
- 수동 검증과 Pydantic 모델의 차이
- 검증 규칙과 비즈니스 규칙의 분리

## 핵심 구조

```text
외부 데이터 → Pydantic 검증 → 안전한 Python 객체 → 서비스 로직
```

외부 데이터의 위험: 누락, 타입 오류, 범위 초과

Pydantic의 역할: 시스템 경계의 데이터 검증, 안전한 내부 객체 생성

## 1. 외부 데이터의 문제

```json
{
  "text": "Pydantic 도입 배경을 요약해 주세요.",
  "max_length": "100"
}
```

`max_length`: 정수가 아닌 문자열

```python
payload = {
    "text": "Pydantic 도입 배경을 요약해 주세요.",
    "max_length": "100",
}

print(type(payload["max_length"]))

# 결과
# <class 'str'>
```

주요 오류:

- 필수 필드 누락
- 잘못된 타입
- 허용 범위 초과
- `None` 또는 빈 문자열

늦은 검증의 결과: 서비스 로직 내부 오류, 불분명한 원인과 위치

## 2. 타입 힌트는 값을 검사하지 않는다

타입 힌트: 코드의 의도 표현, IDE와 정적 분석 도구의 분석 기준

```python
def show_length(max_length: int) -> None:
    print(max_length, type(max_length))


show_length("100")

# 결과
# 100 <class 'str'>
```

Python 타입 힌트: 실행 중 자동 검사 없음

| 구분 | 타입 힌트 | Pydantic |
| --- | --- | --- |
| 시점 | 개발·분석 시점 | 실행 시점 |
| 대상 | 코드의 타입 관계 | 실제 입력값 |
| 결과 | 분석 경고 | 검증된 객체 또는 오류 |

타입 힌트와 런타임 검증: 상호 보완 관계

## 3. 수동 검증의 한계

```python
def validate_summary_request(payload: dict) -> dict:
    if "text" not in payload:
        raise ValueError("text가 필요합니다.")
    if not isinstance(payload["text"], str):
        raise TypeError("text는 문자열이어야 합니다.")

    text = payload["text"].strip()
    if not 2 <= len(text) <= 500:
        raise ValueError("text는 2자 이상 500자 이하여야 합니다.")

    try:
        max_length = int(payload.get("max_length", 100))
    except (TypeError, ValueError) as error:
        raise ValueError("max_length는 정수여야 합니다.") from error

    if not 10 <= max_length <= 200:
        raise ValueError("max_length는 10 이상 200 이하여야 합니다.")

    return {"text": text, "max_length": max_length}
```

필드 두 개에도 필요한 반복 코드:

- 필수값 확인
- 타입 검사와 변환
- 기본값 적용
- 범위 검증
- 오류 작성

필드와 중첩 구조 증가 → 조건문과 예외 처리 증가

## 4. Pydantic 모델과 데이터 계약

```python
from pydantic import BaseModel, Field


class SummaryRequest(BaseModel):
    text: str = Field(min_length=2, max_length=500)
    max_length: int = Field(default=100, ge=10, le=200)


request = SummaryRequest.model_validate(
    {"text": "Pydantic 도입 배경", "max_length": "100"}
)

print(request)
print(type(request.max_length))

# 결과
# text='Pydantic 도입 배경' max_length=100
# <class 'int'>
```

모델 선언: 데이터 구조와 제약 조건의 통합

- `text`: 필수 문자열, 2~500자
- `max_length`: 정수, 10~200
- 생략 시 기본값 `100`

`"100"` → 정수 `100` 변환

## 5. 변환과 엄격한 검증

기본 검증: 허용 범위 내 타입 변환

strict 모드: 타입 변환 금지

```python
from pydantic import BaseModel, ConfigDict, ValidationError


class StrictRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    max_length: int


try:
    StrictRequest.model_validate({"max_length": "100"})
except ValidationError as error:
    print(error.errors()[0]["type"])

# 결과
# int_type
```

선택 기준:

- 사용자 입력 편의 중심: 기본 변환
- 정확한 타입 일치 중심: strict 모드

## 6. 구조화된 검증 오류

Pydantic 오류: 여러 검증 실패의 구조화

```python
invalid_payload = {
    "text": "A",
    "max_length": 500,
}

try:
    SummaryRequest.model_validate(invalid_payload)
except ValidationError as error:
    for detail in error.errors():
        print(detail["loc"], detail["type"])

# 결과
# ('text',) string_too_short
# ('max_length',) less_than_equal
```

| 항목 | 의미 |
| --- | --- |
| `loc` | 오류 필드와 경로 |
| `type` | 오류 종류 |
| `msg` | 오류 설명 |
| `input` | 실패한 입력값 |

API 활용: 일관된 오류 응답 생성

## 7. 검증 이후의 기능

```python
request = SummaryRequest(text="데이터 계약을 관리합니다.")

print(request.model_dump())
print(request.model_dump_json())
print(SummaryRequest.model_json_schema()["properties"].keys())
```

하나의 모델, 네 가지 기능:

```text
모델 선언
├─ 입력 검증과 변환
├─ Python dict 변환
├─ JSON 직렬화
└─ JSON Schema 생성
```

효과: 검증 규칙과 문서 스키마의 불일치 감소

## 8. `dataclass`와의 차이

```python
from dataclasses import dataclass


@dataclass
class SummaryOptions:
    max_length: int


options = SummaryOptions(max_length="100")
print(type(options.max_length))

# 결과
# <class 'str'>
```

`dataclass`: 자동 타입 검증 없음

| 상황 | 선택 |
| --- | --- |
| 신뢰할 수 있는 내부 데이터 보관 | `dataclass` |
| 외부 입력 검증과 변환 | Pydantic |
| 상세 오류와 JSON Schema 필요 | Pydantic |
| 표준 라이브러리만 사용 | `dataclass` |

적용 원칙: 모든 객체가 아닌 외부·내부 경계 우선

## 9. FastAPI와의 연결

```python
from fastapi import FastAPI


app = FastAPI()


@app.post("/summaries")
async def create_summary(payload: SummaryRequest) -> dict[str, object]:
    return {
        "text": payload.text,
        "max_length": payload.max_length,
    }
```

FastAPI의 Pydantic 모델: 요청 데이터 계약

```text
HTTP JSON 요청
   ↓
Pydantic 검증 ─ 실패 → 검증 오류 응답
   ↓ 성공
Endpoint 실행
```

같은 모델의 추가 결과: OpenAPI 문서, Swagger UI

## 10. 검증 규칙의 위치

Pydantic 모델에 둘 규칙:

- 문자열 길이
- 숫자 범위
- 필수값과 기본값
- 날짜·URL·이메일 형식
- 필드 간 단순 관계

서비스 계층에 둘 규칙:

- 사용자 권한
- 이메일 중복 여부
- 재고 보유 여부
- 외부 계정 상태

Pydantic: 데이터 형식 확인

서비스: 업무 수행 가능 여부 판단

모델 검증 제외 대상: DB 조회, 외부 API 호출

## Try — 입력 비교

```python
samples = [
    {"text": "정상 요청", "max_length": 50},
    {"text": "문자열 정수", "max_length": "50"},
    {"text": "A", "max_length": 50},
    {"text": "범위 오류", "max_length": 300},
    {"max_length": 50},
]

for index, sample in enumerate(samples, start=1):
    try:
        request = SummaryRequest.model_validate(sample)
        print(index, "성공", request.model_dump())
    except ValidationError as error:
        result = [
            {"loc": detail["loc"], "type": detail["type"]}
            for detail in error.errors()
        ]
        print(index, "실패", result)
```

확인 항목:

1. `"50"`의 정수 변환
2. 한 글자 입력의 오류 종류
3. 범위 초과 필드의 위치
4. 필수 필드 누락 오류

## 도입 기준

Pydantic 적용 대상:

- JSON 또는 설정값 입력
- 반복되는 타입·범위 규칙
- 필드별 오류 정보 필요
- 잦은 Python 객체·JSON 변환
- OpenAPI 또는 JSON Schema 필요

적용 범위: 이미 검증된 지역 변수 제외, 시스템 경계 우선

## 실습 과제

1. `name`, `age`, `email` 수동 검증
2. 같은 규칙의 Pydantic 모델 작성
3. 기본 모델과 strict 모델 비교
4. `loc`, `type`, `msg` 표 작성
5. 검증 규칙과 비즈니스 규칙 분류

## 핵심 정리

```text
타입 힌트    = 데이터 타입의 의도
Pydantic    = 실행 시 확인하는 데이터 계약
서비스 로직  = 검증된 데이터에 적용하는 업무 규칙
```

Pydantic의 핵심: 경계 검증과 예측 가능한 내부 객체

## 완료 기준

- [ ] 런타임 검증의 필요성 설명
- [ ] 타입 힌트와 Pydantic 구분
- [ ] 수동 검증의 반복 요소 확인
- [ ] 검증·변환·직렬화·스키마 생성 구분
- [ ] 검증 규칙과 비즈니스 규칙 분리
