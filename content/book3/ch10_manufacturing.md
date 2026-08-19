# Chapter 10 쉬운 제조 실습 — 독립된 도우미끼리 대화하기

## 쉬운 말

| 기술 용어 | 쉬운 표현 |
|---|---|
| A2A | 도우미 프로그램끼리 대화하는 규칙 |
| Agent Card | 도우미 소개 카드 |
| Agent Skill | 도우미가 할 수 있는 일 |
| Agent Executor | 요청을 실제 코드에 전달하는 부분 |
| Orchestrator | 진행 담당 도우미 |

## 구조

```text
[진행 담당 도우미]
    ├─ A2A → [숫자 담당 도우미]
    └─ A2A → [안내서 담당 도우미]
```

각 담당 도우미는 별도 프로그램과 주소를 가집니다.

## 도우미 소개 카드

```python
from a2a.types import AgentCapabilities, AgentCard, AgentSkill

skill = AgentSkill(
    id="read_daily_count",
    name="오늘 만든 개수 확인",
    description="연습 데이터에서 기계가 만든 개수를 확인합니다.",
    tags=["machine", "count", "read-only"],
    examples=["M-01이 오늘 몇 개 만들었어?"],
)

card = AgentCard(
    name="Count Helper",
    description="기계별 오늘의 개수를 읽는 도우미",
    url="http://localhost:10011",
    version="1.0.0",
    default_input_modes=["text"],
    default_output_modes=["text"],
    capabilities=AgentCapabilities(streaming=False),
    skills=[skill],
)
```

소개 카드에는 할 수 없는 일도 분명히 적습니다. 이 도우미는 읽기만 가능하고 기계를 조작하지 않습니다.

## 실습 순서

1. 항상 같은 문장을 답하는 도우미 서버를 만듭니다.
2. Client가 소개 카드를 읽습니다.
3. Client가 질문을 보내고 답을 받습니다.
4. 고정 답을 실제 연습 데이터 읽기로 바꿉니다.
5. 서버를 끄고 진행 담당이 일부 실패를 표시하는지 확인합니다.

## MCP와 A2A 다시 구분하기

```text
MCP: 도우미가 데이터 기능을 사용한다.
A2A: 진행 담당이 다른 도우미에게 일을 맡긴다.
```

## 완료 기준

- [ ] 소개 카드만 보고 도우미의 역할을 설명한다.
- [ ] MCP와 A2A의 차이를 설명한다.
- [ ] 다른 서버의 실패를 감지한다.
- [ ] 요청 횟수와 기다리는 시간에 제한이 있다.

