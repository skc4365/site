# 파이썬 `with` 구문

## 학습 목표

- 자원 관리와 정리 작업
- `with`의 실행 흐름
- 파일·Lock 사용법
- 사용자 정의 컨텍스트 매니저

## 한눈에 보기

```text
자원 열기 → 작업 → 자동 정리
```

`with`의 핵심: 작업 종료 시 정리 코드 자동 실행

대표 자원:

- 파일
- 데이터베이스 연결
- 네트워크 연결
- Thread Lock
- 임시 디렉터리

## 1. `with`가 필요한 이유

직접 파일 닫기:

```python
file = open("message.txt", "w", encoding="utf-8")
file.write("안녕하세요")
file.close()
```

문제점:

- `close()` 누락 가능성
- 작업 중 예외 발생
- 반복되는 정리 코드

`with` 사용:

```python
with open("message.txt", "w", encoding="utf-8") as file:
    file.write("안녕하세요")
```

효과:

- 블록 진입 시 파일 열기
- 블록 내부에서 파일 사용
- 블록 종료 시 파일 닫기
- 예외 발생 시에도 정리

## 2. 기본 문법

```python
with 컨텍스트_매니저 as 변수:
    작업
```

구성 요소:

| 요소 | 의미 |
| --- | --- |
| `with` | 컨텍스트 블록 시작 |
| 컨텍스트 매니저 | 자원 준비·정리 담당 객체 |
| `as 변수` | 준비된 자원 참조 |
| 들여쓰기 블록 | 자원 사용 범위 |

실행 흐름:

```text
__enter__() → with 블록 → __exit__()
```

## 3. `try-finally`와 비교

`with` 없는 형태:

```python
file = open("message.txt", "r", encoding="utf-8")

try:
    content = file.read()
finally:
    file.close()
```

같은 목적의 `with`:

```python
with open("message.txt", "r", encoding="utf-8") as file:
    content = file.read()
```

핵심 차이:

| `try-finally` | `with` |
| --- | --- |
| 정리 코드 직접 작성 | 정리 코드 자동 호출 |
| 자원별 종료 방법 확인 | 컨텍스트 매니저에 위임 |
| 긴 코드 | 짧은 자원 범위 |

## 4. 파일 쓰기

```python
with open("result.txt", "w", encoding="utf-8") as file:
    file.write("첫 번째 줄\n")
    file.write("두 번째 줄\n")
```

파일 모드:

| 모드 | 용도 |
| --- | --- |
| `"r"` | 읽기 |
| `"w"` | 새로 쓰기·기존 내용 삭제 |
| `"a"` | 끝에 추가 |
| `"b"` | 이미지 등 바이너리 데이터 |

주의: `"w"` 모드의 기존 내용 삭제

## 5. 파일 읽기

전체 읽기:

```python
with open("result.txt", "r", encoding="utf-8") as file:
    content = file.read()

print(content)
```

한 줄씩 읽기:

```python
with open("result.txt", "r", encoding="utf-8") as file:
    for line in file:
        print(line.strip())
```

블록 종료 후 상태:

```python
print(file.closed)

# 결과
# True
```

## 6. 여러 자원 사용

```python
with (
    open("input.txt", "r", encoding="utf-8") as source,
    open("output.txt", "w", encoding="utf-8") as target,
):
    target.write(source.read())
```

종료 순서:

```text
source 열기 → target 열기 → 작업 → target 닫기 → source 닫기
```

핵심: 열린 순서의 역순 정리

## 7. 예외 발생 시 정리

```python
try:
    with open("result.txt", "r", encoding="utf-8") as file:
        content = file.read()
        raise ValueError("처리 오류")
except ValueError as error:
    print(error)

print(file.closed)

# 결과
# 처리 오류
# True
```

핵심:

- 예외 발생
- `__exit__()` 호출
- 파일 닫기
- 바깥 `except`로 예외 전달

## 8. Thread Lock

직접 잠금 관리:

```python
lock.acquire()
try:
    shared_count += 1
finally:
    lock.release()
```

`with` 사용:

```python
from threading import Lock


lock = Lock()
shared_count = 0

with lock:
    shared_count += 1
```

실행 흐름:

```text
Lock 획득 → 공유 데이터 작업 → Lock 해제
```

## 9. 함수형 컨텍스트 매니저

`contextlib.contextmanager` 활용:

```python
from collections.abc import Iterator
from contextlib import contextmanager
from time import perf_counter


@contextmanager
def timer(name: str) -> Iterator[None]:
    started = perf_counter()
    print(f"{name} 시작")

    try:
        yield
    finally:
        elapsed = perf_counter() - started
        print(f"{name} 완료: {elapsed:.3f}초")


with timer("데이터 처리"):
    total = sum(range(1_000_000))
```

`yield` 기준:

```text
yield 이전 → 진입 처리
yield 값    → as 변수
yield 이후 → 종료 처리
```

필수 요소: 정리 코드를 위한 `try-finally`

## 10. 클래스형 컨텍스트 매니저

```python
class ServiceConnection:
    def __enter__(self) -> "ServiceConnection":
        print("연결 시작")
        return self

    def send(self, message: str) -> None:
        print("전송:", message)

    def __exit__(self, exc_type, exc_value, traceback) -> bool:
        print("연결 종료")
        return False


with ServiceConnection() as connection:
    connection.send("요청 데이터")
```

메서드 역할:

| 메서드 | 역할 |
| --- | --- |
| `__enter__()` | 자원 준비, `as` 값 반환 |
| `__exit__()` | 자원 정리, 예외 정보 수신 |

`__exit__()` 반환값:

- `False`: 예외를 바깥으로 전달
- `True`: 예외 억제

기본 선택: `False`

## 11. 비동기 `async with`

비동기 자원:

- 비동기 HTTP 연결
- 비동기 DB 세션
- 비동기 Lock

```python
import asyncio


lock = asyncio.Lock()


async def update() -> None:
    async with lock:
        await asyncio.sleep(0.1)
        print("업데이트 완료")


asyncio.run(update())
```

실행 흐름:

```text
await __aenter__() → async with 블록 → await __aexit__()
```

구분:

- 동기 자원: `with`
- 비동기 자원: `async with`

## 흔한 실수

### 블록 밖에서 닫힌 파일 사용

```python
with open("result.txt", "r", encoding="utf-8") as file:
    content = file.read()

file.read()  # ValueError: I/O operation on closed file
```

권장 방식:

```python
with open("result.txt", "r", encoding="utf-8") as file:
    content = file.read()

print(content)
```

### `as` 변수와 데이터 혼동

```python
with open("result.txt", "r", encoding="utf-8") as file:
    content = file.read()
```

- `file`: 파일 객체
- `content`: 읽은 문자열

### 예외 무조건 억제

```python
def __exit__(self, exc_type, exc_value, traceback) -> bool:
    return True
```

위험: 오류 은폐

권장 기본값: `False`

## 선택 기준

`with` 사용 대상:

- 작업 후 반드시 정리할 자원
- 시작과 종료가 한 쌍인 작업
- 예외 발생 시에도 종료가 필요한 작업
- 사용 범위의 명확한 표시가 필요한 작업

일반 함수 사용 대상:

- 정리 작업 없는 단순 계산
- 상태 없는 데이터 변환
- 시작·종료 경계 없는 작업

## Try — 파일 복사

```python
from pathlib import Path


source_path = Path("input.txt")
target_path = Path("output.txt")

with (
    source_path.open("r", encoding="utf-8") as source,
    target_path.open("w", encoding="utf-8") as target,
):
    for line in source:
        target.write(line.upper())
```

확인 항목:

1. 두 파일의 자동 닫기
2. 입력 문자열의 대문자 변환
3. 입력 파일 부재 시 `FileNotFoundError`
4. `"w"`와 `"a"` 모드 차이

## 핵심 정리

```text
with = 자원 준비 + 제한된 사용 범위 + 자동 정리
```

핵심 키워드:

- 컨텍스트 매니저
- `__enter__()`
- `__exit__()`
- `try-finally`
- 자동 정리
- 예외 안전성
- `contextmanager`
- `async with`

## 완료 기준

- [ ] `with` 기본 문법 이해
- [ ] 파일 자동 닫기 확인
- [ ] `try-finally`와의 관계 이해
- [ ] 함수형 컨텍스트 매니저 작성
- [ ] `with`와 `async with` 구분
