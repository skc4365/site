# LangSmith로 LangChain 실행 추적하기

## 학습 목표

- LangSmith trace와 project의 역할을 설명한다.
- 환경 변수만으로 LangChain 실행 기록을 활성화한다.
- trace에서 프롬프트·모델·출력·실행 시간을 확인한다.
- 프로젝트, 실행 이름, tag, metadata를 이용해 기록을 구분한다.
- 필요한 실행만 선택적으로 추적한다.

> 기준 문서: [LangSmith 공식 LangChain 추적 가이드](https://docs.langchain.com/langsmith/trace-with-langchain)

## 1. LangSmith trace란?

LangChain 애플리케이션은 하나의 질문을 처리하면서 여러 단계를 실행할 수 있습니다.

```text
사용자 질문
  ↓ PromptTemplate
완성된 프롬프트
  ↓ Chat Model
AIMessage
  ↓ Output Parser
최종 문자열
```

LangSmith tracing을 활성화하면 전체 요청을 하나의 trace로 묶고, 내부 단계를 run 또는 span으로 기록합니다.

| 용어 | 의미 |
| --- | --- |
| Trace | 사용자 요청 하나의 전체 실행 기록 |
| Run·Span | 모델, Retriever, Tool 등 내부 단계의 실행 기록 |
| Project | 관련 trace를 모아 보는 작업 공간 |
| Tag | 실행을 검색·분류하기 위한 문자열 표식 |
| Metadata | 환경, 사용자 유형, 앱 버전 같은 구조화 정보 |

LangSmith는 오류 원인, 느린 단계, 실제 프롬프트, 모델 응답을 확인할 때 유용합니다. 추적은 모델의 답변 품질을 자동으로 보장하지 않으므로 별도의 평가 데이터와 evaluator가 필요합니다.

## 2. 준비 사항

- Python 3.12
- LangSmith 계정과 API 키
- 사용할 모델 공급자의 API 키
- 추적할 LangChain 애플리케이션

공식 예제와 동일하게 OpenAI 연동을 사용합니다.

```powershell
python -m pip install -U langsmith langchain-core langchain-openai python-dotenv
```

설치 확인:

```powershell
python -m pip show langsmith langchain-core langchain-openai
```

## 3. 환경 변수 설정

프로젝트 루트의 `.env` 파일에 다음 값을 설정합니다.

```text
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=YOUR_LANGSMITH_API_KEY
LANGSMITH_PROJECT=manufacturing-trace-practice
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

API 키가 여러 workspace에 연결되어 있다면 workspace ID도 지정합니다.

```text
LANGSMITH_WORKSPACE_ID=YOUR_WORKSPACE_ID
```

기본 US 리전이 아닌 LangSmith 계정은 해당 리전의 endpoint가 필요할 수 있습니다. endpoint 마지막에는 `/`를 붙이지 않습니다.

```text
# 예: EU 리전
LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
```

`.gitignore`에는 반드시 `.env`를 추가합니다.

```text
.env
.venv/
__pycache__/
```

> API 키, 개인정보, 회사 기밀, 전체 원문 문서를 Git이나 공개 trace에 저장하지 않습니다.

## 4. 첫 trace 기록하기

`trace_basic.py`:

```python
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "주어진 설비 정보만 사용해 간결하게 답하세요.",
        ),
        (
            "human",
            "질문: {question}\n\n설비 정보: {context}",
        ),
    ]
)

model = ChatOpenAI(model="gpt-5.4-mini", temperature=0)
chain = prompt | model | StrOutputParser()

answer = chain.invoke(
    {
        "question": "점검 대상 설비와 현재 상태를 알려주세요.",
        "context": "점검 대상은 프레스-01이며 현재 상태는 정상입니다.",
    }
)

print(answer)
```

실행:

```powershell
python trace_basic.py
```

`LANGSMITH_TRACING=true`이면 LangChain 코드를 별도로 수정하지 않아도 trace가 전송됩니다.

## 5. LangSmith 적용 전·후 비교

LangSmith는 기본적으로 체인의 입력이나 최종 답변을 바꾸지 않습니다. 동일한 모델, 프롬프트, 입력을 사용하면 애플리케이션이 받는 결과값은 같고, LangSmith 적용 후에는 실행 과정이 추가로 기록됩니다.

### 비교 조건

다음 조건을 동일하게 유지합니다.

- 모델: `gpt-5.4-mini`
- temperature: `0`
- 프롬프트와 입력값
- 실행 코드와 패키지 버전

LLM 서비스의 특성상 `temperature=0`이어도 공급자 업데이트나 실행 환경에 따라 문장이 미세하게 달라질 수 있습니다. 정확한 비교에서는 같은 실행 조건과 구조화된 평가 기준을 사용합니다.

### 적용 전: tracing 비활성화

`.env`:

```text
LANGSMITH_TRACING=false
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

```python
before_result = chain.invoke(
    {
        "question": "점검 대상 설비와 현재 상태를 알려주세요.",
        "context": "점검 대상은 프레스-01이며 현재 상태는 정상입니다.",
    }
)

print(before_result)
```

예상 콘솔 결과:

```text
점검 대상 설비는 프레스-01이며, 현재 상태는 정상입니다.
```

확인할 수 있는 정보:

- 최종 답변
- 애플리케이션에서 직접 출력한 로그
- 코드에서 별도로 측정한 실행 시간

확인하기 어려운 정보:

- 완성된 프롬프트와 단계별 입력
- Prompt → Model → Parser 실행 순서
- 단계별 소요 시간
- 모델 token 사용량
- 어느 내부 단계에서 오류가 발생했는지

### 적용 후: tracing 활성화

`.env`:

```text
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=YOUR_LANGSMITH_API_KEY
LANGSMITH_PROJECT=manufacturing-trace-comparison
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

코드는 적용 전과 동일합니다.

```python
after_result = chain.invoke(
    {
        "question": "점검 대상 설비와 현재 상태를 알려주세요.",
        "context": "점검 대상은 프레스-01이며 현재 상태는 정상입니다.",
    }
)

print(after_result)
```

예상 콘솔 결과:

```text
점검 대상 설비는 프레스-01이며, 현재 상태는 정상입니다.
```

LangSmith에서 추가로 확인되는 정보:

```text
inspection chain
├─ ChatPromptTemplate
│  ├─ question
│  ├─ context
│  └─ 완성된 system·human message
├─ ChatOpenAI
│  ├─ 사용 모델
│  ├─ 모델 입력·출력
│  ├─ token 사용량
│  └─ 실행 시간
└─ StrOutputParser
   ├─ 파싱 전 AIMessage
   └─ 최종 문자열
```

### 결과 비교표

| 비교 항목 | 적용 전 | 적용 후 |
| --- | --- | --- |
| 사용자 최종 답변 | 동일 | 동일 |
| Python 반환 타입 | `str` | `str` |
| 콘솔 출력 | 동일 | 동일 |
| 모델 호출 횟수 | 동일 | 동일 |
| 실행 단계 확인 | 직접 로그 필요 | trace tree에서 확인 |
| 실제 프롬프트 확인 | 별도 출력 필요 | Prompt run에서 확인 |
| 단계별 실행 시간 | 직접 측정 필요 | run별로 기록 |
| token·비용 정보 | 별도 구현 필요 | 모델 run에서 확인 가능 |
| 오류 위치 확인 | stack trace 중심 | 실패한 run과 입력 확인 |
| 검색·필터링 | 로그 구현 필요 | tag·metadata로 검색 가능 |
| 추가 네트워크 요청 | 없음 | trace 전송 발생 |

### 코드로 결과값 비교하기

두 실행을 별도 프로세스로 실행한 뒤 결과를 JSON 파일이나 테스트 입력으로 비교할 수 있습니다. API 키나 민감한 입력은 비교 파일에 저장하지 않습니다.

```python
def run_chain() -> str:
    return chain.invoke(
        {
            "question": "점검 대상 설비와 현재 상태를 알려주세요.",
            "context": "점검 대상은 프레스-01이며 현재 상태는 정상입니다.",
        }
    )


result = run_chain()
expected_terms = {"프레스-01", "정상"}

assert isinstance(result, str)
assert all(term in result for term in expected_terms)

print("RESULT:", result)
print("REQUIRED_TERMS: PASS")
```

LLM의 자연어 문장을 문자 단위로 완전히 동일하게 비교하기보다 반환 타입, 필수 용어, 구조화된 필드, 금지 표현처럼 업무상 중요한 조건을 비교합니다.

### 성능에 미치는 영향

tracing은 실행 정보를 LangSmith로 전송하므로 소량의 추가 네트워크·처리 비용이 발생합니다. Python에서는 일반적으로 애플리케이션 응답을 막지 않도록 백그라운드 전송을 사용합니다. 짧은 CLI나 serverless 환경에서는 trace 전송 완료 처리 방식에 따라 종료 시간이 달라질 수 있습니다.

핵심 결론:

```text
LangSmith 적용 전: 결과만 확인
LangSmith 적용 후: 결과 + 결과가 만들어진 전체 과정 확인
```

## 6. LangSmith에서 trace 확인하기

1. LangSmith에 로그인합니다.
2. **Tracing Projects** 또는 프로젝트 목록을 엽니다.
3. `.env`에 지정한 `manufacturing-trace-practice` 프로젝트를 선택합니다.
4. 가장 최근 trace를 엽니다.
5. Prompt, ChatOpenAI, StrOutputParser 단계가 계층으로 표시되는지 확인합니다.

각 run에서 다음 항목을 확인합니다.

- 입력값과 출력값
- 실제 모델에 전달된 메시지
- 사용한 모델 이름
- 시작 시각과 실행 시간
- token 사용량과 비용 정보
- 오류와 stack trace
- tag와 metadata

민감한 데이터가 trace에 들어갔다면 단순히 화면을 닫는 것으로 끝내지 말고 해당 기록의 삭제와 키 교체 필요성을 확인합니다.

## 7. 프로젝트 구분하기

Project는 trace를 애플리케이션이나 환경별로 묶는 단위입니다. 설정하지 않으면 기본 프로젝트에 저장될 수 있습니다.

### 애플리케이션 전체에 고정

`.env`:

```text
LANGSMITH_PROJECT=manufacturing-rag-dev
```

권장 예시:

```text
manufacturing-rag-dev
manufacturing-rag-test
manufacturing-rag-prod
```

운영 환경과 개발 환경을 같은 프로젝트에 섞지 않습니다.

### 특정 코드 블록에서 동적으로 선택

```python
import langsmith as ls

with ls.tracing_context(
    enabled=True,
    project_name="manufacturing-rag-experiment-a",
):
    answer = chain.invoke(
        {
            "question": "프레스 상태는?",
            "context": "프레스-01은 정상입니다.",
        }
    )
```

동적 프로젝트는 여러 실험을 같은 프로세스에서 비교할 때 유용합니다.

## 8. 필요한 실행만 추적하기

전체 tracing을 끈 상태에서도 특정 실행만 기록할 수 있습니다.

`.env`:

```text
LANGSMITH_TRACING=false
```

```python
import langsmith as ls

with ls.tracing_context(enabled=True, project_name="selected-traces"):
    traced_answer = chain.invoke(
        {
            "question": "이 실행만 기록되나요?",
            "context": "tracing_context 내부 실행만 기록합니다.",
        }
    )

# 환경 변수에서 tracing을 끈 경우 이 실행은 기록되지 않습니다.
untraced_answer = chain.invoke(
    {
        "question": "이 실행도 기록되나요?",
        "context": "tracing_context 밖입니다.",
    }
)
```

전체 tracing이 켜져 있어도 특정 부분을 제외할 수 있습니다.

```python
with ls.tracing_context(enabled=False):
    chain.invoke(
        {
            "question": "기록하지 않을 요청",
            "context": "민감정보를 포함하지 않는 별도 처리 예시",
        }
    )
```

추적을 끄는 것만으로 민감정보 보호가 완성되는 것은 아닙니다. 애플리케이션 로그와 모델 공급자 전송 정책도 함께 확인합니다.

## 9. 실행 이름 지정하기

기본 run 이름은 실행 객체의 클래스 이름을 사용합니다. `run_name`을 지정하면 업무 흐름을 쉽게 찾을 수 있습니다.

```python
configured_chain = chain.with_config(
    {"run_name": "answer-machine-status"}
)

configured_chain.invoke(
    {
        "question": "프레스 상태는?",
        "context": "프레스-01은 정상입니다.",
    }
)
```

호출 시점에도 지정할 수 있습니다.

```python
chain.invoke(
    {
        "question": "모터 상태는?",
        "context": "모터-02는 점검 대기 상태입니다.",
    },
    {"run_name": "answer-motor-status"},
)
```

`run_name`은 지정한 최상위 실행의 이름만 변경합니다. 내부 모델 run 이름까지 자동으로 같은 값으로 바뀌지는 않습니다.

## 10. Tag와 metadata 추가하기

Tag는 문자열 분류에, metadata는 key-value 검색과 비교에 사용합니다. 상위 Runnable에 추가한 값은 일반적으로 하위 run에도 전달됩니다.

```python
traced_chain = chain.with_config(
    {
        "run_name": "manufacturing-qa",
        "tags": ["training", "rag", "book9"],
        "metadata": {
            "environment": "classroom",
            "app_version": "1.0.0",
            "lesson": "try03",
        },
    }
)

answer = traced_chain.invoke(
    {
        "question": "프레스 상태는?",
        "context": "프레스-01은 정상입니다.",
    },
    {
        "tags": ["student-run"],
        "metadata": {"input_type": "sample"},
    },
)
```

metadata에 사용자 이름, 이메일, 사번, API 키, 원문 전체를 넣지 않습니다. 사용자를 구분해야 한다면 조직 정책에 따라 비식별 ID를 사용합니다.

## 11. Run ID 지정하기

외부 요청 ID와 LangSmith trace를 연결해야 할 때 UUID 형식의 `run_id`를 지정할 수 있습니다.

```python
from uuid import uuid4

run_id = uuid4()

answer = chain.invoke(
    {
        "question": "설비 상태를 알려주세요.",
        "context": "컨베이어-03은 운전 중입니다.",
    },
    {
        "run_id": run_id,
        "run_name": "status-request",
    },
)

print(f"run_id={run_id}")
```

최상위 실행에 지정한 run ID는 해당 trace를 조회하거나 다른 시스템의 로그와 연결할 때 사용할 수 있습니다.

## 12. 프로그램 종료 전 trace 전송 기다리기

Python의 tracing은 애플리케이션 응답을 방해하지 않도록 백그라운드에서 전송될 수 있습니다. 짧게 실행되는 CLI나 테스트에서는 프로세스가 먼저 종료되지 않도록 전송 완료를 기다립니다.

```python
from langchain_core.tracers.langchain import wait_for_all_tracers

try:
    answer = chain.invoke(
        {
            "question": "마지막 실행도 기록되나요?",
            "context": "전송 완료를 기다립니다.",
        }
    )
    print(answer)
finally:
    wait_for_all_tracers()
```

serverless 환경처럼 실행 직후 프로세스가 종료되는 환경에서는 background callback 설정도 배포 환경에 맞게 검토합니다.

```text
LANGCHAIN_CALLBACKS_BACKGROUND=false
```

## 13. 통합 실습

`trace_practice.py`:

```python
from uuid import uuid4

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tracers.langchain import wait_for_all_tracers
from langchain_openai import ChatOpenAI

load_dotenv()

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "주어진 점검 기록만 사용하세요. 근거가 부족하면 확인 필요라고 답하세요.",
        ),
        ("human", "질문: {question}\n\n점검 기록: {context}"),
    ]
)

model = ChatOpenAI(
    model="gpt-5.4-mini",
    temperature=0,
    metadata={"ls_model_name": "classroom-factual-model"},
)

chain = (prompt | model | StrOutputParser()).with_config(
    {
        "run_name": "inspection-record-qa",
        "tags": ["try03", "manufacturing"],
        "metadata": {
            "environment": "classroom",
            "version": "1.0.0",
        },
    }
)

run_id = uuid4()

try:
    answer = chain.invoke(
        {
            "question": "현재 조치가 필요한가요?",
            "context": "프레스-01의 온도와 진동은 정상 범위입니다.",
        },
        {
            "run_id": run_id,
            "tags": ["normal-case"],
            "metadata": {"machine_type": "press"},
        },
    )
    print(answer)
    print(f"LangSmith run_id: {run_id}")
finally:
    wait_for_all_tracers()
```

실행 후 LangSmith에서 다음을 확인합니다.

- 프로젝트 이름이 올바른가?
- 최상위 run 이름이 `inspection-record-qa`인가?
- Prompt → ChatOpenAI → StrOutputParser 계층이 보이는가?
- 설정한 tag와 metadata가 표시되는가?
- 출력과 실행 시간이 기록되었는가?

## 14. 자주 발생하는 문제

### trace가 보이지 않음

1. `LANGSMITH_TRACING=true`인지 확인합니다.
2. `LANGSMITH_API_KEY`가 올바른지 확인합니다.
3. 여러 workspace를 사용하면 `LANGSMITH_WORKSPACE_ID`를 확인합니다.
4. 계정 리전에 맞는 `LANGSMITH_ENDPOINT`인지 확인합니다.
5. `LANGSMITH_PROJECT` 이름으로 프로젝트를 검색합니다.
6. 짧은 프로그램은 `wait_for_all_tracers()`를 호출합니다.

환경 변수 존재 여부만 확인하고 실제 키 값은 출력하지 않습니다.

```python
import os

for name in [
    "LANGSMITH_TRACING",
    "LANGSMITH_API_KEY",
    "LANGSMITH_PROJECT",
    "LANGSMITH_WORKSPACE_ID",
    "LANGSMITH_ENDPOINT",
]:
    print(name, "설정됨" if os.getenv(name) else "미설정")
```

### 인증 오류

- API 키 앞뒤의 공백과 따옴표를 확인합니다.
- endpoint 마지막의 `/`를 제거합니다.
- API 키가 연결된 workspace와 지정한 workspace ID가 일치하는지 확인합니다.
- 키가 노출되었다면 즉시 폐기하고 새로 발급합니다.

### 프로젝트가 `default`로 생성됨

- 애플리케이션 실행 전에 `LANGSMITH_PROJECT`를 설정합니다.
- `.env` 사용 시 `load_dotenv()`가 모델·체인 생성보다 먼저 실행되는지 확인합니다.
- 동적 `tracing_context`의 `project_name` 값을 확인합니다.

### 민감정보가 기록됨

- 데이터 삭제 및 보존 정책에 따라 trace를 처리합니다.
- 노출된 API 키나 인증 정보는 즉시 교체합니다.
- 입력 전처리 또는 tracing 설정으로 민감정보 수집을 최소화합니다.
- 운영 적용 전 조직의 보안·개인정보 정책을 확인합니다.

## 실습 과제

1. 정상 입력과 빈 입력을 각각 실행해 trace 차이를 비교합니다.
2. `run_name`을 변경하고 LangSmith 검색 결과를 확인합니다.
3. 개발·테스트 프로젝트를 분리합니다.
4. `machine_type`, `app_version` metadata를 추가합니다.
5. 선택적 tracing으로 한 실행만 기록합니다.
6. 의도적으로 잘못된 템플릿 변수를 전달하고 오류 run을 확인합니다.

## 완료 기준

- [ ] API 키를 `.env`로 관리하고 Git에서 제외했다.
- [ ] LangChain 실행이 지정한 LangSmith 프로젝트에 기록된다.
- [ ] trace와 내부 run의 계층 구조를 확인했다.
- [ ] run 이름, tag, metadata를 설정했다.
- [ ] 선택적 tracing을 사용할 수 있다.
- [ ] 짧은 프로그램에서 trace 전송 완료를 기다릴 수 있다.
- [ ] 민감정보를 trace에 남기지 않는 원칙을 설명할 수 있다.
