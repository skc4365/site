# RAG 문서 Loader·Chunk·Embedding·Vector Store 사용자 가이드

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
```

포함:

- TXT·PDF·CSV·HWP·HWPX·Markdown Loader
- Chunk 분할
- OpenAI Embedding
- Vector Store 생성
- Chunk·metadata·Vector 저장
- 안정적 ID 생성
- 로컬 영속성
- 추가·확인·수정·삭제

제외:

- Similarity Search
- Retriever
- Prompt
- Chat Model·LLM
- RAG 답변 생성

> 최종 산출물: `Vector Store = Chunk text + metadata + embedding vector + ID`

---

## Vector Store 핵심

```text
Chunk text ──→ Embedding Model ──→ Vector
    │                              │
    └─ metadata + ID ───────────┘
                    ↓
               Vector Store
```

저장 단위:

| 항목 | 예시 | 용도 |
|---|---|---|
| ID | `policy.txt:0:7a20...` | Chunk 고유 식별 |
| text | `연차 휴가 신청...` | 원문 Chunk |
| vector | `[0.012, -0.031, ...]` | 의미 기반 숫자 표현 |
| metadata | `source`, `page`, `start_index` | 출처·필터·추적 |

LangChain 공통 인터페이스:

| 메서드 | 범위 |
|---|---|
| `from_documents()` | Document 목록 기반 초기 생성 |
| `add_documents()` | Document 추가·임베딩·저장 |
| `get_by_ids()` | ID 기반 저장 내용 확인 |
| `delete()` | ID 기반 삭제 |

중요 흐름:

```text
vector_store.add_documents(chunks)
        ↓
등록된 Embedding Model의 embed_documents()
        ↓
text + vector + metadata + ID 저장
```

> `embed_documents()` 선행 후 `add_documents()` 사용: 일반적으로 중복 임베딩·중복 비용

---

## 0. Vector Store 선택

| 유형 | 패키지 | 저장 | 적합 용도 |
|---|---|---|---|
| `InMemoryVectorStore` | `langchain-core` | 프로세스 메모리 | 학습·유닛 테스트·소규모 실험 |
| `Chroma` 메모리 | `langchain-chroma` | 프로세스 메모리 | Chroma API 실습 |
| `Chroma` 영속 모드 | `langchain-chroma` | 로컬 디렉터리 | 로컬 개발·재시작 후 재사용 |

선택 기준:

```text
가장 단순한 실습       → InMemoryVectorStore
로컬 저장·재시작   → Chroma + persist_directory
서버·팀 공유·대용량 → 운영용 Vector DB 별도 검토
```

---

## 1. 프로젝트 준비

### 폴더 구조

```text
rag-vector-store/
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
uv add langchain-chroma pymupdf langchain-hwp-hwpx-loader
```

### pip 설치

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U langchain-core langchain-community langchain-text-splitters langchain-openai python-dotenv
python -m pip install -U langchain-chroma pymupdf langchain-hwp-hwpx-loader
```

패키지 역할:

| 패키지 | 역할 |
|---|---|
| `langchain-core` | `Document`, `InMemoryVectorStore` |
| `langchain-community` | TXT·PDF·CSV Loader |
| `langchain-text-splitters` | Chunk 분할 |
| `langchain-openai` | `OpenAIEmbeddings` |
| `langchain-chroma` | Chroma Vector Store |
| `pymupdf` | PDF 파서 |
| `langchain-hwp-hwpx-loader` | HWP·HWPX Loader |

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

- 코드 내 API Key 직접 입력 금지
- Git 커밋·화면 캡처·로그 노출 금지
- 노출 Key 즉시 폐기·재발급
- 운영 환경 Secret Manager 우선

데이터 흐름:

```text
Loader·Chunk·Chroma 로컬 처리
Chunk 임베딩 본문 → OpenAI API 전송
```

---

## 3. 공통 Embedding·Chunk ID

### Embedding Model

```python
from langchain_openai import OpenAIEmbeddings


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

원칙:

- 문서·질문 Embedding Model 일치
- Vector Store 내 차원 일치
- Embedding Model 변경 시 전체 재생성
- `dimensions` 변경 시 전체 재생성
- 빈 Chunk 제거

### 안정적 Chunk ID

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
```

ID 기준:

- 재실행 시 동일 Chunk → 동일 ID
- 원본·페이지·시작 위치·본문 반영
- 순차 번호 단독 ID 지양
- 서로 다른 컬렉션 간 ID 충돌 확인

---

## 4. 예제 1—Document → InMemoryVectorStore

최소 예제:

```python
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings


load_dotenv()

documents = [
    Document(
        page_content="연차 휴가 신청 위치: 그룹웨어",
        metadata={"source": "policy", "category": "vacation"},
    ),
    Document(
        page_content="비밀번호 변경 주기: 90일",
        metadata={"source": "policy", "category": "security"},
    ),
]
ids = ["policy-vacation-001", "policy-security-001"]

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = InMemoryVectorStore(embedding=embeddings)

saved_ids = vector_store.add_documents(
    documents=documents,
    ids=ids,
)

print(saved_ids)
print("store_count:", len(vector_store.store))
print(vector_store.get_by_ids(["policy-vacation-001"]))
```

저장 특성:

- Python 프로세스 종료 시 메모리 데이터 소멸
- 서버 재시작 후 재사용 불가
- 파일·DB 설정 불필요
- 작은 예제·테스트 적합

---

## 5. 예제 2—TXT Loader → Chunk → InMemoryVectorStore

`data/policy.txt`:

```text
[휴가 규정]
연차 휴가 신청 위치: 그룹웨어
신청 기한: 사용일 3일 전

[보안 규정]
비밀번호 변경 위치: 보안 포털
변경 주기: 90일
```

전체 흐름:

```python
from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, make_chunk_ids


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

# 3. Embedding Model + Vector Store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = InMemoryVectorStore(embedding=embeddings)

# 4. Embedding + Store
saved_ids = vector_store.add_documents(chunks, ids=ids)

print("document_count:", len(documents))
print("chunk_count:", len(chunks))
print("saved_count:", len(saved_ids))
print("vector_count:", len(vector_store.store))
```

핵심:

```text
Loader 결과 개수 ≤ Chunk 개수
Chunk 개수 = ID 개수 = 저장 Vector 개수
```

---

## 6. 예제 3—PDF Loader → Chunk → Chroma

로컬 영속 저장:

```python
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, make_chunk_ids


load_dotenv()

# 1. PDF 페이지 로드
documents = PyMuPDFLoader("data/report.pdf").load()

# 2. 페이지 내부 Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    add_start_index=True,
)
chunks = clean_chunks(splitter.split_documents(documents))
ids = make_chunk_ids(chunks)

# 3. Embedding Model
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 4. Chroma 로컬 컬렉션
vector_store = Chroma(
    collection_name="report_chunks",
    embedding_function=embeddings,
    persist_directory="./chroma_db",
)

# 5. Embedding + Store
saved_ids = vector_store.add_documents(chunks, ids=ids)

print("page_count:", len(documents))
print("chunk_count:", len(chunks))
print("saved_count:", len(saved_ids))
```

PDF metadata:

- `source`: PDF 파일 경로
- `page`: 원본 페이지
- `start_index`: 페이지 내부 Chunk 시작 위치

PDF 예외:

| PDF 유형 | 선행 작업 |
|---|---|
| 일반 텍스트 | `PyMuPDFLoader` |
| 스캔 이미지 | OCR |
| 복잡한 표·다단 | Layout 분석 |
| 암호화 | 비밀번호·접근 권한 |

> `persist_directory` 기반 자동 영속성—별도 `persist()` 호출 불필요

---

## 7. 예제 4—CSV Loader → 행 Chunk → Chroma

`data/products.csv`:

```csv
product_id,name,category,description
P001,스마트 센서,센서,온도와 진동 데이터 수집 장치
P002,검사 카메라,비전,제품 외관 불량 검사 장치
P003,안전 게이트,안전,작업 구역 출입 통제 장치
```

행 단위 저장:

```python
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.document_loaders import CSVLoader
from langchain_openai import OpenAIEmbeddings


load_dotenv()

# 1. 행 단위 Document
chunks = CSVLoader(
    file_path="data/products.csv",
    encoding="utf-8",
    source_column="product_id",
    metadata_columns=["product_id", "category"],
    content_columns=["name", "description"],
).load()

# 2. 업무 키 기반 ID
ids = [f"product:{chunk.metadata['product_id']}" for chunk in chunks]

# 3. Vector Store
vector_store = Chroma(
    collection_name="product_rows",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)

# 4. Embedding + Store
saved_ids = vector_store.add_documents(chunks, ids=ids)
print(saved_ids)
```

CSV 전략:

```text
짧은 행 → CSVLoader의 Document 1개 = Vector 1개
긴 설명 → 행별 추가 Chunk
고유 업무 키 → Vector ID에 활용
```

---

## 8. 예제 5—HWP·HWPX Loader → Chunk → Chroma

HWP 전체 문서 기준:

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_hwp_hwpx import HwpHwpxLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from common import clean_chunks, make_chunk_ids


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
saved_ids = vector_store.add_documents(chunks, ids=ids)

print("document_count:", len(documents))
print("chunk_count:", len(chunks))
print("saved_count:", len(saved_ids))
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
```

metadata 후보:

- `source`
- `file_name`
- `file_type`
- `element_type`
- `element_index`
- `start_index`

---

## 9. 예제 6—Markdown 제목 Chunk → Chroma

제목 구조 보존:

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)

from common import clean_chunks, make_chunk_ids


load_dotenv()

# 1. Markdown 로드
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
ids = make_chunk_ids(chunks)

# 4. Embedding + Vector Store
vector_store = Chroma(
    collection_name="markdown_handbook",
    embedding_function=OpenAIEmbeddings(
        model="text-embedding-3-small"
    ),
    persist_directory="./chroma_db",
)
vector_store.add_documents(chunks, ids=ids)
```

보존 metadata:

- `section`
- `topic`
- `subtopic`
- `source`
- `start_index`

---

## 10. Chroma 재연결·저장 확인

같은 컬렉션·디렉터리 기반 재연결:

```python
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings


load_dotenv()

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = Chroma(
    collection_name="report_chunks",
    embedding_function=embeddings,
    persist_directory="./chroma_db",
)

stored = vector_store.get(
    limit=5,
    include=["documents", "metadatas"],
)

print("ids:", stored["ids"])
print("documents:", stored["documents"])
print("metadatas:", stored["metadatas"])
```

재연결 일치 항목:

- `collection_name`
- `persist_directory`
- Embedding Model
- `dimensions` 설정

> 다른 Embedding 모델·차원 혼합 금지

---

## 11. ID 기반 확인·수정·삭제

### 확인

```python
documents = vector_store.get_by_ids(
    ["product:P001", "product:P002"]
)

for document in documents:
    print(document.id)
    print(document.page_content)
    print(document.metadata)
```

주의:

- 입력 ID 순서와 반환 Document 순서의 불일치 가능성
- 반환 `Document.id` 기준 매칭
- 존재하지 않는 ID의 누락 가능성

### 수정—Chroma

```python
from langchain_core.documents import Document


updated = Document(
    page_content="스마트 센서: 온도·진동·습도 데이터 수집 장치",
    metadata={
        "source": "P001",
        "product_id": "P001",
        "category": "센서",
    },
)

vector_store.update_documents(
    ids=["product:P001"],
    documents=[updated],
)
```

수정 흐름:

```text
ID 유지
   +
새 text·metadata
   ↓
새 Embedding Vector + 새 Document 내용
```

### 삭제

```python
vector_store.delete(ids=["product:P003"])
```

삭제 전 확인:

- 대상 ID 목록
- 대상 컬렉션
- 복구·재생성 가능성
- 원본 문서 보존 상태

---

## 12. 비동기 InMemoryVectorStore

```python
import asyncio

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings


async def main() -> None:
    load_dotenv()

    chunks = [
        Document(
            page_content="설비 점검 주기: 30일",
            metadata={"source": "maintenance"},
        ),
        Document(
            page_content="안전 교육 주기: 1년",
            metadata={"source": "safety"},
        ),
    ]
    ids = ["maintenance-001", "safety-001"]

    vector_store = InMemoryVectorStore(
        embedding=OpenAIEmbeddings(
            model="text-embedding-3-small"
        )
    )

    saved_ids = await vector_store.aadd_documents(
        documents=chunks,
        ids=ids,
    )
    stored = await vector_store.aget_by_ids(saved_ids)

    print("saved_count:", len(saved_ids))
    print("stored_count:", len(stored))


asyncio.run(main())
```

활용 후보:

- 대량 Chunk 저장 파이프라인
- Async 웹 서버
- 여러 I/O 작업 병행 구조

---

## 13. metadata 설계

권장 예시:

```python
chunk.metadata.update(
    {
        "source": "data/report.pdf",
        "file_name": "report.pdf",
        "file_type": "pdf",
        "page": 3,
        "start_index": 1200,
        "document_version": "2026-09-12",
        "department": "quality",
    }
)
```

필수 후보:

| metadata | 목적 |
|---|---|
| `source` | 원본 위치 |
| `file_name` | 화면 표시·추적 |
| `file_type` | 문서 형식 구분 |
| `page` | PDF 페이지 |
| `start_index` | 원문 내부 위치 |
| `document_version` | 갱신·재생성 판단 |
| `department` | 접근 범위·필터 후보 |

주의:

- metadata 값: 문자열·숫자·불리언 위주
- 복잡한 객체·리스트: Vector DB 제약 확인
- 민감정보: 저장 전 제거·마스킹
- 출처·버전: 필수 권장

---

## 14. 재실행·중복 방지

위험 패턴:

```python
# 매번 다른 무작위 ID
ids = [str(uuid4()) for _ in chunks]
vector_store.add_documents(chunks, ids=ids)
```

결과:

- 동일 문서 재실행 시 중복 Chunk
- Vector 저장 용량 증가
- 임베딩 API 비용 증가
- 버전 구분 어려움

권장 패턴:

```text
원본 해시 또는 업무 키
   +
페이지·Chunk 위치
   ↓
결정적 ID
```

변경 문서 처리 선택지:

1. 기존 문서 ID 목록 삭제
2. 새 Chunk·ID 재생성
3. 새 Embedding·Vector 저장

또는:

1. 변경 Chunk ID 비교
2. 삭제·추가·수정 대상 산출
3. 변경분만 Vector Store 반영

---

## 15. 오류 해결

| 오류·증상 | 주요 원인 | 확인 항목 |
|---|---|---|
| `OPENAI_API_KEY` 누락 | `.env` 미로드 | `load_dotenv()`, 실행 위치 |
| 빈 Vector Store | Loader·Chunk 결과 0개 | `len(documents)`, `len(chunks)` |
| 차원 불일치 | 모델·`dimensions` 변경 | 새 컬렉션·전체 재임베딩 |
| 중복 데이터 | 매 실행 시 새 ID | 결정적 ID |
| metadata 저장 오류 | 복잡한 값 형식 | 문자열·숫자·불리언 변환 |
| Chroma 재연결 실패 | 디렉터리·컬렉션 불일치 | 두 설정값 비교 |
| PDF 본문 0자 | 스캔 PDF | OCR 선행 |
| HWP 로드 실패 | 암호·손상·미지원 형식 | 원본 파일·Loader 지원 범위 |
| 임베딩 비용 증가 | 중복 저장·과도한 Chunk | ID·Chunk 전략·Batch |

---

## 16. 완료 체크리스트

- [ ] `.env` 내 `OPENAI_API_KEY`
- [ ] `.env` Git 제외
- [ ] Loader 결과 개수 확인
- [ ] Chunk 결과 개수 확인
- [ ] 빈 Chunk 제거
- [ ] `source`·`page`·`start_index` metadata 확인
- [ ] Chunk ID 고유성·재현성 확인
- [ ] Embedding Model·출력 차원 고정
- [ ] Chunk 개수·ID 개수·저장 개수 일치
- [ ] Chroma `collection_name` 고정
- [ ] Chroma `persist_directory` 고정
- [ ] 재시작 후 재연결 확인
- [ ] 중복 ID·중복 Chunk 확인
- [ ] 민감정보·외부 API 전송 정책 확인

---

## 핵심 정리

```text
Loader
  → Document 생성

Text Splitter
  → 작은 Document Chunk 생성

OpenAIEmbeddings
  → Chunk text의 Vector 생성

Vector Store
  → ID + Chunk + metadata + Vector 저장
```

핵심 원칙:

1. 로드 결과 확인
2. Chunk 크기·중첩 정책 고정
3. metadata 보존
4. 결정적 ID
5. Embedding Model·차원 고정
6. `add_documents()` 기반 임베딩·저장
7. 재시작·중복·재생성 검증

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

- [Vector Store 요약·통합 목록](https://docs.langchain.com/oss/python/integrations/vectorstores)
- [VectorStore 공통 API](https://reference.langchain.com/python/langchain-core/vectorstores/base/VectorStore)
- [InMemoryVectorStore API](https://reference.langchain.com/python/langchain-core/vectorstores/in_memory/InMemoryVectorStore)
- [Chroma 통합 가이드](https://docs.langchain.com/oss/python/integrations/vectorstores/chroma)
- [Chroma API](https://reference.langchain.com/python/langchain-chroma/vectorstores/Chroma)
- [OpenAI Embeddings 통합](https://docs.langchain.com/oss/python/integrations/embeddings/openai)
- [Document Loader 통합](https://docs.langchain.com/oss/python/integrations/document_loaders)
- [Text Splitter 통합](https://docs.langchain.com/oss/python/integrations/splitters)
- [Recursive Text Splitter](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)

### 문서 형식·Vector DB

- [PyMuPDF 공식 문서](https://pymupdf.readthedocs.io/en/latest/)
- [HWP·HWPX Loader 예시](https://github.com/teddynote-lab/langchain-hwp-hwpx-loader)
- [Chroma 공식 문서](https://docs.trychroma.com/)
