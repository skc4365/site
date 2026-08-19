# Chapter 02 쉬운 제조 실습 — 생각·기능·기억 나누기

## 쉬운 말

| 기술 용어 | 쉬운 표현 |
|---|---|
| 추론 | 다음에 무엇을 할지 고르기 |
| Tool | 프로그램이 사용하는 기능 |
| Memory | 이전 작업을 기억하는 곳 |
| Reflection | 답을 확인하고 한 번 고치기 |

## 도우미 내부 구조

```text
[다음 행동 고르기]
      │
      ├─ [기계 데이터 읽기 기능]
      ├─ [안내서 찾기 기능]
      └─ [보고서 초안 저장 기능]

[현재 작업 기억]
  - 선택한 기계
  - 확인한 날짜
  - 방금 찾은 자료
```

## 첫 번째 기능 만들기

```python
from langchain.tools import tool


@tool
def read_machine(machine_id: str) -> dict:
    """교육용 데이터에서 기계 상태를 읽습니다."""
    if not machine_id.startswith("M-"):
        return {"ok": False, "message": "기계 이름은 M-01처럼 입력해 주세요."}

    return {
        "ok": True,
        "machine_id": machine_id,
        "alert": "진동이 평소보다 큼",
        "source": "연습 데이터",
    }
```

변수 뜻:

- `machine_id`: 기계 이름
- `ok`: 기능이 정상적으로 끝났는가?
- `message`: 사용자가 이해할 수 있는 안내
- `source`: 어느 자료를 확인했는가?

## 기능을 에이전트에 연결하기

```python
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

helper = create_agent(
    model=ChatOpenAI(model="gpt-4o-mini", temperature=0),
    tools=[read_machine],
    system_prompt="숫자와 기계 상태는 반드시 기능으로 확인하세요.",
)
```

여기서 `helper`는 도우미, `read_machine`은 도우미가 사용하는 읽기 기능입니다.

## 기억 구분하기

```text
현재 작업 기억
  M-01을 보고 있다는 사실
  오늘 날짜를 조회했다는 사실

오래 보관할 정보
  사람이 확인한 점검 결과
  실제로 완료된 작업 번호

보관하면 안 되는 정보
  모델이 짐작한 고장 원인
  API 비밀번호
```

## 실습

`read_machine()`에 다음 입력을 넣었을 때 결과를 예상합니다.

```python
read_machine.invoke({"machine_id": "M-01"})
read_machine.invoke({"machine_id": "01"})
```

그다음 `read_today_count(machine_id)` 기능을 직접 설계합니다.

## 완료 기준

- [ ] 다음 행동 고르기와 실제 기능 실행을 구분했다.
- [ ] 읽기 기능의 입력과 결과를 설명할 수 있다.
- [ ] 현재 작업 기억과 오래 보관할 정보를 분리했다.
- [ ] 잘못된 기계 이름을 이해하기 쉽게 안내한다.

