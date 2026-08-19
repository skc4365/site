# Chapter 07 쉬운 제조 실습 — 역할을 나눈 도우미 만들기

## 쉬운 말

| 기술 용어 | 쉬운 표현 | 코드 이름 |
|---|---|---|
| Supervisor | 진행 담당 | `manager` |
| Handoff | 다른 담당에게 넘기기 | `next_worker` |
| Production Agent | 숫자 담당 | `count_worker` |
| Manual Agent | 안내서 담당 | `guide_worker` |
| Partial failure | 일부 실패 | `partial` |

## 구조

```text
                 ┌→ [숫자 담당]
[진행 담당] ─────┼→ [안내서 담당]
                 └→ [보고서 담당]
```

처음에는 세 도우미를 서로 다른 서버로 만들지 않습니다. 한 Python 프로그램 안에서 역할만 나눕니다.

## 함께 쓰는 작업 메모

```python
from typing import Literal
from typing_extensions import TypedDict


class TeamNote(TypedDict, total=False):
    question: str
    next_worker: Literal["count", "guide", "report", "finish"]
    count_result: dict
    guide_result: dict
    report_text: str
    errors: list[str]
    move_count: int
```

`move_count`는 담당자끼리 계속 넘기는 문제를 막습니다.

## 진행 담당의 규칙

```text
숫자 질문 → count
안내서 질문 → guide
두 결과가 모임 → report
최대 이동 횟수 초과 → finish
```

처음에는 이 규칙을 일반 Python 코드로 작성합니다. 이후 의미가 복잡할 때만 LLM 분류를 사용합니다.

## 일부 실패 연습

안내서 담당이 실패했다고 가정합니다.

```python
team_result = {
    "status": "partial",
    "count_result": {"made_count": 100, "bad_count": 3},
    "guide_result": None,
    "errors": ["안내서를 찾지 못했습니다."],
}
```

최종 답변은 확인한 숫자는 알려주되, 안내서 부분은 실패했다고 분명히 말해야 합니다.

## 비교 실습

같은 질문을 Chapter 6의 도우미 한 명과 이번 역할 분리 구조에 각각 실행합니다.

| 비교 항목 | 도우미 한 명 | 역할 분리 |
|---|---:|---:|
| 답이 맞는가? |  |  |
| 걸린 시간 |  |  |
| 모델 호출 수 |  |  |
| 오류 위치 찾기 |  |  |

역할 분리가 더 복잡하기만 하면 Chapter 6 구조를 유지합니다.

## 완료 기준

- [ ] 각 담당의 일이 겹치지 않는다.
- [ ] 진행 담당이 다음 역할을 고른다.
- [ ] 최대 이동 횟수가 있다.
- [ ] 일부 실패를 숨기지 않는다.
- [ ] 역할 분리가 필요한 이유를 설명할 수 있다.

