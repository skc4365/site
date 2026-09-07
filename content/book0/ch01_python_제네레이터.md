# 파이썬 제네레이터

## 학습 목표

- 제네레이터와 일반 함수의 차이
- `yield`와 실행 중단·재개
- 지연 평가와 메모리 절약
- 제네레이터 표현식과 `yield from`
- 일회성 순회와 소진 상태

## 한눈에 보기

```text
일반 함수       → return → 결과 한 번 반환 → 종료
제네레이터 함수 → yield  → 값 하나 반환 → 중단 → 재개
```

제네레이터의 핵심: 모든 값을 미리 만들지 않고 필요할 때 하나씩 생성

## 1. 제네레이터가 필요한 이유

리스트 방식:

```python
def make_numbers(limit: int) -> list[int]:
    numbers = []
    for number in range(limit):
        numbers.append(number)
    return numbers


for number in make_numbers(5):
    print(number)
```

처리 구조:

```text
전체 값 생성 → 리스트 저장 → 반환 → 순회
```

문제점:

- 전체 데이터의 메모리 저장
- 첫 결과 전까지 전체 생성 대기
- 대용량·무한 데이터 처리의 어려움

제네레이터 방식:

```python
def generate_numbers(limit: int):
    for number in range(limit):
        yield number


for number in generate_numbers(5):
    print(number)
```

처리 구조:

```text
값 하나 생성 → 전달 → 다음 요청 대기 → 값 하나 생성
```

## 2. `yield` 기본 문법

```python
def count_three():
    yield 1
    yield 2
    yield 3
```

함수 호출 결과:

```python
numbers = count_three()
print(numbers)

# 결과 예시
# <generator object count_three at 0x...>
```

핵심:

- 함수 본문의 즉시 실행 없음
- 제네레이터 객체 반환
- 값 요청 시 첫 `yield`까지 실행
- 다음 요청 시 이전 위치부터 재개

## 3. `next()`로 실행 흐름 확인

```python
def count_three():
    print("첫 번째 준비")
    yield 1

    print("두 번째 준비")
    yield 2

    print("세 번째 준비")
    yield 3


numbers = count_three()

print(next(numbers))
print(next(numbers))
print(next(numbers))
```

출력 순서:

```text
첫 번째 준비
1
두 번째 준비
2
세 번째 준비
3
```

`yield` 지점의 보존 정보:

- 실행 위치
- 지역 변수
- 반복 상태

## 4. `for` 문의 자동 처리

```python
for number in count_three():
    print(number)
```

내부 흐름:

```text
next() 호출 → 값 수신 → 반복
                ↓ 값 없음
          StopIteration → 반복 종료
```

일반 사용: 직접 `next()`보다 `for` 문 우선

## 5. `return`과 `yield` 비교

### `return`

```python
def get_number() -> int:
    return 1
    return 2  # 실행 불가
```

- 값 한 번 반환
- 함수 즉시 종료
- 실행 상태 폐기

### `yield`

```python
def get_numbers():
    yield 1
    yield 2
```

- 값 여러 번 반환
- 함수 실행 일시 중단
- 실행 상태 보존
- 다음 요청 시 재개

## 6. 지역 변수 유지

```python
def running_total(values: list[int]):
    total = 0

    for value in values:
        total += value
        yield total


for total in running_total([10, 20, 30]):
    print(total)

# 결과
# 10
# 30
# 60
```

각 `yield` 사이에 유지되는 `total`

```text
0 → 10 → 중단 → 30 → 중단 → 60
```

## 7. 지연 평가

```python
def generate_messages():
    print("A 생성")
    yield "A"

    print("B 생성")
    yield "B"


messages = generate_messages()
print("객체 생성 완료")

print(next(messages))
print(next(messages))
```

결과:

```text
객체 생성 완료
A 생성
A
B 생성
B
```

지연 평가(lazy evaluation): 값이 필요한 시점의 계산

장점:

- 메모리 사용 감소
- 첫 결과의 빠른 전달
- 필요한 범위까지만 계산

## 8. 대용량 데이터 처리

```python
def read_large_file(path: str):
    with open(path, "r", encoding="utf-8") as file:
        for line in file:
            yield line.strip()


for line in read_large_file("large_data.txt"):
    if "ERROR" in line:
        print(line)
```

처리 단위: 전체 파일이 아닌 한 줄

활용 영역:

- 대용량 로그
- CSV 행 처리
- API 페이지네이션
- 실시간 이벤트
- AI 응답 스트리밍

## 9. 제네레이터 표현식

리스트 컴프리헨션:

```python
squares = [number**2 for number in range(5)]
print(squares)

# 결과
# [0, 1, 4, 9, 16]
```

제네레이터 표현식:

```python
squares = (number**2 for number in range(5))

for square in squares:
    print(square)
```

문법 차이:

```text
[표현식 for 값 in 반복가능객체] → 리스트
(표현식 for 값 in 반복가능객체) → 제네레이터
```

선택 기준:

- 결과 전체의 반복 사용: 리스트
- 한 번 순회·대용량 처리: 제네레이터
- 인덱스 접근 필요: 리스트
- 순차 처리만 필요: 제네레이터

## 10. 제네레이터의 소진

```python
numbers = (number for number in range(3))

print(list(numbers))
print(list(numbers))

# 결과
# [0, 1, 2]
# []
```

핵심: 제네레이터 객체의 일회성 순회

잘못된 사용:

```python
numbers = generate_numbers(3)

first = list(numbers)
second = list(numbers)  # 빈 리스트
```

재사용 방법:

```python
first = list(generate_numbers(3))
second = list(generate_numbers(3))
```

또는 리스트 저장:

```python
numbers = list(generate_numbers(3))

first = list(numbers)
second = list(numbers)
```

## 11. 조건을 포함한 제네레이터

```python
def even_numbers(limit: int):
    for number in range(limit):
        if number % 2 == 0:
            yield number


print(list(even_numbers(10)))

# 결과
# [0, 2, 4, 6, 8]
```

처리 파이프라인:

```text
원본 생성 → 조건 필터 → 값 전달
```

## 12. `yield from`

반복 위임:

```python
def group_a():
    yield "A1"
    yield "A2"


def group_b():
    yield "B1"
    yield "B2"


def all_items():
    yield from group_a()
    yield from group_b()


print(list(all_items()))

# 결과
# ['A1', 'A2', 'B1', 'B2']
```

다음 코드의 축약:

```python
def all_items():
    for item in group_a():
        yield item
    for item in group_b():
        yield item
```

활용:

- 여러 제네레이터 연결
- 중첩 데이터 순회
- 하위 작업에 반복 위임

## 13. 타입 힌트

```python
from collections.abc import Iterator


def generate_numbers(limit: int) -> Iterator[int]:
    for number in range(limit):
        yield number
```

`Iterator[int]`: 정수를 하나씩 제공하는 반복자

상세 타입:

```python
from collections.abc import Generator


def generate_numbers(limit: int) -> Generator[int, None, None]:
    for number in range(limit):
        yield number
```

`Generator[YieldType, SendType, ReturnType]`

일반적인 값 생성 함수: `Iterator[T]` 권장

## 14. 리스트와 제네레이터 비교

| 항목 | 리스트 | 제네레이터 |
| --- | --- | --- |
| 생성 방식 | 전체 값 즉시 생성 | 값 하나씩 생성 |
| 평가 시점 | 즉시 평가 | 지연 평가 |
| 메모리 | 전체 크기만큼 사용 | 현재 처리값 중심 |
| 재사용 | 여러 번 순회 | 한 번 순회 |
| 인덱스 | 지원 | 미지원 |
| 길이 확인 | `len()` | 직접 확인 불가 |
| 적합한 데이터 | 작고 반복 사용 | 크거나 연속적인 데이터 |

## 흔한 실수

### 함수 호출만 하고 값 미사용

```python
def task():
    print("작업 시작")
    yield "결과"


result = task()  # 본문 실행 전
```

실행 시작 방법:

```python
print(next(result))
```

### `len()`과 인덱스 사용

```python
numbers = generate_numbers(5)

# len(numbers)  # TypeError
# numbers[0]    # TypeError
```

필요 시 리스트 변환:

```python
numbers = list(generate_numbers(5))
print(len(numbers))
print(numbers[0])
```

### 두 번째 순회의 빈 결과

원인: 첫 번째 순회에서 제네레이터 소진

해결:

- 제네레이터 함수 다시 호출
- 결과를 리스트로 저장

## Try — 데이터 청크 생성

```python
from collections.abc import Iterator


def chunk_text(text: str, size: int) -> Iterator[str]:
    for start in range(0, len(text), size):
        yield text[start : start + size]


message = "제네레이터는 값을 필요한 순간에 생성합니다."

for chunk in chunk_text(message, 5):
    print(chunk)
```

확인 항목:

1. `yield`마다 반환되는 문자열
2. 마지막 청크의 길이
3. `size=3` 변경 결과
4. 제네레이터의 두 번째 순회 결과

## 실습 과제

1. 1부터 10까지의 홀수 생성
2. 로그 파일의 빈 줄 제외
3. 두 제네레이터의 `yield from` 연결
4. 리스트 컴프리헨션과 제네레이터 표현식 비교
5. `next()`를 이용한 중단·재개 확인

## 핵심 정리

```text
yield
  ↓
값 하나 반환 + 실행 상태 보존
  ↓
다음 요청에서 실행 재개
  ↓
지연 평가 + 메모리 절약
```

핵심 키워드:

- `yield`
- `next()`
- 지연 평가
- 실행 상태 보존
- 일회성 순회
- `StopIteration`
- 제네레이터 표현식
- `yield from`

## 완료 기준

- [ ] `return`과 `yield` 구분
- [ ] `next()` 실행 흐름 이해
- [ ] 지연 평가의 장점 설명
- [ ] 제네레이터 표현식 작성
- [ ] 소진된 제네레이터의 상태 확인
- [ ] `yield from`을 이용한 반복 위임
