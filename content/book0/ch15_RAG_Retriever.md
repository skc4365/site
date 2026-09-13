# RAG 문서 Loader·Chunk·Embedding·Vector Store·Retriever 사용자 가이드

## 학습 범위

```text
원본 문서
   ↓
Document Loader
   ↓
list[Document]
   ↓
Text Splitter
   ↓
Chunk 목록
   ↓
Embedding Model
   ↓
Vector Store
   ↓
Retriever
   ↓
관련 Document 목록
```

포함:

- TXT·PDF·CSV·HWP·HWPX·Markdown Loader
- Chunk 분할
- OpenAI Embedding
- InMemoryVectorStore·Chroma
- VectorStoreRetriever
- Similarity·MMR·Score Threshold
- metadata 필터
- 동기·Batch·비동기 실행
- BM25 키워드 Retriever

제외:

- Prompt Template
- Chat Model·LLM
- Context 조합
- RAG 답변 생성
- Agent·Tool
- Reranker

> 최종 산출물: `query: str → Retriever → list[Document]`

---

## Retriever 핵심

Retriever:

```text
비정형 Query 입력
       ↓
관련 Document 선택
       ↓
list[Document] 출력
```

Vector Store와 Retriever 차이:

| 구분 | Vector Store | Retriever |
|---|---|---|
| 핵심 책임 | Vector·text·metadata 저장·검색 | Query 기반 Document 반환 |
| 입력 | Document·text·vector·query | 일반적으로 `str` Query |
| 출력 | 메서드별 상이 | `list[Document]` |
| Runnable | 일반적으로 비해당 | 해당 |
| 대표 실행 | `similarity_search()` | `invoke()`, `batch()`, `ainvoke()` |

전환:

```python
retriever = vector_store.as_retriever()
```

실행:

```python
documents = retriever.invoke("연차 휴가 신청 방법")
```

출력 형식:

```python
[
    Document(
        page_content="...",
        metadata={"source": "...", "page": 1},
    ),
    ...,
]
```

> Retriever 결과: 답변 문장 아님—관련 원문 Chunk 목록

---

## 0. Retriever 검색 유형

| `search_type` | 핵심 | 주요 매개변수 | 적합 상황 |
|---|---|---|---|
| `similarity` | Query와 가까운 Chunk | `k` | 기본 의미 검색 |
| `mmr` | 관련성 + 결과 다양성 | `k`, `fetch_k`, `lambda_mult` | 비슷한 Chunk 중복 완화 |
| `similarity_score_threshold` | 최소 관련도 통과 | `k`, `score_threshold` | 낮은 관련도 결과 제거 |

주요 매개변수:

| 매개변수 | 의미 | 예시 |
|---|---|---|
| `k` | 최종 Document 수 | `4` |
| `fetch_k` | MMR 1차 후보 수 | `20` |
| `lambda_mult` | MMR 관련성—다양성 균형 | `0.5` |
| `score_threshold` | 최소 관련도 | `0.7` |
| `filter` | metadata 조건 | `{"department": "security"}` |

MMR `lambda_mult`:

```text
0.0 방향 → 다양성 비중 증가
1.0 방향 → Query 유사도 비중 증가
```

주의:

- `score_threshold` 해석: Vector Store·거리 함수별 차이
- metadata 필터 문법: Vector Store별 차이
- 실제 문서 기반 `k`·threshold 튜닝
- 최소 1개 결과 보장 없음

---

## 1. 프로젝트 준비

### 폴더 구조

```text
rag-retriever/
├─ .env
├─ .gitignore
├─ common.py
├─ chroma_db/
└─ data/
   ├─ policy.txt
   ├─ report.pdf
   ├─ products.csv
   ├─ manual.hwp
   ├─ manual.hwpx
   └─ handbook.md
```

### uv 설치

```powershell
uv init --python 3.12
uv add langchain-core langchain-community langchain-text-splitters langchain-openai python-dotenv
uv add langchain-chroma pymupdf langchain-hwp-hwpx-loader rank-bm25
```

### pip 설치

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U langchain-core langchain-community langchain-text-splitters langchain-openai python-dotenv
python -m pip install -U langchain-chroma pymupdf langchain-hwp-hwpx-loader rank-bm25
```

패키지 역할:

| 패키지 | 역할 |
|---|---|
| `langchain-core` | `Document`, `InMemoryVectorStore`, Retriever 공통 API |
| `langchain-community` | Loader, `BM25Retriever` |
| `langchain-text-splitters` | Chunk 분할 |
| `langchain-openai` | `OpenAIEmbeddings` |
| `langchain-chroma` | Chroma Vector Store |
| `pymupdf` | PDF 파서 |
| `langchain-hwp-hwpx-loader` | HWP·HWPX Loader |
| `rank-bm25` | BM25 키워드 점수 |

---

## 2. OpenAI API Key

### `.env`

```dotenv
OPENAI_API_KEY=sk-...
```

### `.gitignore`

```gitignore
.env
.venv/
__pycache__/
chroma_db/
```

### 환경변수 확인

```python
import os

from dotenv import load_dotenv


load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY 환경변수 누락")
```

보안 핵심:

- API Key 소스코드 입력 금지
- `.env` Git 제외
- 로그·화면 캡처 노출 금지
- 노출 Key 즉시 폐기·재발급

데이터 흐름:

```text
문서 로드·Chunk·Chroma 저장 → 로컬
Chunk·Query Embedding              → OpenAI API
```

---

## 3. 공통 함수

`common.py`:

```python
import hashlib
from pathlib import Path

from langchain_core.documents import Document


def clean_chunks(chunks: list[Document]) -> list[Document]:
    return [chunk for chunk in chunks if chunk.page_content.strip()]


def make_chunk_ids(chunks: list[Document]) -> list[str]:
    ids = []

    for index, chunk in enumerate(chunks):
        source = str(chunk.metadata.get("source", "unknown"))
        page = str(chunk.metadata.get("page", ""))
        start = str(chunk.metadata.get("start_index", ""))
        raw = f"{source}|{page}|{start}|{index}|{chunk.page_content}"
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]
        ids.append(f"{Path(source).stem}:{digest}")

    return ids


def print_documents(documents: list[Document]) -> None:
    print("result_count:", len(documents))

    for index, document in enumerate(documents, start=1):
        print(f"\n[{index}]")
        print("id:", document.id)
        print("metadata:", document.metadata)
        print("content:", document.page_content[:300])
```

확인 항목:

- 결과 개수
- `Document.id`
- `source`·`page`·`start_index`
- 본문 일부
- Query와 본문의 실제 관련성

---

## 4. 예제 1—Document → InMemoryVectorStore → Retriever

최소 예제:

```python
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

from common import print_documents


load_dotenv()

documents = [
    Document(
        page_content="연차 휴가 신청 위치: 그룹웨어",
        metadata={"category": "vacation"},
    ),
    Document(
        page_content="비밀번호 변경 주기: 90일",
        metadata={"category": "security"},
    ),
    Document(
        page_content="신규 입사자 보안 교육 기한: 입사 후 30일",
        metadata={"category": "education"},
    ),
]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = InMemoryVectorStore.from_documents(
    documents=documents,
    embedding=embeddings,
)

retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 2},
)

results = retriever.invoke("휴가는 어디에서 신청?")
print_documents(results)
```

흐름:

```text
Query
  → OpenAI Query Embedding
  → InMemoryVectorStore 유사도 비교
  → 상위 2개 Document
```

---

## 5. 예제 2—TXT Loader → Chroma → Similarity Retriever

`data/policy.txt`:

```text
[휴가]
연차 휴가 신청 위치: 그룹웨어
신청 기한: 사용일 3일 전

[보안]
비밀번호 변경 위치: 보안 포털
변경 주기: 90일
```

전체 파이프라인:

```python
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, make_chunk_ids, print_documents


load_dotenv()

# 1. Loader
documents = TextLoader("data/policy.txt", encoding="utf-8").load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=50,
    add_start_index=True,
)
chunks = clean_chunks(splitter.split_documents(documents))
ids = make_chunk_ids(chunks)

# 3. Embedding + Vector Store
vector_store = Chroma(
    collection_name="policy_chunks",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)
vector_store.add_documents(chunks, ids=ids)

# 4. Retriever
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3},
)

# 5. Retrieval
results = retriever.invoke("비밀번호 교체 주기")
print_documents(results)
```

핵심 점검:

```text
len(documents) ≤ len(chunks)
len(chunks) = len(ids)
len(results) ≤ k
```

---

## 6. 예제 3—PDF Loader → Chroma → MMR Retriever

PDF 다양성 검색:

```python
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, make_chunk_ids, print_documents


load_dotenv()

# 1. PDF Loader
documents = PyMuPDFLoader("data/report.pdf").load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    add_start_index=True,
)
chunks = clean_chunks(splitter.split_documents(documents))
ids = make_chunk_ids(chunks)

# 3. Embedding + Vector Store
vector_store = Chroma(
    collection_name="report_chunks",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)
vector_store.add_documents(chunks, ids=ids)

# 4. MMR Retriever
retriever = vector_store.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 20,
        "lambda_mult": 0.5,
    },
)

# 5. Retrieval
results = retriever.invoke("품질 검사 결과와 개선 대책")
print_documents(results)
```

MMR 효과:

- 1차 후보 `fetch_k=20`
- 최종 결과 `k=4`
- 비슷한 문장의 과도한 중복 완화
- 여러 페이지·관점 후보 확대

PDF metadata 확인:

- `source`
- `page`
- `start_index`

---

## 7. 예제 4—CSV Loader → Chroma → metadata Filter

`data/products.csv`:

```csv
product_id,name,category,description
P001,스마트 센서,센서,온도와 진동 데이터 수집 장치
P002,검사 카메라,비전,제품 외관 불량 검사 장치
P003,안전 게이트,안전,작업 구역 출입 통제 장치
```

카테고리 필터:

```python
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import CSVLoader
from langchain_openai import OpenAIEmbeddings

from common import print_documents


load_dotenv()

# 1. 행 단위 Document
chunks = CSVLoader(
    file_path="data/products.csv",
    encoding="utf-8",
    source_column="product_id",
    metadata_columns=["product_id", "category"],
    content_columns=["name", "description"],
).load()
ids = [f"product:{chunk.metadata['product_id']}" for chunk in chunks]

# 2. Embedding + Vector Store
vector_store = Chroma(
    collection_name="product_rows",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)
vector_store.add_documents(chunks, ids=ids)

# 3. metadata Filter Retriever
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={
        "k": 3,
        "filter": {"category": "안전"},
    },
)

# 4. Retrieval
results = retriever.invoke("출입 통제 장치")
print_documents(results)
```

필터 의미:

```text
1차 범위: category = 안전
2차 순위: Query Vector 유사도
```

주의:

- metadata 키·값의 정확한 일치
- 문자열·숫자·불리언 위주 저장
- Chroma 필터 문법 기준
- Vector Store 교체 시 필터 문법 재확인

---

## 8. 예제 5—HWP·HWPX → Score Threshold Retriever

HWP 전체 파이프라인:

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_hwp_hwpx import HwpHwpxLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, make_chunk_ids, print_documents


load_dotenv()

# 1. HWP Loader
documents = HwpHwpxLoader(
    file_path=Path("data/manual.hwp"),
    mode="single",
    include_tables=True,
    include_notes=True,
    include_memos=True,
).load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=100,
    add_start_index=True,
)
chunks = clean_chunks(splitter.split_documents(documents))
ids = make_chunk_ids(chunks)

# 3. Embedding + Vector Store
vector_store = Chroma(
    collection_name="hwp_manual",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)
vector_store.add_documents(chunks, ids=ids)

# 4. Score Threshold Retriever
retriever = vector_store.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "k": 5,
        "score_threshold": 0.65,
    },
)

# 5. Retrieval
results = retriever.invoke("설비 긴급 정지 절차")
print_documents(results)
```

HWPX 요소 기준:

```python
documents = HwpHwpxLoader(
    file_path=Path("data/manual.hwpx"),
    mode="elements",
).load()

chunks = clean_chunks(splitter.split_documents(documents))
ids = make_chunk_ids(chunks)

vector_store = Chroma(
    collection_name="hwpx_manual",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)
vector_store.add_documents(chunks, ids=ids)

retriever = vector_store.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"k": 5, "score_threshold": 0.65},
)
```

Threshold 튜닝:

```text
너무 낮은 값 → 무관련 Chunk 증가
너무 높은 값 → 결과 0개 증가
적절한 값      → 평가 Query Set 기반 결정
```

---

## 9. 예제 6—Markdown → Retriever Batch

제목 구조 기반 Chunk:

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)

from common import clean_chunks, print_documents


load_dotenv()

# 1. Markdown Loader
file_path = Path("data/handbook.md")
markdown_text = file_path.read_text(encoding="utf-8")

# 2. 제목 기준 1차 Chunk
header_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "section"),
        ("##", "topic"),
        ("###", "subtopic"),
    ],
    strip_headers=False,
)
header_chunks = header_splitter.split_text(markdown_text)

for chunk in header_chunks:
    chunk.metadata["source"] = str(file_path)

# 3. 길이 기준 2차 Chunk
length_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    add_start_index=True,
)
chunks = clean_chunks(
    length_splitter.split_documents(header_chunks)
)

# 4. Embedding + Vector Store + Retriever
vector_store = InMemoryVectorStore.from_documents(
    documents=chunks,
    embedding=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
)
retriever = vector_store.as_retriever(
    search_kwargs={"k": 2}
)

# 5. Batch Retrieval
questions = [
    "연차 휴가 신청 절차",
    "정보보안 교육 기한",
    "비밀번호 변경 방법",
]
result_groups = retriever.batch(
    questions,
    config={"max_concurrency": 3},
)

for question, results in zip(questions, result_groups, strict=True):
    print("\nQUERY:", question)
    print_documents(results)
```

Batch 출력:

```text
list[str] Query
   ↓
list[list[Document]]
```

---

## 10. 예제 7—비동기 Retriever

```python
import asyncio

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

from common import print_documents


async def main() -> None:
    load_dotenv()

    chunks = [
        Document(page_content="설비 점검 주기: 30일"),
        Document(page_content="안전 교육 주기: 1년"),
        Document(page_content="품질 보고서 제출 기한: 매월 5일"),
    ]

    vector_store = InMemoryVectorStore.from_documents(
        documents=chunks,
        embedding=OpenAIEmbeddings(
            model="text-embedding-3-small"
        ),
    )
    retriever = vector_store.as_retriever(
        search_kwargs={"k": 2}
    )

    results = await retriever.ainvoke("설비 정기 점검")
    print_documents(results)


asyncio.run(main())
```

비동기 Batch:

```python
import asyncio


async def run_batch():
    return await retriever.abatch(
        ["설비 점검", "안전 교육"],
        config={"max_concurrency": 2},
    )


result_groups = asyncio.run(run_batch())
```

적합 환경:

- FastAPI·asyncio 기반 서버
- 여러 Query 병행 처리
- 외부 Embedding API I/O 대기

---

## 11. 예제 8—BM25 키워드 Retriever

Vector Store 없는 키워드 검색:

```text
Loader → Chunk → BM25Retriever → list[Document]
```

예제:

```python
import re

from langchain_community.document_loaders import TextLoader
from langchain_community.retrievers import BM25Retriever
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, print_documents


def tokenize(text: str) -> list[str]:
    return re.findall(r"[가-힣A-Za-z0-9]+", text.lower())


# 1. Loader
documents = TextLoader("data/policy.txt", encoding="utf-8").load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=50,
    add_start_index=True,
)
chunks = clean_chunks(splitter.split_documents(documents))

# 3. BM25 Retriever
retriever = BM25Retriever.from_documents(
    chunks,
    preprocess_func=tokenize,
)
retriever.k = 3

# 4. Retrieval
results = retriever.invoke("비밀번호 90일")
print_documents(results)
```

Vector Retriever—BM25 비교:

| 항목 | Vector Retriever | BM25Retriever |
|---|---|---|
| 기준 | 의미 유사도 | 단어 통계 |
| Embedding API | 필요 | 불필요 |
| 정확한 코드·번호 | 누락 가능성 | 강점 |
| 표현 변형·동의어 | 강점 | 약점 |
| 한국어 처리 | Embedding Model 품질 영향 | 토큰화·형태소 분석 영향 |

> 위 `tokenize()` 예제: 규칙 기반 단순 분리—운영용 한국어 형태소 분석기 별도 검토

---

## 12. Retriever 설정 비교

### Similarity

```python
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4},
)
```

적합:

- 일반적 의미 검색
- 단순한 최상위 Chunk
- 빠른 기준선 구성

### MMR

```python
retriever = vector_store.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 20,
        "lambda_mult": 0.5,
    },
)
```

적합:

- 반복 Chunk 많은 문서
- 여러 하위 주제 확보
- 관련성·다양성 균형

### Score Threshold

```python
retriever = vector_store.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={
        "k": 10,
        "score_threshold": 0.7,
    },
)
```

적합:

- 무관련 결과 제거
- 결과 0개 허용 흐름
- 평가 데이터 기반 임계값 튜닝

---

## 13. Query 설계

나쁜 Query:

```text
그거 어떻게 해?
문서 내용 알려줘
정책은?
```

개선 Query:

```text
연차 휴가 신청 위치와 신청 기한
신규 입사자 정보보안 교육 기한
설비 A-120 긴급 정지 절차
```

핵심:

- 대상 명칭
- 업무 행위
- 필요 조건
- 정확한 제품·규정·설비 코드
- 불필요한 대화 문구 최소화

> Query Rewrite·Multi Query·Self Query: LLM 활용 영역—본 장 범위 제외

---

## 14. Retrieval 결과 평가

최소 평가 Set:

```python
test_cases = [
    {
        "query": "연차 휴가 신청 위치",
        "expected_source": "data/policy.txt",
    },
    {
        "query": "비밀번호 변경 주기",
        "expected_source": "data/security.txt",
    },
]

hits = 0

for case in test_cases:
    results = retriever.invoke(case["query"])
    sources = {
        str(document.metadata.get("source"))
        for document in results
    }

    matched = case["expected_source"] in sources
    hits += int(matched)
    print(case["query"], matched, sources)

recall_at_k = hits / len(test_cases)
print("source_recall_at_k:", recall_at_k)
```

평가 항목:

| 항목 | 확인 |
|---|---|
| Recall@k | 정답 Chunk의 상위 k 포함 비율 |
| Precision@k | 상위 k 중 관련 Chunk 비율 |
| metadata 정확성 | 출처·페이지·버전 |
| 중복도 | 비슷한 Chunk의 과도한 반복 |
| 0건 비율 | Threshold·필터 과도 여부 |
| 지연 시간 | Embedding API + Vector Search 소요 시간 |

튜닝 순서:

```text
1. 정답 Query—Chunk Set 준비
2. Chunk 크기·중첩 비교
3. k 비교
4. Similarity—MMR 비교
5. Threshold 비교
6. metadata 필터 비교
```

---

## 15. 오류 해결

| 오류·증상 | 주요 원인 | 확인 항목 |
|---|---|---|
| `OPENAI_API_KEY` 누락 | `.env` 미로드 | `load_dotenv()`, 실행 위치 |
| 결과 0개 | 높은 threshold·잘못된 필터 | threshold 하향·필터 제거 비교 |
| 무관련 결과 | 작은 `k`·나쁜 Chunk·모호한 Query | `k`·Chunk·Query 튜닝 |
| 비슷한 결과 반복 | 중복 Chunk·Similarity 편중 | MMR·ID·Chunk 중복 확인 |
| metadata 필터 0건 | 키·값·자료형 불일치 | Vector Store 저장 내용 확인 |
| 차원 불일치 | Embedding Model·`dimensions` 변경 | 새 컬렉션·전체 재임베딩 |
| 결과 순서 변동 | 동점·인덱스·모델 변경 | 고정 평가 Set·모델·버전 |
| 느린 Batch | 높은 동시성·API 제한 | `max_concurrency`·Batch 크기 |
| BM25 한국어 품질 저하 | 단순 공백 토큰화 | 한국어 형태소 분석기 |

---

## 16. 완료 체크리스트

- [ ] `.env` 내 `OPENAI_API_KEY`
- [ ] `.env` Git 제외
- [ ] Loader 결과 개수 확인
- [ ] Chunk 결과·빈 Chunk 확인
- [ ] `source`·`page`·`start_index` metadata 확인
- [ ] Chunk ID 고유성·재현성 확인
- [ ] Embedding Model·출력 차원 고정
- [ ] Vector Store 저장 개수 확인
- [ ] `search_type` 명시
- [ ] `k`·`fetch_k`·`lambda_mult` 확인
- [ ] `score_threshold` 평가 Set 기반 결정
- [ ] metadata 필터 키·값·자료형 확인
- [ ] Retriever 출력 `list[Document]` 확인
- [ ] 결과 본문·출처·페이지 확인
- [ ] 정답 Query—Chunk 평가 Set 확인
- [ ] Prompt·LLM·답변 생성 코드 제외

---

## 핵심 정리

```text
Loader
  → Document

Text Splitter
  → Chunk

OpenAIEmbeddings
  → Document·Query Vector

Vector Store
  → Chunk·metadata·Vector·ID 저장

Retriever
  → Query 기반 list[Document]
```

핵심 원칙:

1. Retriever 출력 = 답변 아님
2. 문서·Query Embedding Model 일치
3. Chunk·metadata·ID 품질 우선
4. `similarity` 기본선
5. 중복 결과 → `mmr`
6. 무관련 결과 → `similarity_score_threshold`
7. 범위 제한 → metadata `filter`
8. 정답 Set 기반 튜닝

---

## 개발문서·예시 링크

### OpenAI 공식 문서

- [Embeddings 가이드](https://developers.openai.com/api/docs/guides/embeddings)
- [Create Embeddings API](https://developers.openai.com/api/reference/resources/embeddings/methods/create)
- [`text-embedding-3-small`](https://developers.openai.com/api/docs/models/text-embedding-3-small)
- [`text-embedding-3-large`](https://developers.openai.com/api/docs/models/text-embedding-3-large)
- [API Key·Quickstart](https://developers.openai.com/api/docs/quickstart)
- [API 데이터 제어](https://developers.openai.com/api/docs/guides/your-data)

### LangChain 공식 문서

- [Retriever 통합 목록](https://docs.langchain.com/oss/python/integrations/retrievers)
- [VectorStoreRetriever API](https://reference.langchain.com/python/langchain-core/vectorstores/base/VectorStoreRetriever)
- [BaseRetriever API](https://reference.langchain.com/python/langchain-core/retrievers/BaseRetriever)
- [Semantic Search 전체 예제](https://docs.langchain.com/oss/python/langchain/knowledge-base)
- [Vector Store 통합](https://docs.langchain.com/oss/python/integrations/vectorstores)
- [Chroma 통합·Retriever 예제](https://docs.langchain.com/oss/python/integrations/vectorstores/chroma)
- [InMemoryVectorStore API](https://reference.langchain.com/python/langchain-core/vectorstores/in_memory/InMemoryVectorStore)
- [BM25Retriever API](https://reference.langchain.com/python/langchain-community/retrievers/bm25/BM25Retriever)
- [OpenAI Embeddings 통합](https://docs.langchain.com/oss/python/integrations/embeddings/openai)
- [Document Loader 통합](https://docs.langchain.com/oss/python/integrations/document_loaders)
- [Text Splitter 통합](https://docs.langchain.com/oss/python/integrations/splitters)
- [Recursive Text Splitter](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)

### 문서 형식·Vector DB

- [PyMuPDF 공식 문서](https://pymupdf.readthedocs.io/en/latest/)
- [HWP·HWPX Loader 예시](https://github.com/teddynote-lab/langchain-hwp-hwpx-loader)
- [Chroma 공식 문서](https://docs.trychroma.com/)
