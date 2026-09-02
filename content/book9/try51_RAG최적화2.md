# RAG 최적화 실습

**최적화 구간:** 데이터 준비 · 검색 · 생성·평가

**진단 기준:** 검색 오류와 근거 없는 답변의 단계별 분리

```text
문서 분할 → 후보 검색 → 재정렬 → 답변 생성 → 품질 평가
```

## 1. 데이터 준비: Chunking

- 큰 Chunk: 불필요한 정보 혼입
- 작은 Chunk: 문맥 단절
- 선택 기준: 문서 구조와 질문 유형

| 방식 | 설명 | 적합한 상황 |
|---|---|---|
| Recursive Chunking | 문단·문장·단어 경계를 차례로 사용 | 일반 문서의 기본 분할 |
| Semantic Chunking | 의미가 달라지는 지점을 기준으로 분할 | 주제가 자주 바뀌는 긴 문서 |
| Parent Document | 작은 Chunk로 검색하고 큰 부모 문맥을 전달 | 절차서·매뉴얼처럼 문맥 보존이 중요한 문서 |

**조정 기준:** 동일 평가 질문 기반 Chunk 크기·overlap 비교, 표·경고문·절차 순서 보존 여부

## 2. 검색 정확도 개선

### 하이브리드 검색

**구성:** 키워드 기반 BM25 + 의미 기반 벡터 검색

- BM25: 제품명, 품번, 오류 코드처럼 정확한 단어 검색에 강함
- 벡터 검색: 표현은 다르지만 의미가 유사한 문서 검색에 강함

**목적:** 키워드 검색과 의미 검색의 상호 보완

### 리랭킹

**처리:** 1차 후보 검색 → 질문·문서 관련성 재계산 → 순위 조정

```text
BM25 + 벡터 검색 → 후보 Top-N → Reranker → 최종 Top-K → LLM
```

**설정 기준:** 골든셋 정확도 · 지연시간 · 비용 비교

### 질의 변형

- Multi-Query: 질문을 여러 관점으로 다시 써 검색 범위를 넓힘
- HyDE: 질문에 대한 가상 문서를 만든 뒤 그 문서의 임베딩으로 검색
- 용어 정규화: 약어, 동의어, 단위, 설비 코드를 표준 표현으로 변환

**예외 처리:** 부품 번호·오류 코드 포함 시 원문 키워드 검색 병행

## 3. 생성 품질과 평가

**프롬프트 구성:** `<context>` 구역 분리, 문서 외 추측 제한, 출처 표시

```text
주어진 문서만 근거로 답하세요.
근거가 없으면 "문서에서 확인할 수 없습니다"라고 답하세요.
답변에 사용한 문서명과 구간을 표시하세요.
```

**비교 조건:** 최적화 전후 동일 평가 데이터

| 지표 | 확인 내용 |
|---|---|
| Faithfulness | 검색 문서 기반 답변 여부 |
| Answer Relevancy | 질문 의도와 답변의 일치도 |
| Context Precision | 상위 검색 문서의 유용성 |
| Context Recall | 답변에 필요한 근거의 검색 충족도 |

**검증 원칙:** 자동 평가 + 안전 절차·수치·예외 조건에 대한 현업 전문가 표본 검토

## 4. 하이브리드 검색과 Reranker 예제

**처리 흐름:** BM25·Chroma 결과 결합 → Cross-Encoder 재정렬 → 최종 문서 선별

**사전 확인:** 프로젝트 의존성 버전별 import 경로

<details>
<summary><code>hybrid_reranker.py</code> 코드 보기</summary>

```python
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain.retrievers import (
    ContextualCompressionRetriever,
    EnsembleRetriever,
)
from langchain.retrievers.document_compressors import CrossEncoderReranker


docs = [
    Document(
        page_content="RAG 성능 최적화에는 Reranker 도입이 효과적입니다."
    ),
    Document(
        page_content="BM25는 키워드 일치 기반의 검색 알고리즘입니다."
    ),
    Document(
        page_content="Chroma는 벡터 유사도 검색을 지원합니다."
    ),
    Document(
        page_content="하이브리드 검색은 키워드와 벡터 검색을 결합합니다."
    ),
]

# 키워드 검색기
bm25_retriever = BM25Retriever.from_documents(docs)
bm25_retriever.k = 4

# 벡터 검색기
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(docs, embeddings)
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

# 두 검색 결과 결합
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.3, 0.7],
)

# 후보 문서 재정렬
model = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-large")
reranker = CrossEncoderReranker(model=model, top_n=2)
final_retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=ensemble_retriever,
)

query = "하이브리드 검색과 Reranker를 어떻게 결합하나요?"
result_docs = final_retriever.invoke(query)

for index, doc in enumerate(result_docs, start=1):
    print(f"[{index}] {doc.page_content}")
```

</details>

## 5. RAGAS 평가 예제

**평가 데이터:** 질문 · 검색 문맥 · 생성 답변 · 기준 답변

**결과:** RAG 품질 지표별 점수

<details>
<summary><code>evaluate_rag.py</code> 코드 보기</summary>

```python
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)


data = {
    "question": [
        "RAG 최적화에서 Reranker의 역할은 무엇인가요?",
        "Chroma는 무엇인가요?",
    ],
    "contexts": [
        [
            "Reranker는 1차 검색 문서의 관련성을 재계산해 "
            "상위 결과를 정렬합니다."
        ],
        ["Chroma는 벡터 유사도 검색을 지원하는 데이터베이스입니다."],
    ],
    "answer": [
        "Reranker는 검색 후보의 관련성을 다시 계산해 순위를 조정합니다.",
        "Chroma는 벡터 유사도 검색을 지원합니다.",
    ],
    "ground_truth": [
        "Reranker는 검색 후보의 순위를 다시 매겨 정밀도를 높입니다.",
        "Chroma는 벡터 데이터를 저장하고 검색하는 데이터베이스입니다.",
    ],
}

dataset = Dataset.from_dict(data)
result = evaluate(
    dataset=dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    ],
)

columns = [
    "question",
    "faithfulness",
    "answer_relevancy",
    "context_precision",
    "context_recall",
]
print(result.to_pandas()[columns])
```

</details>

## 6. 적용 순서

1. 최소 20개의 골든 질문과 정답 근거 준비
2. 기본 RAG의 검색·답변 지표 측정
3. Chunking·검색·Reranking 중 단일 요소 변경
4. 동일 평가 데이터 기반 재측정
5. 정확도·지연시간·비용 비교 후 채택 또는 롤백

```text
좋은 RAG = 정확한 데이터 + 측정 가능한 검색 + 근거를 지키는 생성
```
