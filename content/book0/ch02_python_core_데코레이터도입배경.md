# 데코레이터는 왜 필요한가

## 학습 목표

- 반복 코드와 공통 관심사의 문제
- 함수를 값으로 다루는 Python의 특성
- 고차 함수·클로저·데코레이터의 연결
- 데코레이터의 적용 시점과 호출 흐름

## 핵심 구조

```text
호출자 → 공통 기능 → 핵심 기능 → 공통 기능 → 결과
```

데코레이터의 목적: 핵심 함수 수정 없이 공통 기능 추가

대표 영역:

- 로깅
- 실행 시간 측정
- 인증·권한 검사
- 입력·출력 검증
- 캐싱
- 재시도
- 트랜잭션

## 한눈에 보는 도입 배경

핵심 이유:

```text
코드 중복 감소(DRY)
        +
함수의 추가 기능을 정의부에 표시
        ↓
재사용성 + 가독성 + 가시성
```

데코레이터 문법의 표준화: PEP 318, Python 2.4

### `@` 문법 이전

함수 정의 후 재할당 방식:

```python
def my_func() -> None:
    print("실행")


# 함수 정의와 기능 적용 코드의 분리
my_func = login_required(my_func)
my_func = timer(my_func)
```

코드의 실제 의미:

```text
my_func
   ↓ login_required 적용
권한 검사 기능 추가
   ↓ timer 적용
실행 시간 측정 기능 추가
```

불편한 점:

- 함수 정의부와 기능 적용 코드의 분리
- 적용 기능 확인을 위한 코드 탐색
- 함수 이름의 반복 입력
- 오타·누락 가능성
- 재할당 순서 확인의 어려움

### `@` 문법 이후

```python
@timer
@login_required
def my_func() -> None:
    print("실행")
```

한눈에 보이는 정보:

- 핵심 함수: `my_func`
- 권한 검사: `@login_required`
- 실행 시간 측정: `@timer`
- 적용 순서: `timer(login_required(my_func))`

두 코드의 동일한 의미:

```python
@timer
@login_required
def my_func() -> None:
    print("실행")
```

```python
def my_func() -> None:
    print("실행")


my_func = timer(login_required(my_func))
```

### 가장 쉬운 이해

```text
@login_required  → 출입 확인
@timer           → 실행 시간 측정
def my_func()    → 실제 업무
```

함수 위의 `@이름`: 해당 함수에 추가된 기능 표시

핵심 로직과 공통 기능의 분리:

| 구분 | 예시 |
| --- | --- |
| 핵심 로직 | 주문 처리, 파일 저장, AI 응답 생성 |
| 공통 기능 | 로그인 확인, 로깅, 시간 측정, 재시도 |

공통 기능의 다른 이름: 횡단 관심사(Cross-cutting concern)

`@` 문법의 효과:

- 반복 코드 감소
- 공통 기능 재사용
- 핵심 로직 집중
- 적용 기능의 즉시 확인
- 함수 호출 방식 유지

## 1. 반복 코드의 문제

데코레이터 도입 전 형태:

```python
from time import perf_counter


def create_summary(text: str) -> str:
    started = perf_counter()
    print("create_summary 시작")

    result = text[:20]

    elapsed = perf_counter() - started
    print(f"create_summary 완료: {elapsed:.3f}초")
    return result


def translate_text(text: str) -> str:
    started = perf_counter()
    print("translate_text 시작")

    result = f"번역: {text}"

    elapsed = perf_counter() - started
    print(f"translate_text 완료: {elapsed:.3f}초")
    return result
```

문제점:

- 모든 함수의 측정 코드 반복
- 핵심 기능과 부가 기능의 혼합
- 로그 형식 변경 시 다수 함수 수정
- 일부 함수의 적용 누락 가능성
- 테스트 범위 증가

핵심 기능:

```text
create_summary → 요약
translate_text → 번역
```

공통 관심사:

```text
시작 로그 + 시간 측정 + 완료 로그
```

## 2. 공통 코드를 함수로 분리

```python
from collections.abc import Callable
from time import perf_counter
from typing import Any


def measure(func: Callable[..., Any], *args: Any) -> Any:
    started = perf_counter()
    print(f"{func.__name__} 시작")
    result = func(*args)
    elapsed = perf_counter() - started
    print(f"{func.__name__} 완료: {elapsed:.3f}초")
    return result


def create_summary(text: str) -> str:
    return text[:20]


result = measure(create_summary, "데코레이터 도입 배경")
```

개선점:

- 시간 측정 코드 한곳에 배치
- 핵심 함수의 단순화

남은 문제:

- `create_summary(...)` 대신 `measure(create_summary, ...)` 호출
- 기존 호출 코드 전체 변경
- 공통 기능 적용 여부의 호출자 의존

필요한 형태:

```python
result = create_summary("데코레이터 도입 배경")
```

기존 호출 방식 유지 + 공통 기능 자동 적용

## 3. 함수도 객체

Python 함수의 특징:

- 변수 저장
- 함수 인자 전달
- 함수 반환값 사용
- 자료구조 저장

```python
def greet(name: str) -> str:
    return f"안녕하세요, {name}"


message_func = greet
print(message_func("민수"))

# 결과
# 안녕하세요, 민수
```

핵심 개념: 일급 객체(first-class object)

데코레이터의 기반: 함수를 받아 새로운 함수 반환

## 4. 고차 함수

고차 함수(higher-order function):

- 함수를 인자로 받는 함수
- 함수를 반환하는 함수
- 두 조건 중 하나 이상

```python
from collections.abc import Callable


def apply(
    func: Callable[[int], int],
    value: int,
) -> int:
    return func(value)


def double(value: int) -> int:
    return value * 2


print(apply(double, 5))

# 결과
# 10
```

데코레이터: 고차 함수의 대표 활용

## 5. 함수를 반환하는 함수

```python
from collections.abc import Callable


def create_multiplier(factor: int) -> Callable[[int], int]:
    def multiply(value: int) -> int:
        return value * factor

    return multiply


double = create_multiplier(2)
triple = create_multiplier(3)

print(double(5))
print(triple(5))

# 결과
# 10
# 15
```

`create_multiplier()` 종료 후에도 유지되는 `factor`

핵심 개념: 클로저(closure)

```text
외부 함수의 지역 변수
        ↓ 기억
반환된 내부 함수
```

데코레이터의 wrapper도 같은 구조

## 6. 함수 감싸기

```python
from collections.abc import Callable


def trace(func: Callable[[], str]) -> Callable[[], str]:
    def wrapper() -> str:
        print("호출 전")
        result = func()
        print("호출 후")
        return result

    return wrapper


def greet() -> str:
    return "안녕하세요"


greet = trace(greet)
print(greet())

# 결과
# 호출 전
# 호출 후
# 안녕하세요
```

변환 구조:

```text
원래 greet 함수
      ↓ trace(greet)
wrapper 함수
      ↓ greet 변수에 재할당
감싸진 greet 함수
```

핵심 코드:

```python
greet = trace(greet)
```

## 7. `@` 문법

다음 두 코드의 동일한 의미:

```python
@trace
def greet() -> str:
    return "안녕하세요"
```

```python
def greet() -> str:
    return "안녕하세요"


greet = trace(greet)
```

`@trace`의 역할: 함수 정의 직후 자동 재할당

데코레이터의 본질:

```text
함수 입력 → wrapper 생성 → wrapper 반환 → 원래 이름에 연결
```

## 8. 적용 시점과 호출 시점

```python
def trace(func):
    print("데코레이터 적용")

    def wrapper():
        print("함수 호출")
        return func()

    return wrapper


@trace
def run() -> str:
    return "실행 결과"


print("호출 전")
print(run())

# 결과
# 데코레이터 적용
# 호출 전
# 함수 호출
# 실행 결과
```

두 시점의 구분:

| 위치 | 시점 | 용도 |
| --- | --- | --- |
| 데코레이터 바깥 영역 | 함수 정의·모듈 로드 | wrapper 생성, 설정 준비 |
| `wrapper` 내부 | 함수 호출 | 로깅, 검증, 측정 |

흔한 오류: 매 호출용 코드를 wrapper 밖에 배치

## 9. 인자 전달 문제

매개변수가 다른 함수들:

```python
def add(a: int, b: int) -> int:
    return a + b


def greet(name: str, greeting: str = "안녕하세요") -> str:
    return f"{greeting}, {name}"
```

공통 wrapper의 조건: 다양한 위치·키워드 인자 지원

```python
from functools import wraps
from typing import Any


def trace(func):
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        print(f"{func.__name__} 시작")
        result = func(*args, **kwargs)
        print(f"{func.__name__} 완료")
        return result

    return wrapper
```

핵심 요소:

- `*args`: 위치 인자 묶음
- `**kwargs`: 키워드 인자 묶음
- `return result`: 원래 반환값 보존
- `@wraps(func)`: 원래 함수 메타데이터 보존

## 10. `@wraps`의 필요성

`@wraps` 없는 wrapper:

```python
def simple_trace(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper
```

손실 가능 정보:

- 함수 이름 `__name__`
- 설명 `__doc__`
- 모듈 정보 `__module__`
- 타입·디버깅 관련 메타데이터

영향 영역:

- API 문서
- 디버깅
- 로깅
- 테스트
- 리플렉션

기본 원칙: 함수형 데코레이터 내부의 `@wraps(func)`

## 11. 적합한 기능과 부적합한 기능

적합한 기능:

- 여러 함수에 반복되는 기능
- 함수 호출 전후의 처리
- 핵심 로직과 독립적인 기능
- 짧고 예측 가능한 기능

부적합한 기능:

- 핵심 비즈니스 로직
- 복잡한 조건 분기
- 숨겨진 데이터 변경
- 원래 반환값의 임의 변경
- 과도한 외부 상태 의존

판단 질문:

```text
여러 함수에 반복되는가?
호출 전후 처리인가?
함수 이름만으로 동작 예측이 가능한가?
일반 함수 호출보다 구조가 명확한가?
```

## 12. 여러 데코레이터의 순서

```python
@first
@second
def run() -> None:
    pass
```

적용 구조:

```python
run = first(second(run))
```

호출 흐름:

```text
first 시작
  → second 시작
    → run
  → second 종료
→ first 종료
```

순서 영향 사례:

- 인증 후 권한 검사
- 트랜잭션 안쪽·바깥쪽의 재시도
- 캐시 적용 전후의 로깅
- 입력 변환 전후의 검증

## 도입 전후 비교

| 항목 | 도입 전 | 도입 후 |
| --- | --- | --- |
| 공통 코드 | 함수마다 반복 | 데코레이터 한곳 |
| 핵심 함수 | 부가 기능 혼합 | 핵심 로직 중심 |
| 호출 방식 | 별도 공통 함수 호출 | 기존 호출 방식 유지 |
| 정책 변경 | 여러 함수 수정 | 데코레이터 수정 |
| 적용 확인 | 코드 내부 검사 | `@이름` 확인 |

## Try — 로깅 코드 분리

```python
from functools import wraps


def log_call(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"호출: {func.__name__}")
        return func(*args, **kwargs)

    return wrapper


@log_call
def add(a: int, b: int) -> int:
    return a + b


print(add(2, 3))

# 결과
# 호출: add
# 5
```

확인 항목:

1. `@log_call` 제거 전후의 결과
2. `return` 제거 시 호출 결과
3. `@wraps(func)` 제거 시 `add.__name__`
4. 위치 인자와 키워드 인자 전달

## 실습 과제

1. 두 함수의 중복 로그 코드 탐색
2. 공통 로그 함수 분리
3. 함수 재할당 방식 적용
4. `@decorator` 문법 변환
5. `@wraps` 적용 전후 비교

## 핵심 정리

```text
반복되는 공통 관심사
        ↓ 분리
고차 함수 + 클로저
        ↓ 문법 지원
@decorator
        ↓ 결과
핵심 함수 수정 없는 기능 확장
```

핵심 키워드:

- 일급 객체
- 고차 함수
- 클로저
- wrapper
- 함수 재할당
- 공통 관심사
- 메타데이터 보존

## 완료 기준

- [ ] 반복 코드와 공통 관심사의 구분
- [ ] 함수를 인자·반환값으로 사용하는 구조 이해
- [ ] 클로저와 wrapper의 관계 이해
- [ ] `@decorator`와 함수 재할당의 대응
- [ ] 적용 시점과 호출 시점의 구분
- [ ] `@wraps`의 필요성 설명
