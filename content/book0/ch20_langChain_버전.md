# LangChain 0.3과 1.0 버전·문법 비교 가이드

## 비교 기준

대상:

- LangChain Python
- `langchain 0.3.x`
- `langchain 1.0` 마이그레이션 기준
- 현재 v1 계열 권장 문법

핵심 결론:

```text
LangChain 0.3
├─ LCEL·Runnable 중심 전환기
├─ 공급자별 패키지 분리
├─ LangGraph의 create_react_agent
└─ 기존 Chain API와 새 API의 공존

LangChain 1.0
├─ Agent 중심 최소 namespace
├─ langchain.agents.create_agent
├─ Middleware 기반 확장
├─ 표준 Content Block
└─ 기존 Chain·Retriever 일부 → langchain-classic
```

> 가장 큰 변화: RAG 핵심 객체의 전면 교체보다 `Agent API`, `import 경로`, `legacy 기능 위치`의 변화.

---

## 1. 한눈에 보는 차이

| 구분 | LangChain 0.3 | LangChain 1.0 |
|---|---|---|
| 중심 방향 | Component·Chain·LangGraph 혼합 | Agent 중심 API |
| Agent 생성 | `langgraph.prebuilt.create_react_agent` | `langchain.agents.create_agent` |
| Agent Prompt 인자 | `prompt=` | `system_prompt=` |
| Agent 확장 | hook·상태 함수·LangGraph 직접 구성 | Middleware |
| 최상위 `langchain` | Chain·Retriever 등 넓은 namespace | 핵심 Agent 구성요소 중심 |
| Legacy Chain | `langchain.chains` | `langchain_classic.chains` |
| Legacy Retriever | `langchain.retrievers` | `langchain_classic.retrievers` |
| Message 표준화 | `content` 중심 | `content_blocks` 추가 |
| Message text | 주로 `response.content` | `response.text` 속성 추가·권장 |
| Structured Output | Agent 후속 node·기존 방식 | `ToolStrategy`·`ProviderStrategy` |
| Runtime 정적 정보 | `config["configurable"]` 중심 | `context=` + `context_schema` |
| Agent State Schema | Pydantic·dataclass 허용 사례 | `TypedDict` 계열만 지원 |
| Agent Streaming node | `"agent"` | `"model"` |
| Python 최소 버전 | 프로젝트·세부 패키지별 확인 | Python 3.10 이상 |

변하지 않은 핵심:

- `Document`
- `ChatPromptTemplate`
- `Runnable`·LCEL `|`
- `.invoke()`·`.stream()`·`.batch()`
- `langchain_openai` 등 공급자별 패키지
- `langchain_community` Loader
- `langchain_text_splitters`
- Vector Store별 통합 패키지

---

## 2. 패키지 구조

```text
LangChain 0.3
┌──────────────────────────────────────────┐
│ langchain                                │
│ ├─ chains                                │
│ ├─ retrievers                            │
│ └─ 일부 고수준 기능                      │
├──────────────────────────────────────────┤
│ langchain-core                           │
│ langchain-community                      │
│ langchain-openai                         │
│ langgraph                                │
└──────────────────────────────────────────┘

LangChain 1.0
┌──────────────────────────────────────────┐
│ langchain                                │
│ ├─ agents                                │
│ ├─ messages                              │
│ ├─ tools                                 │
│ ├─ chat_models                           │
│ └─ embeddings                            │
├──────────────────────────────────────────┤
│ langchain-classic                        │
│ ├─ legacy chains                         │
│ ├─ legacy retrievers                     │
│ ├─ indexes                               │
│ └─ hub                                   │
├──────────────────────────────────────────┤
│ langchain-core                           │
│ langchain-community                      │
│ langchain-openai                         │
│ langgraph                                │
└──────────────────────────────────────────┘
```

v1 주요 namespace:

| namespace | 주요 항목 |
|---|---|
| `langchain.agents` | `create_agent`, `AgentState` |
| `langchain.messages` | Message·Content Block·`trim_messages` |
| `langchain.tools` | `@tool`, `BaseTool`, 주입 도우미 |
| `langchain.chat_models` | `init_chat_model`, `BaseChatModel` |
| `langchain.embeddings` | `init_embeddings`, `Embeddings` |
| `langchain_classic` | 기존 Chain·Retriever·Index·Hub |
| `langchain_core` | Prompt·Runnable·Document 등 저수준 표준 |

---

## 3. 설치와 버전 고정

### 0.3 전용 환경

```powershell
uv venv --python 3.11 .venv-lc03
.\.venv-lc03\Scripts\Activate.ps1
uv pip install "langchain>=0.3,<0.4" "langchain-core>=0.3,<0.4"
uv pip install "langchain-openai<1" "langchain-community<1" "langgraph<1"
```

### 1.x 전용 환경

```powershell
uv venv --python 3.12 .venv-lc1
.\.venv-lc1\Scripts\Activate.ps1
uv pip install "langchain>=1,<2" langchain-openai langchain-community langgraph
```

Legacy Chain 필요 시:

```powershell
uv pip install langchain-classic
```

버전 확인:

```python
from importlib.metadata import version


packages = [
    "langchain",
    "langchain-core",
    "langchain-openai",
    "langchain-community",
    "langgraph",
]

for package in packages:
    try:
        print(package, version(package))
    except Exception:
        print(package, "미설치")
```

환경 분리 이유:

- 의존성 충돌 방지
- 동일 예제의 버전별 재현
- 자동 업그레이드에 따른 import 오류 방지
- 교육 자료와 실행 환경의 일치

> `langchain==0.3.*` 단독 고정만으로 전체 재현 보장 불가. 통합 패키지와 `langgraph` 버전도 lock 파일로 고정.

---

## 4. Import 경로 비교

### Prompt·Message·Document

0.3 권장:

```python
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
```

1.0 가능:

```python
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain.messages import AIMessage, HumanMessage
```

v1에서도 유효한 core 경로:

```python
from langchain_core.messages import AIMessage, HumanMessage
```

권장 기준:

```text
Prompt·Runnable 라이브러리 코드 → langchain_core
Agent 애플리케이션 코드          → langchain 재노출 경로 가능
```

### 공급자 통합

0.3·1.0 공통:

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_anthropic import ChatAnthropic
```

과거 단일 패키지형 import 회피:

```python
# 회피 대상
from langchain.chat_models import ChatOpenAI
```

### Loader·Text Splitter

0.3·1.0 공통:

```python
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
```

---

## 5. 모델 초기화 문법

### 공급자별 클래스—0.3·1.0 공통

```python
import os

from langchain_openai import ChatOpenAI


model = ChatOpenAI(
    model=os.environ["OPENAI_CHAT_MODEL"],
    timeout=30,
    max_retries=2,
)
```

장점:

- 공급자별 옵션의 명확성
- IDE 자동완성
- 기존 0.3 코드의 작은 변경량

### 통합 초기화—1.0

```python
import os

from langchain.chat_models import init_chat_model


model = init_chat_model(
    os.environ["OPENAI_CHAT_MODEL"],
    model_provider="openai",
)
```

Provider prefix 방식:

```python
model = init_chat_model("openai:모델-ID")
```

선택 기준:

| 방식 | 적합한 경우 |
|---|---|
| `ChatOpenAI(...)` | OpenAI 전용 기능·세부 옵션 |
| `init_chat_model(...)` | 공급자 교체·공통 초기화 |

> v1의 `init_chat_model`은 추가 선택지. `ChatOpenAI` 폐기 의미 아님.

---

## 6. Prompt와 LCEL—거의 동일

### 0.3

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "간결한 기술 도우미"),
        ("human", "질문: {question}"),
    ]
)
model = ChatOpenAI(model="사용-가능한-모델-ID")

chain = prompt | model | StrOutputParser()
answer = chain.invoke({"question": "LCEL의 의미는?"})
```

### 1.0

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "간결한 기술 도우미"),
        ("human", "질문: {question}"),
    ]
)
model = ChatOpenAI(model="사용-가능한-모델-ID")

chain = prompt | model | StrOutputParser()
answer = chain.invoke({"question": "LCEL의 의미는?"})
```

판정:

```text
동일 문법
```

유지되는 Runnable 메서드:

- `invoke`
- `ainvoke`
- `stream`
- `astream`
- `batch`
- `with_retry`
- `with_fallbacks`
- `with_config`

---

## 7. Legacy LLMChain

### 0.3 import

```python
from langchain.chains import LLMChain


chain = LLMChain(prompt=prompt, llm=model)
result = chain.invoke({"question": "Runnable이란?"})
```

### 1.0 호환 import

```python
from langchain_classic.chains import LLMChain


chain = LLMChain(prompt=prompt, llm=model)
result = chain.invoke({"question": "Runnable이란?"})
```

### 1.0 권장 LCEL

```python
from langchain_core.output_parsers import StrOutputParser


chain = prompt | model | StrOutputParser()
result = chain.invoke({"question": "Runnable이란?"})
```

```text
LLMChain 유지 필요
  └─ langchain-classic

신규 코드
  └─ Prompt | Model | Parser
```

---

## 8. 호출 메서드 변화

이전 호출 패턴:

```python
result = chain.run("질문")
result = chain({"question": "질문"})
text = model.predict("질문")
```

0.3 이후 권장·1.0 표준:

```python
result = chain.invoke({"question": "질문"})
message = model.invoke("질문")
```

비동기·Streaming·Batch:

```python
message = await model.ainvoke("질문")

for chunk in model.stream("질문"):
    print(chunk.text, end="", flush=True)

messages = model.batch(
    ["질문 1", "질문 2"],
    config={"max_concurrency": 2},
)
```

마이그레이션 치환표:

| 이전 | 현재 |
|---|---|
| `.run(input)` | `.invoke(input)` |
| `chain(input)` | `.invoke(input)` |
| `.predict(text)` | `.invoke(text)` |
| `.apredict(text)` | `.ainvoke(text)` |

---

## 9. AIMessage 문법

### 0.3 중심

```python
response = model.invoke("LCEL 핵심 요약")
text = response.content
```

### 1.0 권장

```python
response = model.invoke("LCEL 핵심 요약")
text = response.text
```

### v1 Content Block

```python
for block in response.content_blocks:
    block_type = block.get("type")

    if block_type == "text":
        print(block.get("text", ""))
    elif block_type == "reasoning":
        print(block.get("reasoning", ""))
```

비교:

| 속성 | 용도 |
|---|---|
| `response.content` | 기존 문자열·공급자 원본 구조와의 호환 |
| `response.text` | 텍스트 결과 접근 |
| `response.content_blocks` | 공급자 중립 표준 Block 접근 |
| `response.usage_metadata` | Token 사용량 |

메서드와 속성 차이:

```python
# v1
text = response.text

# 이전 호환 문법·경고 가능
text = response.text()
```

---

## 10. Tool 정의

### 0.3 권장 경로

```python
from langchain_core.tools import tool


@tool
def add(a: int, b: int) -> int:
    """두 정수의 합."""
    return a + b
```

### 1.0 간결 경로

```python
from langchain.tools import tool


@tool
def add(a: int, b: int) -> int:
    """두 정수의 합."""
    return a + b
```

v1에서도 가능한 core 경로:

```python
from langchain_core.tools import tool
```

핵심:

- 함수 Type Hint
- 명확한 Docstring
- 도구명·설명·입력 Schema
- 공급자 독립 `BaseTool`

---

## 11. Agent 생성—가장 큰 문법 변화

### 0.3

```python
from langgraph.prebuilt import create_react_agent


agent = create_react_agent(
    model=model,
    tools=[add],
    prompt="계산 도우미. 계산 도구 우선 사용.",
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "17과 25의 합은?"}
        ]
    }
)
```

### 1.0

```python
from langchain.agents import create_agent


agent = create_agent(
    model=model,
    tools=[add],
    system_prompt="계산 도우미. 계산 도구 우선 사용.",
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "17과 25의 합은?"}
        ]
    }
)
```

핵심 치환:

```text
langgraph.prebuilt.create_react_agent
                  ↓
langchain.agents.create_agent

prompt=
   ↓
system_prompt=
```

실행 결과의 마지막 Message:

```python
final_message = result["messages"][-1]
print(final_message.text)
```

---

## 12. Agent Prompt—고정형과 동적형

### 0.3 고정 Prompt

```python
agent = create_react_agent(
    model=model,
    tools=[add],
    prompt="친절한 계산 도우미",
)
```

### 1.0 고정 Prompt

```python
agent = create_agent(
    model=model,
    tools=[add],
    system_prompt="친절한 계산 도우미",
)
```

### 1.0 동적 Prompt—Middleware

```python
from dataclasses import dataclass

from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt


@dataclass
class UserContext:
    level: str


@dynamic_prompt
def level_prompt(request: ModelRequest) -> str:
    level = request.runtime.context.level

    if level == "beginner":
        return "입문자용 용어와 짧은 예시 중심"

    return "전문 용어와 구현 세부사항 중심"


agent = create_agent(
    model=model,
    tools=[add],
    middleware=[level_prompt],
    context_schema=UserContext,
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "LCEL 설명"}
        ]
    },
    context=UserContext(level="beginner"),
)
```

```text
0.3: prompt 함수·hook·Graph 구성
1.0: dynamic_prompt Middleware
```

---

## 13. Hook에서 Middleware로

0.3 계열 Agent 구성:

```text
pre_model_hook
post_model_hook
도구 오류 처리 코드
동적 Prompt 함수
```

1.0 구성:

```text
Middleware
├─ before_model
├─ after_model
├─ wrap_model_call
├─ wrap_tool_call
├─ 동적 Prompt
├─ 요약
├─ 재시도
└─ Human-in-the-loop
```

v1 내장 Middleware 예시:

```python
from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware


agent = create_agent(
    model=model,
    tools=[add],
    middleware=[
        SummarizationMiddleware(
            model=model,
            trigger={"tokens": 4000},
            keep={"messages": 20},
        )
    ],
)
```

Middleware 효과:

- 공통 정책 재사용
- 실행 순서의 명시성
- Prompt·Model·Tool 호출 경계 제어
- Guardrail·Logging·Retry의 분리

---

## 14. Runtime Context

### 0.3 중심 패턴

```python
config = {
    "configurable": {
        "user_id": "U100",
        "department": "quality",
    }
}

result = agent.invoke(inputs, config=config)
```

### 1.0 권장 패턴

```python
from dataclasses import dataclass

from langchain.agents import create_agent


@dataclass
class Context:
    user_id: str
    department: str


agent = create_agent(
    model=model,
    tools=[add],
    context_schema=Context,
)

result = agent.invoke(
    inputs,
    context=Context(
        user_id="U100",
        department="quality",
    ),
)
```

구분:

```text
State   = 실행 중 변경 가능 데이터
Context = 호출 동안 고정된 의존성·사용자 정보
Config  = Thread ID·Tag·Callback 등 실행 설정
```

v1에서도 `config["configurable"]` 호환 가능. 신규 코드의 정적 의존성은 `context=` 중심.

---

## 15. Custom Agent State

### 0.3에서 가능했던 형태

```python
from pydantic import BaseModel


class CustomState(BaseModel):
    messages: list
    user_id: str
```

### 1.0

```python
from langchain.agents import AgentState, create_agent


class CustomState(AgentState):
    user_id: str


agent = create_agent(
    model=model,
    tools=[add],
    state_schema=CustomState,
)
```

v1 제약:

```text
Agent State Schema → TypedDict 계열
Pydantic Model     → 미지원
dataclass          → 미지원
```

검증 필요 시:

- Middleware 내부 검증
- Tool 입력 Pydantic Schema
- Agent 외부 입출력 검증 계층

---

## 16. Structured Output

### 모델 단독 호출—0.3·1.0 공통 계열

```python
from pydantic import BaseModel, Field


class Answer(BaseModel):
    summary: str = Field(description="핵심 요약")
    confidence: float = Field(ge=0, le=1)


structured_model = model.with_structured_output(Answer)
answer = structured_model.invoke("문서 요약")

print(answer.summary)
```

### 1.0 Agent Structured Output

자동 전략 선택:

```python
from langchain.agents import create_agent


agent = create_agent(
    model=model,
    tools=[],
    response_format=Answer,
)

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "문서 요약"}
        ]
    }
)

answer = result["structured_response"]
```

명시적 전략:

```python
from langchain.agents.structured_output import (
    ProviderStrategy,
    ToolStrategy,
)


native_agent = create_agent(
    model=model,
    tools=[],
    response_format=ProviderStrategy(Answer),
)

tool_agent = create_agent(
    model=model,
    tools=[],
    response_format=ToolStrategy(Answer),
)
```

| 전략 | 방식 | 기준 |
|---|---|---|
| `ProviderStrategy` | 모델 공급자의 native schema | 공급자 지원 필요 |
| `ToolStrategy` | Tool Calling 기반 schema | 폭넓은 모델 호환 |
| Schema 직접 전달 | 가능 전략 자동 선택 | 간결한 기본값 |

v1 변화:

- Prompted Output 전략 제거
- 별도 구조화 node 대신 주 Agent loop 내부 생성
- 최종값: `result["structured_response"]`

---

## 17. Agent Streaming

### 공통 호출

```python
for event in agent.stream(
    {
        "messages": [
            {"role": "user", "content": "17과 25의 합"}
        ]
    },
    stream_mode="updates",
):
    print(event)
```

node 이름 변화:

```text
0.3 create_react_agent → "agent"
1.0 create_agent       → "model"
```

기존 분기:

```python
if "agent" in event:
    handle_model_event(event["agent"])
```

v1 분기:

```python
if "model" in event:
    handle_model_event(event["model"])
```

영향 영역:

- UI Streaming
- Event Filter
- Logging
- 테스트 Snapshot
- Node 이름 기반 Metric

---

## 18. RAG 저수준 문법—대부분 동일

0.3·1.0 공통형:

```python
from langchain_community.document_loaders import TextLoader
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


# Loader
documents = TextLoader("data/policy.txt", encoding="utf-8").load()

# Chunk
chunks = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=80,
).split_documents(documents)

# Embedding + Vector Store
vector_store = InMemoryVectorStore.from_documents(
    documents=chunks,
    embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
)

# Retriever
retriever = vector_store.as_retriever(search_kwargs={"k": 4})
question = "연차 신청 기한은?"
retrieved_documents = retriever.invoke(question)

# Context
context = "\n\n".join(
    document.page_content for document in retrieved_documents
)

# Prompt + Model
prompt = ChatPromptTemplate.from_template(
    "Context만 근거로 답변.\n\nContext:\n{context}\n\n질문: {question}"
)
model = ChatOpenAI(model="사용-가능한-모델-ID")
chain = prompt | model | StrOutputParser()

answer = chain.invoke(
    {
        "context": context,
        "question": question,
    }
)
```

버전 영향이 작은 이유:

```text
Document·Prompt·Runnable  → langchain-core
OpenAI 통합               → langchain-openai
Loader                    → langchain-community
Text Splitter             → langchain-text-splitters
```

---

## 19. RAG 고수준 Chain import 변화

### 0.3

```python
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import (
    create_stuff_documents_chain,
)


document_chain = create_stuff_documents_chain(model, prompt)
rag_chain = create_retrieval_chain(retriever, document_chain)

result = rag_chain.invoke({"input": "연차 신청 기한은?"})
print(result["answer"])
```

### 1.0 호환

```python
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import (
    create_stuff_documents_chain,
)


document_chain = create_stuff_documents_chain(model, prompt)
rag_chain = create_retrieval_chain(retriever, document_chain)

result = rag_chain.invoke({"input": "연차 신청 기한은?"})
print(result["answer"])
```

### 1.0 신규 코드 선택지

```text
간단한 RAG
  └─ Retriever + Context Formatter + LCEL

Legacy Chain 유지
  └─ langchain-classic

검색 Tool을 사용하는 Agent
  └─ create_agent + Tool
```

> `langchain-classic`은 즉시 제거 대상 의미가 아닌 호환 패키지. 신규 설계와 유지보수 설계의 구분 필요.

---

## 20. Pydantic import

오래된 예제:

```python
from langchain_core.pydantic_v1 import BaseModel, Field
```

0.3 이후 기본 방향:

```python
from pydantic import BaseModel, Field
```

v1 Structured Output 예시:

```python
from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    answer: str = Field(description="답변")
    sources: list[str] = Field(description="출처")
```

주의:

- `langchain_core.pydantic_v1` 기반 옛 코드 점검
- Pydantic v1·v2 객체 혼합 회피
- `.dict()` 대신 Pydantic v2의 `.model_dump()` 우선
- Custom Agent State와 Structured Output Schema의 용도 구분

---

## 21. Deprecated API 점검

검색 명령:

```powershell
rg "from langchain\.chains|from langchain\.retrievers|create_react_agent|\.run\(|\.predict\(|\.text\(\)|pydantic_v1" .
```

치환표:

| 검색 결과 | v1 대응 |
|---|---|
| `from langchain.chains` | `langchain_classic.chains` 또는 LCEL |
| `from langchain.retrievers` | `langchain_classic.retrievers` 또는 통합 패키지 |
| `create_react_agent` | `langchain.agents.create_agent` |
| Agent의 `prompt=` | `system_prompt=` |
| `.run()` | `.invoke()` |
| `.predict()` | `.invoke()` |
| `.text()` | `.text` |
| `langchain_core.pydantic_v1` | `pydantic` |
| Streaming node `agent` | `model` |
| 정적 `configurable` 데이터 | `context=` 검토 |

---

## 22. 단계별 마이그레이션 예시

### 1단계—환경 복제

```text
운영 환경 유지
  +
v1 전용 새 가상환경
```

### 2단계—버전 기록

```powershell
uv pip freeze
```

### 3단계—Provider import 분리

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
```

### 4단계—호출 문법 통일

```python
result = runnable.invoke(inputs)
```

### 5단계—LCEL 유지

```python
chain = prompt | model | parser
```

### 6단계—Legacy import 이동

```python
from langchain_classic.chains import LLMChain
```

### 7단계—Agent 교체

```python
from langchain.agents import create_agent
```

### 8단계—hook의 Middleware 전환

```text
pre-model  → before_model
post-model → after_model
tool error → wrap_tool_call
```

### 9단계—응답·Streaming 검사

```text
response.text
response.content_blocks
node: agent → model
```

### 10단계—회귀 테스트

- Prompt Snapshot
- Tool 호출명·인자
- Structured Output Schema
- RAG 답변·출처
- Streaming Event
- Token 사용량

---

## 23. 어떤 문법 선택?

```text
새 프로젝트?
├─ 예
│  ├─ Agent 필요 → LangChain v1 create_agent
│  └─ 단순 RAG   → langchain-core LCEL + 통합 패키지
│
└─ 아니오
   ├─ 0.3 코드 정상 동작?
   │  ├─ 예 → 테스트 확보 후 단계적 전환
   │  └─ 아니오 → Deprecated import·호출부터 교체
   │
   └─ Legacy Chain 의존?
      ├─ 예 → langchain-classic 임시 호환
      └─ 아니오 → LCEL·create_agent 중심
```

추천 기준:

| 상황 | 선택 |
|---|---|
| 새 Agent | v1 `create_agent` |
| 새 단순 RAG | v1 + 저수준 LCEL |
| 기존 LCEL RAG | 대부분 그대로 업그레이드 |
| 기존 `LLMChain` 대량 사용 | `langchain-classic` + 점진 전환 |
| 기존 `create_react_agent` | `create_agent` 전환 |
| Python 3.9 고정 | 런타임 업그레이드 선행 |

---

## 24. 오해 정리

### 오해 1—v1에서 LCEL 제거

```text
사실: LCEL·Runnable 유지
```

### 오해 2—`ChatOpenAI` 사용 불가

```text
사실: langchain-openai의 ChatOpenAI 유지
```

### 오해 3—모든 Retriever가 classic

```text
사실: Vector Store의 as_retriever()와 BaseRetriever 유지
      일부 고수준·특수 Retriever import만 classic 이동
```

### 오해 4—기존 RAG 전체 재작성

```text
사실: core·community·provider 분리형 RAG의 변경량은 대체로 작음
```

### 오해 5—`langchain-classic` 즉시 금지

```text
사실: 기존 기능의 호환 경로
      신규 설계에서는 LCEL·v1 API 우선
```

---

## 25. 완료 체크리스트

- [ ] Python 3.10 이상
- [ ] 버전별 가상환경 분리
- [ ] `uv.lock` 또는 requirements lock
- [ ] 공급자별 패키지 import
- [ ] `.invoke()` 중심 호출
- [ ] Prompt·LCEL 유지 가능 여부 확인
- [ ] `langchain.chains` 검색
- [ ] `langchain.retrievers` 검색
- [ ] `langchain-classic` 필요성 판단
- [ ] `create_react_agent` 검색
- [ ] `create_agent` 전환
- [ ] `prompt=` → `system_prompt=`
- [ ] hook → Middleware
- [ ] Runtime `context=` 검토
- [ ] Agent State의 `TypedDict` 확인
- [ ] Structured Output 전략 확인
- [ ] `.text()` → `.text`
- [ ] `content_blocks` 처리
- [ ] Streaming node 이름 확인
- [ ] 회귀 테스트

---

## 핵심 정리

```text
0.3 코드
│
├─ Prompt·Runnable·Document
│       └─ 대부분 유지
│
├─ Provider Integration
│       └─ langchain_openai 등 유지
│
├─ Legacy Chain·Retriever
│       └─ langchain_classic으로 이동
│
└─ create_react_agent
        └─ create_agent + Middleware로 전환
```

최종 기억:

1. v1 핵심: `create_agent`
2. Agent Prompt: `system_prompt=`
3. Agent 확장: Middleware
4. Legacy 기능: `langchain-classic`
5. LCEL: 유지
6. 공급자별 통합 패키지: 유지
7. Message: `.text`, `content_blocks`
8. Runtime 정적 정보: `context=`
9. Agent State: `TypedDict`
10. 마이그레이션: import → 호출 → Agent → 테스트 순서

---

## 개발문서 링크

### LangChain 공식 문서

- [LangChain v1 마이그레이션 가이드](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [LangChain v1 주요 변화](https://docs.langchain.com/oss/python/releases/langchain-v1)
- [LangChain v1 개요](https://docs.langchain.com/oss/python/langchain/overview)
- [Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [Models](https://docs.langchain.com/oss/python/langchain/models)
- [Messages](https://docs.langchain.com/oss/python/langchain/messages)
- [Tools](https://docs.langchain.com/oss/python/langchain/tools)
- [Middleware 개요](https://docs.langchain.com/oss/python/langchain/middleware/overview)
- [Custom Middleware](https://docs.langchain.com/oss/python/langchain/middleware/custom)
- [Runtime](https://docs.langchain.com/oss/python/langchain/runtime)
- [Structured Output](https://docs.langchain.com/oss/python/langchain/structured-output)
- [Streaming](https://docs.langchain.com/oss/python/langchain/streaming)
- [LangGraph v1 마이그레이션](https://docs.langchain.com/oss/python/migrate/langgraph-v1)
- [LangGraph v1 주요 변화](https://docs.langchain.com/oss/python/releases/langgraph-v1)
- [LangChain Python API Reference](https://reference.langchain.com/python)
- [LangChain v0.3 보관 문서 소스](https://github.com/langchain-ai/langchain/tree/v0.3/docs/docs)
- [LangChain v0.3 API Reference](https://reference.langchain.com/v0.3/python/)
