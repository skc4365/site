# Chapter 05 쉬운 제조 실습 — 작업 순서를 그래프로 만들기

## 쉬운 말

| LangGraph 용어 | 쉬운 표현 |
|---|---|
| State | 작업 메모 |
| Node | 한 단계의 일 |
| Edge | 다음 단계로 가는 길 |
| Graph | 전체 작업 순서도 |

## 만들 순서도

```text
시작
 → 기계 이름 검사
    ├─ 맞음 → 데이터 읽기 → 끝
    └─ 틀림 → 오류 안내 → 끝
```

## 작업 메모

```python
from typing_extensions import TypedDict


class WorkNote(TypedDict, total=False):
    machine_id: str
    is_valid: bool
    message: str
    machine_data: dict
```

`WorkNote`는 각 단계가 함께 사용하는 메모입니다.

## 단계 함수

```python
def check_machine_name(note: WorkNote) -> dict:
    machine_id = note.get("machine_id", "").upper()
    is_valid = machine_id.startswith("M-")
    return {
        "machine_id": machine_id,
        "is_valid": is_valid,
        "message": "" if is_valid else "기계 이름은 M-01처럼 입력해 주세요.",
    }


def read_machine_data(note: WorkNote) -> dict:
    return {
        "machine_data": {
            "machine_id": note["machine_id"],
            "made_count": 100,
            "bad_count": 3,
        }
    }
```

## 그래프 연결

```python
from langgraph.graph import END, START, StateGraph


def choose_next(note: WorkNote):
    return "read_data" if note["is_valid"] else END


builder = StateGraph(WorkNote)
builder.add_node("check_name", check_machine_name)
builder.add_node("read_data", read_machine_data)
builder.add_edge(START, "check_name")
builder.add_conditional_edges("check_name", choose_next)
builder.add_edge("read_data", END)

graph = builder.compile()
```

## 실행 비교

```python
print(graph.invoke({"machine_id": "M-01"}))
print(graph.invoke({"machine_id": "01"}))
```

두 결과가 다른 길을 지나야 합니다.

## 종이 실습

각 단계 아래에 다음을 적습니다.

- 읽는 작업 메모
- 새로 쓰는 작업 메모
- 실패했을 때 가는 길

## 완료 기준

- [ ] State·Node·Edge를 쉬운 말로 설명한다.
- [ ] 정상 입력과 잘못된 입력이 다른 길로 간다.
- [ ] 각 단계가 한 가지 일만 한다.
- [ ] 모든 길이 끝에 도착한다.

