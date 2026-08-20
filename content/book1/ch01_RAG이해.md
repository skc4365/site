# RAG — 외부 문서를 검색해 근거 있는 답변을 만드는 기술

## 개념

**RAG(Retrieval-Augmented Generation)**는 질문과 관련된 외부 문서를 검색하고, 그 내용을 LLM에 제공해 답변을 생성하는 방식입니다.

```text
RAG = 검색(Retrieval) + 문맥 보강(Augmented) + 생성(Generation)
```

## 언제 사용하는가

- 사내 문서나 최신 자료처럼 모델이 학습하지 않은 정보가 필요할 때
- 답변의 출처를 사용자에게 보여줘야 할 때
- 모델을 다시 학습하지 않고 지식을 추가·갱신할 때

## 아키텍처

```text
[문서 준비]
원문 → Loader → Splitter → Embedding → Vector Store

[질문 처리]
질문 → Retriever → 관련 Chunk → Prompt Context → LLM → 답변·출처
```

## 핵심 원리

RAG는 모델의 기억을 바꾸지 않습니다. 질문 시점에 필요한 문서를 찾아 **입력 Context를 확장**합니다.

```text
최종 답변 품질 = 검색 품질 × 생성 품질
```

검색이 실패하면 LLM에 정답 근거가 전달되지 않습니다. 따라서 Retriever와 Generator를 따로 평가해야 합니다.

| 방식 | 동작 | 적합한 상황 |
|---|---|---|
| 2-step RAG | 항상 검색 후 한 번 생성 | 문서 Q&A, 예측 가능한 흐름 |
| Agentic RAG | Agent가 검색 여부를 결정 | 여러 도구와 복잡한 조사 |
| Hybrid RAG | 검색·검증·재검색 결합 | 높은 품질 관리가 필요한 업무 |

## 바로 실행하는 코드

```bash
pip install -U langchain langchain-openai
```

`OPENAI_API_KEY` 환경 변수를 설정한 뒤 실행합니다.

```python
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

documents = [
    Document(
        page_content="연차 휴가는 그룹웨어에서 신청합니다.",
        metadata={"source": "인사규정", "page": 3},
    ),
    Document(
        page_content="비밀번호는 보안 포털에서 변경합니다.",
        metadata={"source": "보안지침", "page": 7},
    ),
]

store = InMemoryVectorStore.from_documents(
    documents,
    OpenAIEmbeddings(model="text-embedding-3-small"),
)
retriever = store.as_retriever(search_kwargs={"k": 1})

prompt = ChatPromptTemplate.from_template(
    "문서만 사용해 답하세요.\n문서: {context}\n질문: {question}"
)
model = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
rag_chain = prompt | model | StrOutputParser()

question = "연차 휴가는 어디에서 신청하나요?"
found = retriever.invoke(question)
context = "\n\n".join(doc.page_content for doc in found)
answer = rag_chain.invoke({"question": question, "context": context})

print("답변:", answer)
print("출처:", [doc.metadata for doc in found])
```

Retriever는 답변이 아니라 `Document` 목록을 반환합니다. 본문은 답변 Context로, metadata는 출처로 사용합니다.

## 요점 정리

1. RAG는 외부 문서를 검색해 LLM 입력을 보강합니다.
2. 문서 준비 단계와 질문 처리 단계는 실행 시점이 다릅니다.
3. 검색 실패와 생성 실패를 분리해서 진단합니다.
4. 출처는 실제 검색된 `Document.metadata`에서 만듭니다.
5. 단순 문서 Q&A는 2-step RAG부터 시작합니다.

## 공식 학습 문서

- [LangChain Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval) — RAG 구성요소와 아키텍처 비교
- [Semantic Search](https://docs.langchain.com/oss/python/langchain/knowledge-base) — 지식 베이스 구축 흐름
- [Agentic RAG](https://docs.langchain.com/oss/python/langgraph/agentic-rag) — 검색·평가·재검색 그래프

## 교재소스 보기

전체 RAG 예제는 다음 메뉴인 **소스 01**에서 확인합니다.
