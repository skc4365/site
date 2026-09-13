# RAG 문서 Loader·Chunk·Embedding 사용자 가이드

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
Vector 목록
```

포함:

- 문서 로드
- Chunk 분할
- OpenAI Embedding
- 문서·질문 벡터 생성
- 벡터 크기·개수 검증
- 유사도 기초 확인

제외:

- Vector Store
- Retriever
- Prompt
- Chat Model·LLM
- RAG 답변 생성

> 최종 산출물: `Chunk + metadata + embedding vector`

## Embedding 핵심

```text
텍스트 → Embedding Model → 실수형 숫자 배열
```

예시:

```text
"연차 휴가 신청" → [0.012, -0.031, 0.008, ...]
```

| 입력 | 메서드 | 출력 |
|---|---|---|
| 문서 Chunk 여러 개 | `embed_documents()` | `list[list[float]]` |
| 사용자 질문 1개 | `embed_query()` | `list[float]` |

필수 원칙:

- 문서·질문: 동일 Embedding 모델
- 문서·질문: 동일 차원 수
- 모델 변경: 전체 문서 재임베딩
- 차원 변경: 전체 문서 재임베딩
- 빈 문자열 제거
- metadata와 Vector의 순서 일치

---

## 0. 프로젝트 준비

### 폴더 구조

```text
rag-embed/
├─ .env
├─ .gitignore
├─ inspect_embeddings.py
└─ data/
   ├─ policy.txt
   ├─ report.pdf
   ├─ manual.hwp
   ├─ manual.hwpx
   ├─ products.csv
   └─ handbook.md
```

### uv 설치

```powershell
uv init --python 3.12
uv add langchain-core langchain-community langchain-text-splitters langchain-openai python-dotenv
uv add pymupdf langchain-hwp-hwpx-loader
```

### pip 설치

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U langchain-core langchain-community langchain-text-splitters langchain-openai python-dotenv
python -m pip install -U pymupdf langchain-hwp-hwpx-loader
```

패키지 역할:

| 패키지 | 역할 |
|---|---|
| `langchain-core` | `Document` 자료형 |
| `langchain-community` | TXT·PDF·CSV Loader |
| `langchain-text-splitters` | Chunk 분할 |
| `langchain-openai` | `OpenAIEmbeddings` |
| `python-dotenv` | `.env` 로드 |
| `pymupdf` | PDF 파싱 |
| `langchain-hwp-hwpx-loader` | HWP·HWPX 파싱 |

---

## 1. OpenAI API Key

### `.env`

```dotenv
OPENAI_API_KEY=발급받은_API_Key
```

### `.gitignore`

```gitignore
.env
.venv/
__pycache__/
```

### 환경변수 확인

```python
import os

from dotenv import load_dotenv


load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError(".env의 OPENAI_API_KEY 확인 필요")

print("OPENAI_API_KEY: 설정 완료")
```

보안 원칙:

- Key 원문 출력 금지
- 코드 내부 Key 입력 금지
- Git 저장소 업로드 금지
- 개인별·환경별 Key 분리
- 노출 Key 즉시 폐기·재발급
- 운영 환경의 Secret Manager 사용

---

## 2. Embedding 모델 선택

공식 OpenAI 문서 기준:

| 모델 | 기본 차원 | 기준 |
|---|---:|---|
| `text-embedding-3-small` | 1,536 | 비용·성능 균형 중심 |
| `text-embedding-3-large` | 3,072 | 높은 품질 중심 |

공통 항목:

- 입력당 최대 8,192 Token
- 문자열 또는 문자열 배열 입력
- `dimensions` 매개변수 기반 차원 축소
- 입력 Token 기반 비용

기본 선택:

```python
from langchain_openai import OpenAIEmbeddings


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

고품질 선택:

```python
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
```

선택 기준:

```text
실습·대규모 문서·비용 우선 → text-embedding-3-small
품질 우선·정밀 검색           → text-embedding-3-large
```

---

## 3. 공통 Embedding 확인 함수

`inspect_embeddings.py`:

```python
from langchain_core.documents import Document


def inspect_embeddings(
    chunks: list[Document],
    vectors: list[list[float]],
) -> None:
    print(f"Chunk 수: {len(chunks)}")
    print(f"Vector 수: {len(vectors)}")

    if not vectors:
        print("Vector 없음")
        return

    print(f"Vector 차원: {len(vectors[0])}")
    print(f"첫 Vector 일부: {vectors[0][:5]}")
    print(f"첫 Chunk metadata: {chunks[0].metadata}")
    print(f"첫 Chunk content: {chunks[0].page_content[:200]}")
```

검증 기준:

```text
Chunk 수 = Vector 수
모든 Vector 차원 = 동일
Chunk 순서 = Vector 순서
```

---

## 4. 최소 Embedding 예제

### 문서 여러 개

```python
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings


load_dotenv()

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

texts = [
    "연차 휴가 신청 위치는 그룹웨어",
    "비밀번호 변경 위치는 보안 포털",
    "신규 입사자 교육 기한은 입사 후 30일 이내",
]

document_vectors = embeddings.embed_documents(texts)

print("문서 수:", len(document_vectors))
print("Vector 차원:", len(document_vectors[0]))
print("첫 Vector 일부:", document_vectors[0][:5])
```

### 질문 1개

```python
query = "휴가는 어디에서 신청하나요?"
query_vector = embeddings.embed_query(query)

print("질문 Vector 차원:", len(query_vector))
print("질문 Vector 일부:", query_vector[:5])
```

메서드 구분:

| 메서드 | 입력 | 목적 |
|---|---|---|
| `embed_documents(texts)` | `list[str]` | 색인용 문서 Vector |
| `embed_query(text)` | `str` | 검색용 질문 Vector |

---

## 5. TXT Loader → Chunk → Embedding

### 실습 문서

`data/policy.txt`:

```text
[휴가 규정]
연차 휴가 신청 위치는 그룹웨어이다. 신청 기한은 사용일 3일 전이다.

[보안 규정]
비밀번호 변경 위치는 보안 포털이다. 변경 주기는 90일이다.

[교육 규정]
신규 입사자의 정보보안 교육 기한은 입사 후 30일 이내이다.
```

### 전체 흐름

```python
from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_embeddings import inspect_embeddings


load_dotenv()

# 1. Loader
documents = TextLoader("data/policy.txt", encoding="utf-8").load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

# 3. Embedding
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
texts = [chunk.page_content for chunk in chunks]
vectors = embeddings.embed_documents(texts)

inspect_embeddings(chunks, vectors)
```

출력 핵심:

- Loader 결과: `list[Document]`
- Chunk 결과: `list[Document]`
- Embedding 입력: `list[str]`
- Embedding 결과: `list[list[float]]`

---

## 6. PDF Loader → Chunk → Embedding

### 전체 흐름

```python
from dotenv import load_dotenv
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_embeddings import inspect_embeddings


load_dotenv()

# 1. PDF 페이지 로드
documents = PyMuPDFLoader("data/report.pdf").load()

# 2. 페이지 내부 Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

# 3. 빈 Chunk 제거
chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

# 4. Embedding
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectors = embeddings.embed_documents(
    [chunk.page_content for chunk in chunks]
)

inspect_embeddings(chunks, vectors)
```

metadata 확인:

- `source`: PDF 파일 경로
- `page`: 원본 페이지
- `start_index`: 페이지 내부 시작 위치

PDF 예외:

| 유형 | 선행 작업 |
|---|---|
| 일반 텍스트 PDF | `PyMuPDFLoader` |
| 스캔 PDF | OCR |
| 복잡한 표·다단 | Layout 분석 |
| 암호화 PDF | 비밀번호·접근 권한 확인 |

> 빈 본문 Embedding 금지: Loader 결과 우선 점검

---

## 7. HWP·HWPX Loader → Chunk → Embedding

### HWP 전체 문서 기준

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_hwp_hwpx import HwpHwpxLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_embeddings import inspect_embeddings


load_dotenv()

# 1. HWP 로드
loader = HwpHwpxLoader(
    file_path=Path("data/manual.hwp"),
    mode="single",
    include_tables=True,
    include_notes=True,
    include_memos=True,
)
documents = loader.load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=100,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)
chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

# 3. Embedding
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectors = embeddings.embed_documents(
    [chunk.page_content for chunk in chunks]
)

inspect_embeddings(chunks, vectors)
```

### HWPX 요소 기준

```python
loader = HwpHwpxLoader("data/manual.hwpx", mode="elements")
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=60,
)
chunks = splitter.split_documents(documents)
chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

vectors = embeddings.embed_documents(
    [chunk.page_content for chunk in chunks]
)
```

metadata 보존 항목:

- `source`
- `file_name`
- `file_type`
- `element_type`
- `element_index`
- `start_index`

보안 확인:

```text
HWP 로드·Chunk → 로컬 처리
Chunk Embedding → OpenAI API로 본문 전송
```

기밀 문서 확인:

- 외부 전송 허용 여부
- 개인정보·영업비밀 마스킹
- 조직의 데이터 처리 정책
- API 프로젝트·지역·보존 정책

---

## 8. CSV Loader → 행별 Embedding

### 실습 CSV

`data/products.csv`:

```csv
product_id,name,category,description
P001,스마트 센서,센서,온도와 진동 데이터 수집 장치
P002,검사 카메라,비전,제품 외관 불량 검사 장치
P003,안전 게이트,안전,작업 구역 출입 통제 장치
```

### 전체 흐름

```python
from dotenv import load_dotenv
from langchain_community.document_loaders import CSVLoader
from langchain_openai import OpenAIEmbeddings

from inspect_embeddings import inspect_embeddings


load_dotenv()

# 1. 행 단위 Document
loader = CSVLoader(
    file_path="data/products.csv",
    encoding="utf-8",
    source_column="product_id",
    metadata_columns=["product_id", "category"],
    content_columns=["name", "description"],
)
chunks = loader.load()

# 2. 행별 Embedding
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectors = embeddings.embed_documents(
    [chunk.page_content for chunk in chunks]
)

inspect_embeddings(chunks, vectors)
```

Chunk 전략:

```text
짧은 행 → CSVLoader 결과 자체를 Chunk로 사용
긴 설명 → 행별 RecursiveCharacterTextSplitter 추가
```

metadata 핵심:

- `product_id`
- `category`
- 원본 행 번호
- 출처 식별자

---

## 9. Markdown Loader → 제목 Chunk → Embedding

### 제목 구조 기반

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)

from inspect_embeddings import inspect_embeddings


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
chunks = length_splitter.split_documents(header_chunks)
chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

# 4. Embedding
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectors = embeddings.embed_documents(
    [chunk.page_content for chunk in chunks]
)

inspect_embeddings(chunks, vectors)
```

권장 순서:

```text
제목 구조 보존 → 긴 Section 추가 분할 → Embedding
```

보존 metadata:

- `section`
- `topic`
- `subtopic`
- `source`
- `start_index`

---

## 10. 차원 축소 Embedding

### 256차원 예제

```python
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings


load_dotenv()

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    dimensions=256,
)

vector = embeddings.embed_query("설비 점검 절차")

print("Vector 차원:", len(vector))
print("Vector 일부:", vector[:5])
```

차원 선택 영향:

| 낮은 차원 | 높은 차원 |
|---|---|
| 저장 공간 감소 | 정보 표현력 증가 가능성 |
| 비교 연산량 감소 | 저장·연산량 증가 |
| 품질 저하 가능성 | 비용·성능 검증 필요 |

필수 조건:

```text
문서 Vector 차원 = 질문 Vector 차원 = 저장소 Index 차원
```

금지 조합:

```text
문서: text-embedding-3-small / 1,536차원
질문: text-embedding-3-small / 256차원
```

---

## 11. 비동기 Embedding

### 대상

- 비동기 API 서버
- 다수 문서 처리
- 기존 `asyncio` 파이프라인

### 코드

```python
import asyncio

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings


async def main() -> None:
    load_dotenv()

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    texts = [
        "설비 점검 주기: 매월",
        "안전 교육 주기: 분기별",
        "비밀번호 변경 주기: 90일",
    ]

    document_vectors = await embeddings.aembed_documents(texts)
    query_vector = await embeddings.aembed_query("보안 암호 변경 주기")

    print("문서 Vector 수:", len(document_vectors))
    print("질문 Vector 차원:", len(query_vector))


asyncio.run(main())
```

메서드 대응:

| 동기 | 비동기 |
|---|---|
| `embed_documents()` | `aembed_documents()` |
| `embed_query()` | `aembed_query()` |

---

## 12. OpenAI Python SDK 직접 사용

### 패키지

```powershell
uv add openai python-dotenv
```

### 단일 입력

```python
from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

client = OpenAI()
response = client.embeddings.create(
    model="text-embedding-3-small",
    input="연차 휴가 신청 위치는 그룹웨어",
    encoding_format="float",
)

vector = response.data[0].embedding

print("Vector 차원:", len(vector))
print("Vector 일부:", vector[:5])
print("사용 Token:", response.usage.total_tokens)
```

### 여러 입력

```python
texts = [
    "연차 휴가 신청 위치는 그룹웨어",
    "비밀번호 변경 위치는 보안 포털",
    "신규 입사자 교육 기한은 30일 이내",
]

response = client.embeddings.create(
    model="text-embedding-3-small",
    input=texts,
    encoding_format="float",
)

vectors = [item.embedding for item in response.data]

print("입력 수:", len(texts))
print("Vector 수:", len(vectors))
print("Vector 차원:", len(vectors[0]))
```

선택 기준:

| 방식 | 적합한 경우 |
|---|---|
| `OpenAIEmbeddings` | LangChain Loader·Splitter 연계 |
| OpenAI Python SDK | 직접 API 제어·응답 usage 확인 |

---

## 13. Chunk·Vector 연결

Embedding 결과 자체의 metadata 없음. Chunk와 Vector의 인덱스 기반 연결 필수.

```python
embedded_chunks = [
    {
        "text": chunk.page_content,
        "metadata": chunk.metadata,
        "embedding": vector,
    }
    for chunk, vector in zip(chunks, vectors, strict=True)
]

print(embedded_chunks[0]["metadata"])
print(embedded_chunks[0]["text"][:100])
print(embedded_chunks[0]["embedding"][:5])
```

권장 검증:

```python
assert len(chunks) == len(vectors)
assert all(vectors)
assert len({len(vector) for vector in vectors}) == 1
assert all(chunk.page_content.strip() for chunk in chunks)
```

순서 손상 위험:

- 비동기 작업 결과의 임의 정렬
- 실패 Chunk의 중간 제거
- Chunk 목록과 Vector 목록의 별도 수정
- 중복 제거 후 인덱스 불일치

안전 기준:

- 고유 `chunk_id`
- 입력 순서 보존
- `zip(..., strict=True)`
- 처리 전후 개수 검증

---

## 14. Cosine Similarity 확인

목적:

- Embedding 의미 비교
- 문서·질문 Vector 호환성 확인
- Vector Store 이전 최소 검증

### 표준 라이브러리 예제

```python
import math


def cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    if len(vector_a) != len(vector_b):
        raise ValueError("Vector 차원 불일치")

    dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
    norm_a = math.sqrt(sum(a * a for a in vector_a))
    norm_b = math.sqrt(sum(b * b for b in vector_b))

    if norm_a == 0 or norm_b == 0:
        raise ValueError("0 Vector 비교 불가")

    return dot_product / (norm_a * norm_b)


texts = [
    "연차 휴가 신청 위치는 그룹웨어",
    "비밀번호 변경 위치는 보안 포털",
    "휴가는 사내 시스템에서 신청",
]

vectors = embeddings.embed_documents(texts)

print("휴가↔보안:", cosine_similarity(vectors[0], vectors[1]))
print("휴가↔휴가:", cosine_similarity(vectors[0], vectors[2]))
```

예상 경향:

```text
휴가↔휴가 유사도 > 휴가↔보안 유사도
```

주의:

- 점수 절대값보다 동일 데이터 내 상대 순위 우선
- 모델별 점수 분포 차이
- 실제 검색 품질의 별도 평가 필요

---

## 15. 입력 정제와 Batch 처리

### 빈 Chunk 제거

```python
chunks = [
    chunk
    for chunk in chunks
    if chunk.page_content and chunk.page_content.strip()
]
```

### 공백 정리

```python
texts = [
    " ".join(chunk.page_content.split())
    for chunk in chunks
]
```

주의:

- 표·코드·Markdown 줄바꿈 손실 가능성
- 원문 보존 필요 시 공백 정리 생략

### 작은 Batch 분할

```python
def batched(items: list[str], size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


all_vectors: list[list[float]] = []

for text_batch in batched(texts, size=64):
    batch_vectors = embeddings.embed_documents(text_batch)
    all_vectors.extend(batch_vectors)

assert len(texts) == len(all_vectors)
```

Batch 크기 기준:

- Chunk Token 총량
- API 요청 제한
- 네트워크 안정성
- 재시도 비용
- 응답 지연 시간

공식 API 제한 확인 항목:

- 입력당 Token 상한
- 요청당 전체 Token 상한
- 입력 배열 크기
- 프로젝트 Rate Limit

---

## 16. 비용·성능 점검

Embedding 비용의 주요 변수:

```text
전체 입력 Token 수
= 문서 분량
+ Chunk Overlap 중복
+ 재임베딩 횟수
```

비용 절감 항목:

- 빈 Chunk 제거
- 과도한 Overlap 축소
- 변경 문서만 재임베딩
- Chunk 해시 기반 중복 제거
- 개발·운영 Index 분리
- 모델·차원별 품질 비교

성능 항목:

- Batch 처리
- 비동기 처리
- 실패 Batch 재시도
- 요청 제한 대응
- 처리 진행률 기록

---

## 17. 오류 해결

| 증상 | 원인 후보 | 핵심 조치 |
|---|---|---|
| `OPENAI_API_KEY` 오류 | `.env` 미로드·오타 | `load_dotenv()`·변수명 확인 |
| 인증 오류 | Key 폐기·프로젝트 권한 | Key·프로젝트 설정 확인 |
| Rate Limit | 요청량·Token량 과다 | Batch 축소·지수 백오프 |
| 입력 길이 오류 | Chunk Token 상한 초과 | Token 기준 재분할 |
| 빈 입력 오류 | 빈 페이지·빈 Chunk | 공백 검사 후 제거 |
| Vector 수 불일치 | 일부 Batch 실패 | Batch별 개수·오류 기록 |
| Vector 차원 불일치 | 모델·`dimensions` 혼합 | 동일 설정 기반 재임베딩 |
| PDF Vector 없음 | Loader 본문 추출 실패 | OCR·Layout 분석 선행 |
| HWP 결과 누락 | Loader 옵션·지원 형식 | 표·요소 옵션·파일 상태 확인 |
| 비용 증가 | 반복 전체 임베딩 | 변경분 처리·캐시·해시 적용 |

## 18. 완료 체크리스트

- [ ] `.env` 기반 API Key
- [ ] `.env` Git 제외
- [ ] Loader 결과 본문 확인
- [ ] 문서 유형별 Chunk 전략
- [ ] 빈 Chunk 제거
- [ ] `embed_documents()` 기반 문서 Vector
- [ ] `embed_query()` 기반 질문 Vector
- [ ] Chunk 수와 Vector 수 일치
- [ ] 모든 Vector 차원 일치
- [ ] metadata·Vector 연결 유지
- [ ] 유사 문장의 상대 점수 확인
- [ ] 모델·차원 설정 기록
- [ ] API 비용·Rate Limit 확인

## 핵심 정리

1. Loader 출력: `list[Document]`
2. Splitter 출력: Chunk `list[Document]`
3. Embedding 입력: Chunk 본문 `list[str]`
4. Embedding 출력: `list[list[float]]`
5. 문서 메서드: `embed_documents()`
6. 질문 메서드: `embed_query()`
7. 필수 일치값: 모델·차원·순서
8. 다음 단계 입력: Chunk·metadata·Vector

## 개발문서·예시 링크

### OpenAI 공식 문서

- [OpenAI Embeddings 가이드](https://developers.openai.com/api/docs/guides/embeddings) — Python 예제·모델·차원·유사도
- [Create Embeddings API](https://developers.openai.com/api/reference/resources/embeddings/methods/create) — 요청·응답·입력 제한
- [text-embedding-3-small](https://developers.openai.com/api/docs/models/text-embedding-3-small) — 모델 사양
- [text-embedding-3-large](https://developers.openai.com/api/docs/models/text-embedding-3-large) — 모델 사양
- [OpenAI API Quickstart](https://developers.openai.com/api/docs/quickstart) — API Key·Python SDK
- [OpenAI API 데이터 제어](https://developers.openai.com/api/docs/guides/your-data) — 데이터 보존·처리 정책

### LangChain 공식 문서

- [LangChain OpenAIEmbeddings](https://docs.langchain.com/oss/python/integrations/embeddings/openai) — 설치·`embed_documents()`·`embed_query()`
- [LangChain Embedding 통합 목록](https://docs.langchain.com/oss/python/integrations/text_embedding) — 공급자별 Embedding
- [LangChain Text Splitters](https://docs.langchain.com/oss/python/integrations/splitters) — Chunk 전략
- [LangChain Recursive Splitter](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter) — 일반 문서 분할
- [LangChain Document Loaders](https://docs.langchain.com/oss/python/integrations/document_loaders) — 파일 형식별 Loader

### 문서 형식별

- [PyMuPDF 공식 문서](https://pymupdf.readthedocs.io/) — PDF 파싱
- [HWP/HWPX Loader 예제](https://github.com/jaypakdevkr/HWP-Loader) — HWP·HWPX 로드
- [tiktoken 저장소](https://github.com/openai/tiktoken) — Token 계산·분할

> 다음 단계 범위: Vector Store 생성·저장
