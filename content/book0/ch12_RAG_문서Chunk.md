# RAG 문서 Loader·Chunk 사용자 가이드

## 학습 범위

```text
원본 문서 → Document Loader → list[Document] → Text Splitter → Chunk 목록
```

포함:

- 파일 로드
- `Document` 확인
- Chunk 분할
- metadata 보존
- 분할 결과 검증

제외:

- Embedding
- Vector Store
- Retriever
- Prompt·LLM

> Loader·Chunk 단계: 로컬 처리 중심 / `OPENAI_API_KEY` 불필요

## 핵심 개념

| 용어 | 의미 |
|---|---|
| Document | `page_content`와 `metadata`의 묶음 |
| Chunk | 검색·임베딩용 작은 문서 단위 |
| `chunk_size` | Chunk 최대 크기 |
| `chunk_overlap` | 인접 Chunk의 중복 범위 |
| Separator | 문단·줄·공백 등 분할 기준 |
| Structure-aware | 제목·태그·코드 구조 기반 분할 |

## 기본 원칙

```text
너무 큰 Chunk → 여러 주제 혼합·불필요한 문맥
너무 작은 Chunk → 의미 단절·정답 근거 분산
과도한 Overlap → 중복·저장량·비용 증가
```

권장 시작점:

| 문서 유형 | `chunk_size` | `chunk_overlap` | 기준 |
|---|---:|---:|---|
| 일반 한글 문서 | 500~1,000 | 50~200 | 문자 |
| 짧은 규정·FAQ | 300~600 | 30~100 | 문자 |
| 긴 보고서 | 800~1,500 | 100~250 | 문자 |
| Token 제한 중심 | 300~800 | 30~100 | Token |

> 최종값: 실제 질문·검색 결과 기반 조정

---

## 0. 실습 준비

### 프로젝트 구조

```text
rag-chunk/
├─ inspect_chunks.py
└─ data/
   ├─ policy.txt
   ├─ report.pdf
   ├─ manual.hwp
   ├─ manual.hwpx
   ├─ products.csv
   ├─ handbook.md
   ├─ articles.json
   ├─ sample.py
   └─ guide.html
```

### 기본 패키지

uv:

```powershell
uv init --python 3.12
uv add langchain-core langchain-community langchain-text-splitters
```

pip:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U langchain-core langchain-community langchain-text-splitters
```

### 예제별 추가 패키지

```powershell
uv add pymupdf langchain-hwp-hwpx-loader jq tiktoken beautifulsoup4
```

pip:

```powershell
python -m pip install -U pymupdf langchain-hwp-hwpx-loader jq tiktoken beautifulsoup4
```

| 예제 | 추가 패키지 |
|---|---|
| PDF | `pymupdf` |
| HWP·HWPX | `langchain-hwp-hwpx-loader` |
| JSON | `jq` |
| Token 기준 | `tiktoken` |
| HTML | `beautifulsoup4` |

---

## 1. 공통 Chunk 확인 함수

`inspect_chunks.py`:

```python
from langchain_core.documents import Document


def inspect_chunks(chunks: list[Document], preview_size: int = 240) -> None:
    print(f"Chunk 수: {len(chunks)}")

    for index, chunk in enumerate(chunks[:5], start=1):
        print(f"\n[{index}] 길이: {len(chunk.page_content)}")
        print(f"[{index}] metadata: {chunk.metadata}")
        print(f"[{index}] content:\n{chunk.page_content[:preview_size]}")
```

필수 확인값:

- Chunk 개수
- Chunk별 길이
- `page_content` 시작·끝 문맥
- `source`·`page` 등 metadata
- 빈 Chunk 여부

---

## 2. TXT Loader → 기본 Chunk

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

### 코드

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


# Loader
loader = TextLoader("data/policy.txt", encoding="utf-8")
documents = loader.load()

# Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=100,
    chunk_overlap=20,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

기본 Separator 순서:

```text
문단 구분(\n\n) → 줄 구분(\n) → 공백 → 문자
```

metadata 예시:

```text
{'source': 'data/policy.txt', 'start_index': 0}
```

---

## 3. 사용자 정의 Separator

### 대상

- `[제목]` 중심 규정
- 구분선 중심 보고서
- 문단 보존 우선 문서

### 코드

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


documents = TextLoader("data/policy.txt", encoding="utf-8").load()

splitter = RecursiveCharacterTextSplitter(
    separators=["\n[", "\n\n", "\n", ". ", " ", ""],
    chunk_size=120,
    chunk_overlap=20,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

Separator 원칙:

- 앞쪽 Separator: 높은 우선순위
- 문서 구조 기호: 최우선 후보
- 마지막 빈 문자열: 강제 문자 분할
- 샘플 Chunk 출력 후 조정

---

## 4. PDF Loader → 페이지 기반 Chunk

### 코드

```python
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


# PDF 페이지별 Document
loader = PyMuPDFLoader("data/report.pdf")
documents = loader.load()

# 페이지 내부 Chunk
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

metadata 확인:

- `source`: PDF 경로
- `page`: 원본 페이지 번호
- `start_index`: 페이지 내부 문자 위치

PDF 품질 점검:

- 페이지 순서
- 다단 문서 읽기 순서
- 반복 머리글·바닥글
- 표의 행·열 구조
- 스캔 페이지의 빈 본문

```text
텍스트 PDF → PyMuPDFLoader
스캔 PDF   → OCR 후 Chunk
복잡한 표  → Layout 분석 후 Chunk
```

---

## 5. HWP·HWPX Loader → Chunk

### HWP 전체 로드 후 분할

```python
from pathlib import Path

from langchain_hwp_hwpx import HwpHwpxLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


loader = HwpHwpxLoader(
    file_path=Path("data/manual.hwp"),
    mode="single",
    include_tables=True,
    include_notes=True,
    include_memos=True,
)
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,
    chunk_overlap=100,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

### HWPX 요소 단위 로드 후 분할

```python
from langchain_hwp_hwpx import HwpHwpxLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


loader = HwpHwpxLoader("data/manual.hwpx", mode="elements")
documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=60,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

`mode` 선택:

| 모드 | Loader 결과 | Chunk 전략 |
|---|---|---|
| `single` | 문서 전체 중심 | 반드시 길이 분할 |
| `elements` | 본문·표·각주 등 요소 중심 | 긴 요소만 추가 분할 |

점검 metadata:

- `source`
- `file_name`
- `file_type`
- `element_type`
- `element_index`

---

## 6. CSV Loader → 행 단위 Chunk

### 실습 CSV

`data/products.csv`:

```csv
product_id,name,category,description
P001,스마트 센서,센서,온도와 진동 데이터 수집 장치
P002,검사 카메라,비전,제품 외관 불량 검사 장치
P003,안전 게이트,안전,작업 구역 출입 통제 장치
```

### 행 단위 Document

```python
from langchain_community.document_loaders import CSVLoader

from inspect_chunks import inspect_chunks


loader = CSVLoader(
    file_path="data/products.csv",
    encoding="utf-8",
    source_column="product_id",
    metadata_columns=["product_id", "category"],
    content_columns=["name", "description"],
)
chunks = loader.load()

inspect_chunks(chunks)
```

핵심 판단:

```text
짧은 행 → Loader 결과 자체를 Chunk로 사용
긴 설명 열 → RecursiveCharacterTextSplitter 추가
```

### 긴 행 추가 분할

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter


row_documents = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=40,
)
chunks = splitter.split_documents(row_documents)
```

CSV 주의점:

- 여러 행의 무작위 결합 금지
- 제품·직원·설비 ID metadata 유지
- 표 헤더의 의미 유지
- 빈 셀·중복 행 확인

---

## 7. Markdown Loader → 제목 구조 Chunk

### 실습 Markdown

`data/handbook.md`:

```markdown
# 사내 업무 안내

## 휴가

연차 휴가 신청 위치: 그룹웨어

### 신청 기한

사용일 3일 전

## 보안

비밀번호 변경 위치: 보안 포털
```

### 1차: 제목 기준 분할

```python
from pathlib import Path

from langchain_text_splitters import MarkdownHeaderTextSplitter

from inspect_chunks import inspect_chunks


markdown_text = Path("data/handbook.md").read_text(encoding="utf-8")

headers = [
    ("#", "section"),
    ("##", "topic"),
    ("###", "subtopic"),
]

header_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=headers,
    strip_headers=False,
)
header_chunks = header_splitter.split_text(markdown_text)

for chunk in header_chunks:
    chunk.metadata["source"] = "data/handbook.md"

inspect_chunks(header_chunks)
```

metadata 예시:

```text
{
  'section': '사내 업무 안내',
  'topic': '휴가',
  'subtopic': '신청 기한',
  'source': 'data/handbook.md'
}
```

### 2차: 긴 제목 구간의 길이 분할

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter


length_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    add_start_index=True,
)
chunks = length_splitter.split_documents(header_chunks)

inspect_chunks(chunks)
```

권장 순서:

```text
Markdown 제목 구조 분할 → 긴 구간만 문자 길이 분할
```

---

## 8. JSON Loader → 객체 단위 Chunk

### 실습 JSON

`data/articles.json`:

```json
{
  "articles": [
    {"id": "A-001", "title": "안전 점검", "content": "작업 전 안전 점검표 작성"},
    {"id": "A-002", "title": "설비 점검", "content": "이상 발견 시 관리자 보고"}
  ]
}
```

### 객체 단위 Document

```python
from langchain_community.document_loaders import JSONLoader

from inspect_chunks import inspect_chunks


def add_metadata(record: dict, metadata: dict) -> dict:
    metadata["id"] = record.get("id")
    metadata["title"] = record.get("title")
    return metadata


loader = JSONLoader(
    file_path="data/articles.json",
    jq_schema=".articles[]",
    content_key="content",
    metadata_func=add_metadata,
)
chunks = loader.load()

inspect_chunks(chunks)
```

핵심 판단:

- 짧은 JSON 객체: Loader 결과 자체를 Chunk로 사용
- 긴 `content`: 문자 길이 추가 분할
- 중첩 JSON: `jq_schema`로 의미 단위 우선 선택
- ID·제목·유형: metadata 유지

---

## 9. Token 기준 Chunk

### 대상

- LLM Context 제한 중심 설계
- Embedding 모델의 Token 제한 관리
- 문자 수와 Token 수의 차이가 큰 문서

### 권장 방식

`RecursiveCharacterTextSplitter.from_tiktoken_encoder()`:

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


documents = TextLoader("data/policy.txt", encoding="utf-8").load()

splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    encoding_name="cl100k_base",
    chunk_size=300,
    chunk_overlap=40,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

특징:

- 분할 기준: 문단·줄·공백
- 크기 측정: Token
- Token 상한 관리
- `tiktoken` 로컬 실행
- OpenAI API 호출 없음

직접 Token 분할:

```python
from langchain_text_splitters import TokenTextSplitter


splitter = TokenTextSplitter(
    encoding_name="cl100k_base",
    chunk_size=300,
    chunk_overlap=40,
)
chunks = splitter.split_documents(documents)
```

한글·다국어 권장:

- 우선 선택: `RecursiveCharacterTextSplitter.from_tiktoken_encoder()`
- 이유: Unicode 문자 경계 보존

---

## 10. Python 코드 Loader → 함수·클래스 기반 Chunk

### 코드

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

from inspect_chunks import inspect_chunks


documents = TextLoader("data/sample.py", encoding="utf-8").load()

splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=500,
    chunk_overlap=50,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

inspect_chunks(chunks)
```

Python Separator 우선순위 예:

```text
class → def → 문단 → 줄 → 공백 → 문자
```

지원 언어 예:

- Python
- JavaScript·TypeScript
- Java·Kotlin
- C·C++·C#
- Go·Rust
- Markdown·HTML·LaTeX
- PowerShell

지원 목록 확인:

```python
from langchain_text_splitters import Language


print([language.value for language in Language])
```

---

## 11. HTML Loader → 제목 구조 Chunk

### 로컬 HTML

```python
from langchain_text_splitters import HTMLHeaderTextSplitter

from inspect_chunks import inspect_chunks


headers = [
    ("h1", "section"),
    ("h2", "topic"),
    ("h3", "subtopic"),
]

splitter = HTMLHeaderTextSplitter(headers_to_split_on=headers)
chunks = splitter.split_text_from_file("data/guide.html")

for chunk in chunks:
    chunk.metadata["source"] = "data/guide.html"

inspect_chunks(chunks)
```

긴 HTML 구간의 2차 분할:

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter


length_splitter = RecursiveCharacterTextSplitter(
    chunk_size=600,
    chunk_overlap=80,
)
chunks = length_splitter.split_documents(chunks)
```

HTML Splitter 선택:

| 요구사항 | Splitter |
|---|---|
| `h1`·`h2`·`h3` 계층 metadata | `HTMLHeaderTextSplitter` |
| `section`·`div` 중심 | `HTMLSectionSplitter` |
| 표·목록 등 구조 보존 | `HTMLSemanticPreservingSplitter` |

---

## 12. Chunk metadata 보강

### Chunk ID 추가

```python
for index, chunk in enumerate(chunks):
    source = chunk.metadata.get("source", "unknown")
    chunk.metadata["chunk_id"] = f"{source}::{index:05d}"
```

권장 metadata:

| 키 | 예시 | 목적 |
|---|---|---|
| `source` | `data/report.pdf` | 원본 출처 |
| `page` | `3` | PDF 페이지 |
| `start_index` | `1250` | 원문 내 시작 위치 |
| `section` | `보안 규정` | 제목 계층 |
| `document_id` | `POLICY-2026` | 문서 고유 ID |
| `chunk_id` | `POLICY-2026::00003` | Chunk 고유 ID |
| `updated_at` | `2026-09-12` | 문서 버전 판별 |
| `access_level` | `internal` | 검색 권한 필터 |

주의:

- metadata 값: 문자열·숫자·불리언 등 단순 자료형
- 비밀정보·개인정보 저장 금지
- 문서 갱신 시 Chunk ID 정책 유지
- 출처 표시용 필드 누락 금지

---

## 13. Chunk 품질 검사

### 자동 검사

```python
def validate_chunks(chunks, max_size: int) -> None:
    assert chunks, "Chunk 없음"

    for index, chunk in enumerate(chunks):
        assert chunk.page_content.strip(), f"빈 Chunk: {index}"
        assert len(chunk.page_content) <= max_size, (
            f"크기 초과: index={index}, size={len(chunk.page_content)}"
        )
        assert "source" in chunk.metadata, f"source 누락: {index}"


validate_chunks(chunks, max_size=1000)
print("Chunk 검증 완료")
```

예외:

- 구조 보존 Splitter의 최대 크기 초과 가능성
- 매우 긴 URL·표·코드 한 줄
- 후처리 기반 별도 강제 분할 필요

### 수동 검사

- 질문의 정답 문장과 주변 문맥의 동일 Chunk 포함 여부
- 제목과 본문의 연결 여부
- 표 헤더와 데이터 행의 연결 여부
- 문장 중간 절단 빈도
- 동일 내용의 과도한 반복 여부
- `source`·`page`·섹션 metadata 정확성

---

## 14. 실험 비교

### 설정 비교 코드

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter


settings = [
    {"chunk_size": 300, "chunk_overlap": 30},
    {"chunk_size": 600, "chunk_overlap": 60},
    {"chunk_size": 1000, "chunk_overlap": 100},
]

for setting in settings:
    splitter = RecursiveCharacterTextSplitter(
        **setting,
        add_start_index=True,
    )
    chunks = splitter.split_documents(documents)
    average_size = sum(len(chunk.page_content) for chunk in chunks) / len(chunks)

    print(
        setting,
        "chunk_count=",
        len(chunks),
        "average_size=",
        round(average_size, 1),
    )
```

비교 항목:

- Chunk 수
- 평균·최대·최소 길이
- 문장 절단 비율
- metadata 누락
- 정답 문맥 포함 여부
- 중복 비율

---

## 15. 문서 유형별 선택표

| 문서 유형 | Loader | 1차 Chunk | 2차 Chunk |
|---|---|---|---|
| TXT | `TextLoader` | `RecursiveCharacterTextSplitter` | Token 기준 선택 |
| 일반 PDF | `PyMuPDFLoader` | 페이지 | 문자·Token 기준 |
| HWP·HWPX | `HwpHwpxLoader` | 전체·요소 | 문자 기준 |
| CSV | `CSVLoader` | 행 | 긴 행만 문자 기준 |
| Markdown | 파일 읽기 | 제목 계층 | 문자 기준 |
| JSON | `JSONLoader` | 객체 | 긴 본문만 문자 기준 |
| Python 코드 | `TextLoader` | 언어 구조 | 문자 기준 |
| HTML | HTML 구조 Splitter | 제목·Section | 문자 기준 |

## 16. 오류 해결

| 증상 | 원인 후보 | 핵심 조치 |
|---|---|---|
| Chunk 1개만 출력 | 원문이 `chunk_size`보다 짧음 | 실습값 축소·긴 문서 사용 |
| Chunk 크기 초과 | 긴 단일 요소·구조 보존 | Separator·후처리 확인 |
| 문장 중간 절단 | `chunk_size` 부족 | 크기 증가·Separator 개선 |
| 중복 내용 과다 | Overlap 과다 | `chunk_overlap` 축소 |
| 제목 정보 누락 | 일반 문자 분할만 사용 | Markdown·HTML 구조 분할 적용 |
| PDF 페이지 누락 | Loader 결과 문제 | Chunk 전 `documents` 확인 |
| HWP 표 누락 | Loader 옵션 문제 | `include_tables=True` 확인 |
| CSV 여러 행 혼합 | 전체 텍스트 변환 | `CSVLoader` 행 단위 사용 |
| JSON 객체 혼합 | `jq_schema` 오류 | 의미 단위 경로 지정 |
| `source` 누락 | 직접 생성 Chunk | metadata 수동 추가 |

## 17. 완료 체크리스트

- [ ] Loader 결과의 `Document` 수 확인
- [ ] 원문 본문 누락 여부 확인
- [ ] 문서 유형별 Splitter 선택
- [ ] Chunk 크기·Overlap 기록
- [ ] Chunk 시작·끝 문맥 확인
- [ ] 빈 Chunk 제거
- [ ] `source` metadata 유지
- [ ] PDF 페이지 metadata 유지
- [ ] Markdown·HTML 제목 metadata 유지
- [ ] CSV·JSON 식별자 metadata 유지
- [ ] 최소 3개 설정 비교

## 핵심 정리

1. Loader 결과: `list[Document]`
2. Chunk 입력: `Document` 목록
3. 일반 문서 기본값: `RecursiveCharacterTextSplitter`
4. Markdown·HTML·코드: 구조 기반 우선 분할
5. CSV·JSON: 행·객체 의미 단위 우선
6. Token 제한: `from_tiktoken_encoder()`
7. 품질 기준: 정답 문맥·metadata·중복·크기

## 개발문서·예시 링크

### LangChain 공식

- [Text Splitter 통합 가이드](https://docs.langchain.com/oss/python/integrations/splitters) — 분할 전략 전체
- [RecursiveCharacterTextSplitter](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter) — 일반 문서 권장 분할
- [Token 기준 분할](https://docs.langchain.com/oss/python/integrations/splitters/split_by_token) — tiktoken·TokenTextSplitter
- [Markdown 제목 분할](https://docs.langchain.com/oss/python/integrations/splitters/markdown_header_metadata_splitter) — 제목 metadata·2단계 분할
- [HTML 분할](https://docs.langchain.com/oss/python/integrations/splitters/split_html) — Header·Section·구조 보존
- [프로그래밍 언어별 분할](https://docs.langchain.com/oss/python/integrations/splitters/code_splitter) — Python·JavaScript·Java 등
- [langchain-text-splitters API](https://reference.langchain.com/python/langchain-text-splitters/langchain_text_splitters) — 전체 클래스·메서드
- [TextSplitter API](https://reference.langchain.com/python/langchain-text-splitters/base/TextSplitter) — `split_text()`·`split_documents()`·`create_documents()`
- [MarkdownHeaderTextSplitter API](https://reference.langchain.com/python/langchain-text-splitters/markdown/MarkdownHeaderTextSplitter) — 생성자·옵션
- [Document Loader 통합 목록](https://docs.langchain.com/oss/python/integrations/document_loaders) — 형식별 Loader

### 문서 형식별

- [PyMuPDF 공식 문서](https://pymupdf.readthedocs.io/) — PDF 파싱
- [HWP/HWPX Loader 예제](https://github.com/jaypakdevkr/HWP-Loader) — HWP·HWPX 단일·요소 로드
- [tiktoken 저장소](https://github.com/openai/tiktoken) — OpenAI Tokenizer

> 다음 단계 입력: 검증 완료된 `chunks: list[Document]`
