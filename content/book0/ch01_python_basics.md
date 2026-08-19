# 파이썬 기본 문법

## 수업 목표

- 변수와 자료형을 구분한다.
- 조건문·반복문으로 처리 흐름을 만든다.
- 함수와 타입 힌트로 코드를 나눈다.
- 리스트와 딕셔너리 형태의 서비스 데이터를 처리한다.

## 먼저 보는 구조

```text
입력 데이터 → 조건 판단 → 반복 처리 → 함수 반환값
```

## 1. 변수와 자료형

```python
service_name: str = "summary-api"
max_length: int = 100
temperature: float = 0.2
is_enabled: bool = True

print(type(service_name), type(max_length))
```

| 자료형 | 의미 | 예시 |
|---|---|---|
| `str` | 문자열 | 서비스명, 질문 |
| `int` | 정수 | 요청 수, 글자 수 |
| `float` | 실수 | 점수, 설정값 |
| `bool` | 참·거짓 | 활성화 여부 |
| `None` | 값이 없음 | 아직 생성되지 않은 결과 |

## 2. 리스트와 딕셔너리

```python
requests = ["첫 번째 질문", "두 번째 질문"]

response = {
    "status": "success",
    "count": len(requests),
    "items": requests,
}

print(response["count"])
```

API의 JSON 객체는 Python에서 주로 딕셔너리로 다룹니다.

## 3. 조건문과 반복문

```python
questions = ["asyncio란?", "", "FastAPI란?"]
valid_questions: list[str] = []

for question in questions:
    cleaned = question.strip()
    if not cleaned:
        continue
    valid_questions.append(cleaned)

print(valid_questions)
```

## 4. 함수와 타입 힌트

```python
def normalize_question(question: str, max_length: int = 100) -> str:
    cleaned = question.strip()
    if not cleaned:
        raise ValueError("질문을 입력하세요.")
    return cleaned[:max_length]


try:
    result = normalize_question("  Python이란?  ")
    print(result)
except ValueError as error:
    print("입력 오류:", error)
```

타입 힌트는 실행을 강제로 제한하지 않지만, IDE와 검증 도구가 오류를 미리 찾게 도와줍니다.

## Try — 요청 목록 처리기

```python
def build_responses(questions: list[str]) -> list[dict[str, str]]:
    responses = []
    for index, question in enumerate(questions, start=1):
        try:
            cleaned = normalize_question(question)
            responses.append({"id": str(index), "question": cleaned, "status": "ready"})
        except ValueError:
            responses.append({"id": str(index), "question": "", "status": "invalid"})
    return responses


items = build_responses(["Pydantic이란?", " ", "FastAPI란?"])
for item in items:
    print(item)
```

예상 결과:

```text
{'id': '1', 'question': 'Pydantic이란?', 'status': 'ready'}
{'id': '2', 'question': '', 'status': 'invalid'}
{'id': '3', 'question': 'FastAPI란?', 'status': 'ready'}
```

## 실습 과제

1. 질문의 최소 길이가 2자가 되도록 검사합니다.
2. `status`가 `ready`인 항목 수를 계산합니다.
3. 결과를 `{"total": ..., "valid": ..., "items": ...}` 형태로 만듭니다.

## 강사 체크포인트

- 변수명으로 값의 의미를 설명하게 합니다.
- 빈 문자열과 `None`의 차이를 질문합니다.
- 함수의 입력·출력·오류를 말로 설명한 뒤 코드를 실행합니다.

## 완료 기준

- [ ] 리스트와 딕셔너리를 읽고 수정할 수 있다.
- [ ] 조건문·반복문·함수로 요청을 처리할 수 있다.
- [ ] 함수의 타입 힌트와 반환값을 설명할 수 있다.

