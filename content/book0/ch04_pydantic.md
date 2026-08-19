# Pydantic BaseModel 데이터 검증

## 수업 목표

- API 경계에서 데이터 검증이 필요한 이유를 설명한다.
- `BaseModel`, `Field`, `field_validator`를 사용한다.
- 요청·응답 모델을 분리한다.
- 검증 오류를 읽고 수정한다.

## 먼저 보는 구조

```text
외부 JSON → Pydantic 검증 → 안전한 Python 객체 → 서비스 로직
```

## 1. 첫 번째 모델

```python
from pydantic import BaseModel, Field


class SummaryRequest(BaseModel):
    text: str = Field(min_length=2, max_length=500)
    max_length: int = Field(default=100, ge=10, le=200)


request = SummaryRequest(text="Pydantic은 입력 데이터를 검증합니다.")
print(request.text)
print(request.model_dump())
```

Pydantic 2에서는 객체를 딕셔너리로 바꿀 때 `model_dump()`를 사용합니다.

## 2. 기본값과 선택값

```python
class ServiceOptions(BaseModel):
    language: str = "ko"
    request_id: str | None = None
    tags: list[str] = Field(default_factory=list)
```

`str | None`은 값이 문자열이거나 `None`일 수 있다는 뜻입니다. 기본값이 없으면 선택 타입이라도 필수 필드가 될 수 있으므로 기본값을 명시합니다.

## 3. 사용자 검증 규칙

```python
from pydantic import field_validator


class SummaryRequest(BaseModel):
    text: str = Field(min_length=2, max_length=500)
    max_length: int = Field(default=100, ge=10, le=200)

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("공백만 입력할 수 없습니다.")
        return cleaned
```

문자열 정리와 필드 하나의 검증은 `field_validator`에 둡니다. 외부 DB 조회 같은 느린 작업은 모델 검증에 넣지 않습니다.

## 4. 요청과 응답 모델 분리

```python
from datetime import datetime, timezone


class SummaryResponse(BaseModel):
    id: int
    summary: str
    original_length: int
    created_at: datetime


response = SummaryResponse(
    id=1,
    summary="입력 검증 예제",
    original_length=25,
    created_at=datetime.now(timezone.utc),
)
print(response.model_dump_json(indent=2))
```

요청 모델에는 사용자가 입력할 값만, 응답 모델에는 서버가 생성한 값까지 포함합니다.

## Try — 정상 입력과 오류 비교

```python
from pydantic import ValidationError


samples = [
    {"text": "정상적인 요약 요청", "max_length": 50},
    {"text": " ", "max_length": 50},
    {"text": "너무 작은 길이", "max_length": 3},
]

for sample in samples:
    try:
        request = SummaryRequest.model_validate(sample)
        print("정상:", request.model_dump())
    except ValidationError as error:
        print("검증 실패:")
        for detail in error.errors():
            print(detail["loc"], detail["msg"])
```

## 실습 과제

1. `language`가 `ko` 또는 `en`만 허용되도록 만듭니다.
2. `tags`는 최대 5개만 받도록 제한합니다.
3. 요청 모델과 응답 모델의 필드가 다른 이유를 설명합니다.

## 강사 체크포인트

- Python 타입 힌트와 런타임 검증의 차이를 확인합니다.
- `ValidationError.errors()`의 `loc`, `type`, `msg`를 읽게 합니다.
- 비즈니스 로직과 입력 검증을 어디까지 나눌지 토론합니다.

## 완료 기준

- [ ] `BaseModel`로 요청·응답 스키마를 만들 수 있다.
- [ ] `Field`와 Validator로 입력을 제한할 수 있다.
- [ ] 검증 오류의 위치와 원인을 읽을 수 있다.
