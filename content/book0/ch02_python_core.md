# 클래스·데코레이터·예외 처리·로깅

## 수업 목표

- 클래스가 데이터와 동작을 묶는 이유를 설명한다.
- 데코레이터로 함수 실행 전후의 공통 처리를 분리한다.
- 예상 가능한 오류를 사용자 오류와 시스템 오류로 나눈다.
- `print()` 대신 `logging`으로 실행 정보를 남긴다.

## 먼저 보는 구조

```text
요청 → 데코레이터 → Service 클래스 → 예외 처리 → 로그와 결과
```

## 1. 서비스 클래스

```python
class TextService:
    def __init__(self, max_length: int = 100) -> None:
        self.max_length = max_length

    def summarize(self, text: str) -> str:
        cleaned = text.strip()
        if not cleaned:
            raise ValueError("본문을 입력하세요.")
        return cleaned[: self.max_length]


service = TextService(max_length=20)
print(service.summarize("클래스는 데이터와 동작을 함께 관리합니다."))
```

`self`는 현재 인스턴스를 뜻합니다. 설정값은 인스턴스에, 한 번만 사용하는 값은 메서드의 지역변수에 둡니다.

## 2. 데코레이터

```python
from functools import wraps
from time import perf_counter
from typing import Callable


def measure_time(func: Callable) -> Callable:
    @wraps(func)
    def wrapper(*args, **kwargs):
        started = perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            elapsed = perf_counter() - started
            print(f"{func.__name__}: {elapsed:.4f}s")

    return wrapper
```

데코레이터는 핵심 함수 코드를 바꾸지 않고 시간 측정·권한 확인·재시도 같은 공통 처리를 덧붙입니다.

## 3. 예외를 구분하기

```python
class ServiceError(Exception):
    """서비스 내부 처리 실패."""


def safe_summarize(service: TextService, text: str) -> str:
    try:
        return service.summarize(text)
    except ValueError:
        raise
    except Exception as error:
        raise ServiceError("요약 처리에 실패했습니다.") from error
```

모든 오류를 `except Exception: pass`로 숨기지 않습니다. 처리할 수 없는 오류는 원인을 연결해 다시 발생시킵니다.

## 4. 로깅

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("text-service")

logger.info("service_started")
```

API 키, 비밀번호, 전체 사용자 입력은 로그에 남기지 않습니다.

## Try — 실행시간과 오류를 기록하는 서비스

```python
@measure_time
def run(service: TextService, text: str) -> str:
    logger.info("summary_requested length=%d", len(text))
    try:
        result = safe_summarize(service, text)
        logger.info("summary_completed result_length=%d", len(result))
        return result
    except ValueError as error:
        logger.warning("invalid_input reason=%s", error)
        return "입력을 확인하세요."


print(run(TextService(max_length=12), "  로깅 가능한 서비스 만들기  "))
print(run(TextService(), " "))
```

## 실습 과제

1. 입력 길이가 500자를 넘으면 `ValueError`를 발생시킵니다.
2. 요청마다 임의의 `request_id`를 로그에 추가합니다.
3. `measure_time`의 `print()`를 `logger.info()`로 변경합니다.

## 강사 체크포인트

- 클래스를 단순 함수 대신 사용해야 하는 이유를 먼저 묻습니다.
- `raise ... from error`로 원인 예외를 보존하는 것을 보여줍니다.
- 로그 메시지와 사용자에게 보여줄 오류 문장을 분리합니다.

## 완료 기준

- [ ] 클래스의 생성자와 메서드를 작성할 수 있다.
- [ ] 데코레이터 실행 순서를 설명할 수 있다.
- [ ] 예외를 기록하고 안전한 메시지로 바꿀 수 있다.

