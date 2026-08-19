# 파이썬 데코레이터의 종류와 활용

## 학습 목표

- 데코레이터가 함수를 감싸는 원리를 설명한다.
- 함수형·인자형·클래스형 데코레이터를 목적에 맞게 선택한다.
- 메서드 데코레이터와 표준 라이브러리 데코레이터를 사용할 수 있다.
- 동기 함수와 비동기 함수에 맞는 데코레이터를 작성한다.

## 먼저 이해하는 핵심

데코레이터는 기존 함수나 클래스를 직접 수정하지 않고 공통 기능을 덧붙이는 문법입니다.

```python
@decorator
def greet() -> str:
    return "안녕하세요"
```

위 코드는 다음 코드와 같습니다.

```python
def greet() -> str:
    return "안녕하세요"


greet = decorator(greet)
```

호출 흐름은 다음과 같습니다.

```text
호출자 → wrapper → 원래 함수 → wrapper의 후처리 → 호출자
```

로깅, 실행 시간 측정, 권한 검사, 입력 검증, 캐싱, 재시도처럼 여러 함수에 반복되는 기능에 적합합니다.

## 1. 기본 함수형 데코레이터

가장 일반적인 형태입니다. 함수를 받아 새로운 함수를 반환합니다.

```python
from collections.abc import Callable
from functools import wraps
from typing import Any


def log_call(func: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        print(f"호출 시작: {func.__name__}")
        result = func(*args, **kwargs)
        print(f"호출 완료: {func.__name__}")
        return result

    return wrapper


@log_call
def add(a: int, b: int) -> int:
    return a + b


print(add(2, 3))
```

`*args`와 `**kwargs`를 사용하면 다양한 매개변수를 가진 함수를 감쌀 수 있습니다. `functools.wraps`는 원래 함수의 이름, 설명 문서, 타입 관련 메타데이터를 보존하므로 반드시 사용하는 것이 좋습니다.

### 사용하기 좋은 경우

- 모든 서비스 함수의 시작과 종료를 기록할 때
- API 요청 전후에 공통 처리를 수행할 때
- 함수 실행 시간을 측정할 때

## 2. 인자를 받는 데코레이터

설정값이 필요한 데코레이터는 함수를 한 겹 더 감쌉니다. `repeat(3)`이 실제 데코레이터를 만들어 반환하는 구조입니다.

```python
from collections.abc import Callable
from functools import wraps
from typing import Any


def repeat(count: int) -> Callable:
    if count < 1:
        raise ValueError("반복 횟수는 1 이상이어야 합니다.")

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            result: Any = None
            for _ in range(count):
                result = func(*args, **kwargs)
            return result

        return wrapper

    return decorator


@repeat(3)
def notify(message: str) -> None:
    print(message)


notify("작업이 완료되었습니다.")
```

### 사용하기 좋은 경우

- 역할 이름을 전달하는 권한 검사: `@require_role("admin")`
- 최대 횟수를 전달하는 재시도: `@retry(max_attempts=3)`
- 허용 시간을 전달하는 제한: `@timeout(seconds=5)`

## 3. 반환값을 검사하거나 변환하는 데코레이터

원래 함수의 결과를 받은 뒤 검증하거나 동일한 형태로 정리할 수 있습니다.

```python
from collections.abc import Callable
from functools import wraps


def ensure_non_empty(func: Callable[..., str]) -> Callable[..., str]:
    @wraps(func)
    def wrapper(*args, **kwargs) -> str:
        result = func(*args, **kwargs).strip()
        if not result:
            raise ValueError("결과가 비어 있습니다.")
        return result

    return wrapper


@ensure_non_empty
def create_summary(text: str) -> str:
    return text[:20]


print(create_summary("데코레이터 결과 검증 예제"))
```

검증 때문에 함수의 의미가 지나치게 숨겨진다면 일반 함수 호출로 분리하는 편이 더 명확합니다.

## 4. 클래스형 데코레이터

호출 횟수처럼 상태를 계속 보관해야 할 때 클래스를 데코레이터로 사용할 수 있습니다. 인스턴스가 호출 가능하려면 `__call__()`을 구현합니다.

```python
from functools import update_wrapper
from typing import Any


class CountCalls:
    def __init__(self, func):
        self.func = func
        self.count = 0
        update_wrapper(self, func)

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        self.count += 1
        print(f"{self.__name__} 호출 횟수: {self.count}")
        return self.func(*args, **kwargs)


@CountCalls
def predict(value: float) -> float:
    return value * 1.1


print(predict(100.0))
print(predict(120.0))
```

### 사용하기 좋은 경우

- 호출 횟수나 최근 실행 시간 등 상태를 보관할 때
- 설정과 상태 관리 로직이 복잡할 때
- 데코레이터 동작을 여러 메서드로 나누고 싶을 때

단순한 전후 처리라면 함수형 데코레이터가 더 읽기 쉽습니다.

## 5. 메서드 관련 내장 데코레이터

### `@property`: 메서드를 속성처럼 사용

계산된 값이나 검증이 필요한 값을 자연스러운 속성 문법으로 제공합니다.

```python
class Temperature:
    def __init__(self, celsius: float) -> None:
        self._celsius = celsius

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9 / 5 + 32


temperature = Temperature(25)
print(temperature.fahrenheit)
```

값을 읽을 때 네트워크 요청이나 긴 작업이 발생한다면 속성처럼 보이는 `@property`보다 명시적인 메서드가 낫습니다.

### `@classmethod`: 클래스 자체를 첫 번째 인자로 받기

대체 생성자나 클래스 단위 설정에 적합합니다.

```python
class ModelConfig:
    def __init__(self, model: str, temperature: float) -> None:
        self.model = model
        self.temperature = temperature

    @classmethod
    def for_test(cls) -> "ModelConfig":
        return cls(model="test-model", temperature=0.0)


config = ModelConfig.for_test()
print(config.model)
```

### `@staticmethod`: 인스턴스 상태가 필요 없는 관련 기능

클래스의 주제와 관련은 있지만 `self`나 `cls`가 필요 없는 함수에 사용합니다.

```python
class TextValidator:
    @staticmethod
    def is_valid(text: str) -> bool:
        return 0 < len(text.strip()) <= 500


print(TextValidator.is_valid("정상 입력"))
```

클래스와 관련성이 약하면 정적 메서드보다 모듈의 일반 함수로 두는 것이 좋습니다.

## 6. 표준 라이브러리 데코레이터

### `@lru_cache`: 반복 계산 결과 캐싱

```python
from functools import lru_cache


@lru_cache(maxsize=128)
def load_model_config(model_name: str) -> dict[str, str]:
    print("설정 읽기")
    return {"model": model_name, "status": "ready"}


print(load_model_config("agent-model"))
print(load_model_config("agent-model"))  # 캐시 사용
print(load_model_config.cache_info())
```

같은 입력에 항상 같은 결과를 내는 함수에 적합합니다. 사용자별 권한, 현재 시간, 변경되는 외부 데이터처럼 매번 결과가 달라질 수 있는 함수에는 주의해서 사용합니다.

### `@dataclass`: 데이터 중심 클래스 생성

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class SensorReading:
    sensor_id: str
    value: float
    unit: str


reading = SensorReading("motor-01", 72.5, "°C")
print(reading)
```

`@dataclass`는 `__init__`, `__repr__`, 비교 메서드 등을 자동 생성합니다. 데이터 보관이 중심인 클래스의 반복 코드를 줄일 때 사용합니다.

## 7. 비동기 함수 데코레이터

`async def`를 감쌀 때 wrapper도 `async def`로 만들고 원래 함수를 `await`해야 합니다.

```python
import asyncio
from collections.abc import Callable, Coroutine
from functools import wraps
from time import perf_counter
from typing import Any, TypeVar

T = TypeVar("T")


def measure_async(
    func: Callable[..., Coroutine[Any, Any, T]],
) -> Callable[..., Coroutine[Any, Any, T]]:
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> T:
        started = perf_counter()
        try:
            return await func(*args, **kwargs)
        finally:
            elapsed = perf_counter() - started
            print(f"{func.__name__}: {elapsed:.3f}초")

    return wrapper


@measure_async
async def fetch_sensor_data() -> dict[str, float]:
    await asyncio.sleep(0.1)
    return {"temperature": 72.5}


asyncio.run(fetch_sensor_data())
```

동기 wrapper로 비동기 함수를 감싸면 코루틴의 실제 실행 시간을 측정하지 못하거나 `await` 관련 오류가 생길 수 있습니다.

## 8. 여러 데코레이터의 실행 순서

여러 데코레이터는 함수와 가까운 아래쪽부터 적용되고, 호출할 때는 위쪽 wrapper부터 실행됩니다.

```python
def first(func):
    def wrapper():
        print("first 시작")
        func()
        print("first 종료")

    return wrapper


def second(func):
    def wrapper():
        print("second 시작")
        func()
        print("second 종료")

    return wrapper


@first
@second
def run() -> None:
    print("원래 함수")


run()
```

실행 결과:

```text
first 시작
second 시작
원래 함수
second 종료
first 종료
```

즉, `run = first(second(run))`입니다. 인증, 트랜잭션, 재시도처럼 순서에 따라 결과가 달라지는 데코레이터는 적용 순서를 특히 주의합니다.

## 종류별 선택 기준

| 종류 | 적합한 상황 | 대표 사례 |
| --- | --- | --- |
| 기본 함수형 | 설정 없는 공통 전후 처리 | 로깅, 시간 측정 |
| 인자형 | 적용할 때 설정 필요 | 권한, 재시도 횟수 |
| 반환값 처리형 | 결과 검증·정규화 | 빈 결과 검사 |
| 클래스형 | 호출 사이에 상태 유지 | 호출 횟수, 사용량 집계 |
| 메서드 내장형 | 클래스 인터페이스 구성 | property, classmethod |
| 표준 라이브러리형 | 검증된 일반 기능 활용 | lru_cache, dataclass |
| 비동기형 | 코루틴 전후 처리 | 비동기 API 로깅·측정 |

## 실무 사용 원칙

- 데코레이터 이름만으로 동작을 예상할 수 있게 작성합니다.
- 원래 함수의 반환값과 예외를 임의로 숨기지 않습니다.
- `@wraps` 또는 `update_wrapper`로 함수 메타데이터를 보존합니다.
- 한 데코레이터에는 한 가지 책임만 둡니다.
- 데코레이터를 너무 많이 겹치지 말고 적용 순서를 테스트합니다.
- 핵심 비즈니스 로직은 데코레이터 안에 숨기지 않습니다.
- 입력값, API 키, 비밀번호 같은 민감 정보는 로그에 남기지 않습니다.

## 흔한 실수

### 원래 함수의 결과를 반환하지 않음

```python
def wrong(func):
    def wrapper(*args, **kwargs):
        func(*args, **kwargs)  # return이 없어 호출 결과가 None이 됨

    return wrapper
```

다음처럼 원래 함수의 결과를 반환해야 합니다.

```python
def correct(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper
```

### 데코레이터 적용 시점과 함수 호출 시점을 혼동

데코레이터 바깥쪽 코드는 함수가 정의되며 데코레이터가 적용될 때 실행됩니다. 매번 호출되어야 하는 코드는 `wrapper` 안에 둡니다.

### 모든 예외를 처리해 버림

오류를 기록한 뒤에도 호출자가 알아야 하는 예외는 다시 발생시킵니다.

```python
def log_error(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as error:
            print(f"오류: {error}")
            raise

    return wrapper
```

## 실습 과제

1. 함수 실행 시간을 밀리초 단위로 출력하는 `@measure_time`을 작성합니다.
2. `@retry(max_attempts=3)`를 만들고 두 번째 호출에서 성공하는 함수로 확인합니다.
3. 문자열 반환값의 앞뒤 공백을 제거하는 `@strip_result`를 작성합니다.
4. 동일한 기능을 동기 함수와 비동기 함수에 각각 적용해 차이를 비교합니다.
5. 두 데코레이터의 순서를 바꾸고 출력 순서가 어떻게 달라지는지 기록합니다.

## 완료 기준

- [ ] `@decorator` 문법을 함수 재할당 형태로 설명할 수 있다.
- [ ] `@wraps`가 필요한 이유를 설명할 수 있다.
- [ ] 인자를 받는 데코레이터를 작성할 수 있다.
- [ ] `property`, `classmethod`, `staticmethod`의 차이를 구분할 수 있다.
- [ ] 동기·비동기 함수에 맞는 wrapper를 작성할 수 있다.

