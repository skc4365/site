# Chapter 08 쉬운 제조 실습 — 현재 작업과 확인된 기록 기억하기

## 쉬운 말

| 기술 용어 | 쉬운 표현 | 코드 이름 |
|---|---|---|
| Short-term memory | 현재 작업 기억 | `work_memory` |
| Long-term memory | 확인된 기록 | `saved_facts` |
| thread_id | 작업 번호 | `work_id` |
| user_id | 사용자 번호 | `user_id` |
| Checkpointer | 작업 저장장치 | `work_saver` |

## 현재 작업 기억

```python
from langgraph.checkpoint.memory import InMemorySaver

work_saver = InMemorySaver()

helper = create_agent(
    model=model,
    tools=[read_daily_count],
    checkpointer=work_saver,
)
```

같은 작업 번호를 사용하면 앞 질문을 이어갈 수 있습니다.

```python
config = {"configurable": {"thread_id": "work-001"}}

helper.invoke(
    {"messages": [{"role": "user", "content": "M-01을 확인해 줘."}]},
    config=config,
)

helper.invoke(
    {"messages": [{"role": "user", "content": "그 기계가 오늘 몇 개 만들었어?"}]},
    config=config,
)
```

## 오래 보관할 확인된 기록

```python
from langgraph.store.memory import InMemoryStore

saved_facts = InMemoryStore()
saved_facts.put(
    ("machines", "M-01", "checked-jobs"),
    "job-001",
    {
        "check_text": "벨트 상태 확인 완료",
        "source": "작업 기록 JOB-001",
        "confirmed": True,
    },
)
```

모델이 추측한 내용은 `confirmed=True`로 저장하면 안 됩니다.

## 분리 실습

다음 내용을 어디에 둘지 고릅니다.

| 내용 | 현재 작업 기억 | 확인된 기록 | 저장하지 않음 |
|---|:---:|:---:|:---:|
| 지금 보고 있는 M-01 |  |  |  |
| 사람이 완료한 점검 기록 |  |  |  |
| 모델이 짐작한 고장 원인 |  |  |  |
| API 비밀번호 |  |  |  |
| 방금 찾은 안내서 페이지 |  |  |  |

## 섞임 방지 테스트

1. `work-001`에서 M-01을 질문합니다.
2. `work-002`에서 M-02를 질문합니다.
3. 두 작업의 내용이 섞이지 않는지 확인합니다.
4. 다른 사용자가 M-01의 비공개 기록을 읽지 못하는지 확인합니다.

## 완료 기준

- [ ] 현재 작업 기억과 확인된 기록을 구분한다.
- [ ] 작업 번호가 다른 대화는 섞이지 않는다.
- [ ] 추측을 확인된 기록으로 저장하지 않는다.
- [ ] 기록에 확인 자료와 확인 여부가 있다.

