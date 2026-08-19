# async/await 및 asyncio 비동기 프로그래밍

## 수업 목표

- 동시성과 병렬성의 차이를 설명한다.
- 코루틴을 정의하고 `await`한다.
- `TaskGroup`으로 여러 I/O 작업을 함께 실행한다.
- 시간 제한과 취소를 처리한다.

## 먼저 보는 구조

```text
작업 A: 요청 ───── 기다림 ─→ 응답
작업 B:    요청 ───── 기다림 ─→ 응답
                같은 시간 구간에 진행
```

> `asyncio`는 네트워크·DB처럼 기다림이 많은 I/O 작업에 적합합니다. CPU 계산을 자동으로 빠르게 만드는 기능은 아닙니다.

## 1. 첫 코루틴

```python
import asyncio


async def fetch_message(name: str, delay: float) -> str:
    print(name, "시작")
    await asyncio.sleep(delay)
    return f"{name} 완료"


async def main() -> None:
    result = await fetch_message("작업-A", 0.5)
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
```

`await`는 결과를 기다리는 동안 이벤트 루프가 다른 코루틴을 실행할 기회를 줍니다.

## 2. 순차 실행과 동시 실행

순차 실행:

```python
first = await fetch_message("A", 1)
second = await fetch_message("B", 1)
```

동시 실행:

```python
async with asyncio.TaskGroup() as group:
    first_task = group.create_task(fetch_message("A", 1))
    second_task = group.create_task(fetch_message("B", 1))

results = [first_task.result(), second_task.result()]
```

Python 3.12에서는 관련 작업을 묶을 때 `TaskGroup`을 우선 학습합니다. 한 작업이 실패하면 나머지를 취소하고 오류를 모아 전달합니다.

## 3. 시간 제한

```python
async def fetch_with_timeout() -> str:
    try:
        async with asyncio.timeout(1.0):
            return await fetch_message("느린 작업", 2.0)
    except TimeoutError:
        return "시간 초과"
```

외부 API 요청에는 반드시 연결·읽기 시간 제한을 둡니다.

## Try — 세 서비스 동시에 호출하기

```python
from time import perf_counter


async def call_service(name: str, delay: float) -> dict[str, str]:
    await asyncio.sleep(delay)
    return {"service": name, "status": "ok"}


async def main() -> None:
    started = perf_counter()

    async with asyncio.TaskGroup() as group:
        tasks = [
            group.create_task(call_service("profile", 0.8)),
            group.create_task(call_service("search", 0.5)),
            group.create_task(call_service("history", 0.6)),
        ]

    results = [task.result() for task in tasks]
    print(results)
    print(f"elapsed={perf_counter() - started:.2f}s")


asyncio.run(main())
```

전체 시간은 각 시간을 더한 약 1.9초가 아니라 가장 느린 작업에 가까운 약 0.8초입니다.

## 실습 과제

1. 작업 하나가 `RuntimeError`를 발생하도록 만들어 `TaskGroup`의 동작을 관찰합니다.
2. 각 작업에 0.7초 시간 제한을 적용합니다.
3. 성공과 실패를 같은 결과 구조로 정리합니다.

## 강사 체크포인트

- `async def`를 호출한 결과가 즉시 값이 아니라 코루틴임을 보여줍니다.
- 비동기 함수 안에서 `time.sleep()`을 사용하면 전체 이벤트 루프가 멈춘다는 점을 비교합니다.
- `asyncio.run()`은 프로그램 진입점에서 한 번만 호출합니다.

## 완료 기준

- [ ] 코루틴·Task·이벤트 루프를 구분할 수 있다.
- [ ] `TaskGroup`으로 I/O 작업을 동시에 실행할 수 있다.
- [ ] 시간 제한과 실패 전파를 설명할 수 있다.
