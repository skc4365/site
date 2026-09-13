# RAG 문서 Loader 사용자 가이드

## 학습 목표

- `.env` 기반 OpenAI API Key 관리
- 파일 형식별 Document Loader 선택
- PDF·HWP·HWPX·CSV·TXT·Markdown·JSON·DOCX·PPTX·XLSX·HTML 로드
- `Document.page_content`·`Document.metadata` 확인
- 대용량 문서의 `lazy_load()` 활용

## Loader의 위치

```text
원본 문서
   ↓
Document Loader       ← 이번 가이드
   ↓
list[Document]
   ↓
Text Splitter → Embedding → Vector Store → Retriever → LLM
```

> Loader 역할: 파일 읽기와 `Document` 변환

## OpenAI API Key와 Loader

```text
문서 Loader        → OpenAI API 호출 없음
Embedding·LLM      → OPENAI_API_KEY 사용
```

- `.env` 설정: 다음 RAG 단계 준비
- Loader 실행 비용: 로컬 Loader 기준 OpenAI 비용 없음
- API Key 출력 금지
- 소스코드·Git 저장소 내 Key 입력 금지

---

## 0. 프로젝트 준비

### 폴더 구조

```text
rag-loaders/
├─ .env
├─ .gitignore
├─ check_env.py
├─ inspect_docs.py
└─ data/
   ├─ sample.txt
   ├─ sample.md
   ├─ sample.pdf
   ├─ sample.hwp
   ├─ sample.hwpx
   ├─ employees.csv
   ├─ articles.json
   ├─ manual.docx
   ├─ briefing.pptx
   ├─ sales.xlsx
   └─ page.html
```

### 기본 패키지

uv:

```powershell
uv init --python 3.12
uv add langchain-core langchain-community python-dotenv
```

pip:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U langchain-core langchain-community python-dotenv
```

### 형식별 추가 패키지

| 문서 | Loader | 추가 패키지 |
|---|---|---|
| TXT·MD | `TextLoader` | 없음 |
| PDF | `PyMuPDFLoader` | `pymupdf` |
| PDF 대안 | `PyPDFLoader` | `pypdf` |
| HWP·HWPX | `HwpHwpxLoader` | `langchain-hwp-hwpx-loader` |
| CSV | `CSVLoader` | 없음 |
| JSON | `JSONLoader` | `jq` |
| DOCX | `Docx2txtLoader` | `docx2txt` |
| PPTX | `UnstructuredPowerPointLoader` | `unstructured[pptx]` |
| XLSX | `UnstructuredExcelLoader` | `unstructured[xlsx]` |
| HTML | `BSHTMLLoader` | `beautifulsoup4` |

uv 설치:

```powershell
uv add pymupdf pypdf langchain-hwp-hwpx-loader docx2txt jq beautifulsoup4
uv add "unstructured[pptx]" "unstructured[xlsx]"
```

pip 설치:

```powershell
python -m pip install -U pymupdf pypdf langchain-hwp-hwpx-loader docx2txt jq beautifulsoup4
python -m pip install -U "unstructured[pptx]" "unstructured[xlsx]"
```

> 선택 설치 권장: 실제 문서 형식에 필요한 패키지만 설치

---

## 1. `.env` 기반 OpenAI Key

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

### Key 존재 여부 확인

`check_env.py`:

```python
import os

from dotenv import load_dotenv


load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise RuntimeError(".env의 OPENAI_API_KEY 확인 필요")

print("OPENAI_API_KEY: 설정 완료")
```

실행:

```powershell
uv run python check_env.py
```

보안 확인:

- Key 원문 출력 없음
- `.env` Git 제외
- 노출 Key 즉시 폐기·재발급
- 운영 환경: 배포 서비스의 Secret 기능

---

## 2. 공통 결과 확인 함수

`inspect_docs.py`:

```python
from langchain_core.documents import Document


def inspect_documents(documents: list[Document], preview_size: int = 300) -> None:
    print(f"Document 수: {len(documents)}")

    for index, document in enumerate(documents[:3], start=1):
        print(f"\n[{index}] metadata")
        print(document.metadata)
        print(f"[{index}] page_content")
        print(document.page_content[:preview_size])
```

모든 Loader의 공통 결과:

| 항목 | 의미 |
|---|---|
| `list[Document]` | `load()` 반환값 |
| `page_content` | 검색·분할 대상 본문 |
| `metadata` | 파일명·페이지·행 번호·요소 유형 등 출처 정보 |

---

## 3. TXT·Markdown Loader

### 대상

- `.txt`
- `.md`
- 로그·규정·회의록 등 일반 텍스트

### 코드

```python
from langchain_community.document_loaders import TextLoader

from inspect_docs import inspect_documents


loader = TextLoader("data/sample.txt", encoding="utf-8")
documents = loader.load()

inspect_documents(documents)
```

Markdown 파일:

```python
loader = TextLoader("data/sample.md", encoding="utf-8")
documents = loader.load()
```

특징:

- 파일 1개 → 기본 `Document` 1개
- Markdown 제목 구조의 별도 분석 없음
- 한글 깨짐 → UTF-8 저장 여부 확인

---

## 4. PDF Loader

### 4-1. PyMuPDFLoader

권장 대상:

- 일반 텍스트 PDF
- 페이지별 metadata 필요
- 빠른 로컬 파싱

```python
from langchain_community.document_loaders import PyMuPDFLoader

from inspect_docs import inspect_documents


loader = PyMuPDFLoader("data/sample.pdf")
documents = loader.load()

inspect_documents(documents)
```

대용량 PDF:

```python
loader = PyMuPDFLoader("data/sample.pdf")

for document in loader.lazy_load():
    print(document.metadata)
    print(document.page_content[:200])
```

### 4-2. PyPDFLoader

대안 Loader:

```python
from langchain_community.document_loaders import PyPDFLoader

from inspect_docs import inspect_documents


loader = PyPDFLoader("data/sample.pdf")
documents = loader.load()

inspect_documents(documents)
```

PDF 점검:

- 페이지 수와 `Document` 수
- metadata의 `source`·`page`
- 표·다단 편집의 읽기 순서
- 머리글·바닥글 반복
- 스캔 PDF의 빈 텍스트

```text
텍스트 PDF → PyMuPDFLoader·PyPDFLoader
스캔 PDF   → OCR 지원 Loader 별도 검토
복잡한 표  → Layout 분석 Loader 별도 검토
```

---

## 5. HWP·HWPX Loader

### Loader

- 패키지: `langchain-hwp-hwpx-loader`
- 클래스: `HwpHwpxLoader`
- 형식: HWP·HWPX
- 실행 방식: 순수 Python·로컬 처리
- 성격: LangChain 문서에 등재된 Community Loader

### 문서 전체를 하나로 로드

```python
from pathlib import Path

from langchain_hwp_hwpx import HwpHwpxLoader

from inspect_docs import inspect_documents


loader = HwpHwpxLoader(
    file_path=Path("data/sample.hwp"),
    mode="single",
    include_tables=True,
    include_notes=True,
    include_memos=True,
    include_hyperlinks=True,
)
documents = loader.load()

inspect_documents(documents)
```

### HWPX 요소 단위 로드

```python
from langchain_hwp_hwpx import HwpHwpxLoader


loader = HwpHwpxLoader("data/sample.hwpx", mode="elements")

for document in loader.lazy_load():
    print(
        document.metadata.get("element_index"),
        document.metadata.get("element_type"),
        document.page_content[:100],
    )
```

### 폴더 단위 로드

```python
from langchain_hwp_hwpx import HwpHwpxDirectoryLoader

from inspect_docs import inspect_documents


loader = HwpHwpxDirectoryLoader(
    dir_path="data",
    glob="**/*",
    recursive=True,
    mode="single",
    on_error="warn",
)
documents = loader.load()

inspect_documents(documents)
```

제한 사항:

- 암호화 문서: 복호화 미지원
- OCR·레이아웃 렌더링: 별도 도구 필요
- 표·각주·메모: 옵션별 결과 확인
- Community Loader: 샘플 문서 기반 사전 검증 필수

---

## 6. CSV Loader

### 샘플 CSV

`data/employees.csv`:

```csv
employee_id,name,department,role
E001,김민준,생산,설비 엔지니어
E002,이서연,품질,품질 분석가
E003,박지훈,안전,안전 관리자
```

### 기본 로드

```python
from langchain_community.document_loaders import CSVLoader

from inspect_docs import inspect_documents


loader = CSVLoader(
    file_path="data/employees.csv",
    encoding="utf-8",
)
documents = loader.load()

inspect_documents(documents)
```

### 열 이름·구분자 지정

```python
from langchain_community.document_loaders import CSVLoader


loader = CSVLoader(
    file_path="data/employees.csv",
    encoding="utf-8",
    source_column="employee_id",
    csv_args={
        "delimiter": ",",
        "quotechar": '"',
    },
)
documents = loader.load()
```

특징:

- CSV 한 행 → 기본 `Document` 1개
- `source_column` → 행별 출처 식별자
- 한글 Excel CSV 오류 → `utf-8-sig` 후보
- TSV → `delimiter="\t"`

---

## 7. JSON Loader

### 샘플 JSON

`data/articles.json`:

```json
{
  "articles": [
    {"id": "A-001", "title": "안전 점검", "content": "매일 작업 전 안전 점검표 작성"},
    {"id": "A-002", "title": "설비 점검", "content": "설비 이상 발견 시 관리자 보고"}
  ]
}
```

### 코드

```python
from langchain_community.document_loaders import JSONLoader

from inspect_docs import inspect_documents


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
documents = loader.load()

inspect_documents(documents)
```

핵심 설정:

- `jq_schema`: 반복 대상 JSON 경로
- `content_key`: 본문 필드
- `metadata_func`: ID·제목 등 metadata 이동
- JSONL: `json_lines=True`

---

## 8. Word DOCX Loader

### 코드

```python
from langchain_community.document_loaders import Docx2txtLoader

from inspect_docs import inspect_documents


loader = Docx2txtLoader("data/manual.docx")
documents = loader.load()

inspect_documents(documents)
```

점검 항목:

- 제목·문단 순서
- 표 내부 텍스트
- 머리글·바닥글
- 이미지 내부 글자

이미지·복잡한 레이아웃 중심 DOCX: Unstructured·Docling 등 대안 검토

---

## 9. PowerPoint PPTX Loader

### 코드

```python
from langchain_community.document_loaders import UnstructuredPowerPointLoader

from inspect_docs import inspect_documents


loader = UnstructuredPowerPointLoader(
    "data/briefing.pptx",
    mode="elements",
)
documents = loader.load()

inspect_documents(documents)
```

`mode` 비교:

| 값 | 결과 |
|---|---|
| `single` | 프레젠테이션 전체 중심 |
| `elements` | 제목·본문 등 요소 단위 |

점검 항목:

- 슬라이드 순서
- 제목·본문 구분
- 표와 도형 내부 텍스트
- 발표자 노트
- 이미지 내부 글자

---

## 10. Excel XLSX Loader

### 코드

```python
from langchain_community.document_loaders import UnstructuredExcelLoader

from inspect_docs import inspect_documents


loader = UnstructuredExcelLoader(
    "data/sales.xlsx",
    mode="elements",
)
documents = loader.load()

inspect_documents(documents)
```

점검 항목:

- Sheet 구분
- 병합 셀
- 빈 셀
- 수식과 계산 결과
- 날짜·숫자 형식
- 표 헤더와 행 관계

정형 데이터 분석 목적: `pandas.read_excel()` 우선 검토

---

## 11. HTML Loader

### 로컬 HTML

```python
from langchain_community.document_loaders import BSHTMLLoader

from inspect_docs import inspect_documents


loader = BSHTMLLoader(
    "data/page.html",
    open_encoding="utf-8",
    bs_kwargs={"features": "html.parser"},
)
documents = loader.load()

inspect_documents(documents)
```

특징:

- HTML 태그 제거
- 본문 텍스트 추출
- 문서 제목 metadata
- JavaScript 실행 없음

웹 URL 대상:

- 정적 페이지: `WebBaseLoader`
- JavaScript 렌더링 페이지: 브라우저 기반 Loader
- 이용약관·robots.txt·저작권 확인

---

## 12. 대용량 문서: `lazy_load()`

### 전체 로드

```python
documents = loader.load()
```

특성:

- 모든 `Document`의 메모리 적재
- 소규모 파일 중심

### 지연 로드

```python
for document in loader.lazy_load():
    print(document.metadata)
    print(document.page_content[:200])
```

특성:

- `Document` 순차 처리
- 대용량·다수 파일 중심
- 분할·색인 파이프라인 연결에 유리

---

## 13. Loader 선택표

| 요구사항 | 1차 선택 | 대안·보완 |
|---|---|---|
| 일반 텍스트 PDF | `PyMuPDFLoader` | `PyPDFLoader` |
| 스캔 PDF | OCR Loader | Tesseract·Cloud OCR |
| 복잡한 PDF 표·레이아웃 | Layout 분석 Loader | Unstructured·Docling |
| HWP·HWPX | `HwpHwpxLoader` | 문서 변환·전문 API |
| CSV 행 단위 검색 | `CSVLoader` | pandas 전처리 후 `Document` 생성 |
| JSON 경로 선택 | `JSONLoader` | 직접 파싱 후 `Document` 생성 |
| DOCX 일반 문단 | `Docx2txtLoader` | Unstructured·Docling |
| PPTX 요소 단위 | `UnstructuredPowerPointLoader` | 전문 문서 분석 API |
| XLSX 문서 검색 | `UnstructuredExcelLoader` | pandas 기반 정형 분석 |
| 로컬 HTML | `BSHTMLLoader` | Unstructured |

---

## 14. 공통 검증 체크리스트

- [ ] `documents` 타입: `list[Document]`
- [ ] `page_content` 빈 문자열 여부
- [ ] 전체 문서 수·페이지 수·행 수
- [ ] metadata의 `source` 값
- [ ] PDF 페이지 번호
- [ ] CSV 행 번호·식별자
- [ ] HWP 표·각주·메모
- [ ] 문단·표의 읽기 순서
- [ ] 한글 인코딩
- [ ] `lazy_load()` 지원 여부
- [ ] 암호화·손상 파일 예외 처리
- [ ] 개인정보·기밀정보의 외부 전송 여부

## 15. 오류 해결

| 증상 | 원인 후보 | 핵심 조치 |
|---|---|---|
| `ModuleNotFoundError` | 선택 Loader 패키지 누락 | 형식별 추가 패키지 설치 |
| `FileNotFoundError` | 실행 위치·경로 오류 | 프로젝트 루트·`data/` 확인 |
| 한글 깨짐 | 인코딩 불일치 | `utf-8`·`utf-8-sig` 비교 |
| PDF 본문 없음 | 스캔 이미지 PDF | OCR Loader 적용 |
| 표 순서 이상 | 레이아웃 파싱 한계 | Layout 분석 Loader 비교 |
| HWP 로드 실패 | 암호화·손상·지원 형식 문제 | 파일 상태·HWP/HWPX 구분 확인 |
| JSON 결과 없음 | 잘못된 `jq_schema` | JSON 구조와 경로 재확인 |
| CSV 열 오류 | 헤더·구분자 불일치 | `csv_args`·인코딩 확인 |
| Key 오류 | `.env` 미로드·오타 | `load_dotenv()`·변수명 확인 |

## 16. 핵심 정리

1. Loader 입력: 원본 파일·URL·데이터 소스
2. Loader 출력: `list[Document]` 또는 `Iterator[Document]`
3. 핵심 본문: `page_content`
4. 핵심 출처: `metadata`
5. OpenAI Key 사용 시점: Embedding·LLM
6. 대용량 처리: `lazy_load()`
7. 최종 Loader 선택: 샘플 문서 품질 비교

## 개발문서·예시 링크

### 공통

- [LangChain Document Loader 통합 목록](https://docs.langchain.com/oss/python/integrations/document_loaders) — 공통 인터페이스·Loader 카탈로그
- [LangChain BaseLoader API](https://reference.langchain.com/python/langchain-core/document_loaders/base/BaseLoader) — `load()`·`lazy_load()` 계약
- [LangChain Document API](https://reference.langchain.com/python/langchain-core/documents/base/Document) — `page_content`·`metadata`
- [OpenAI Developer Quickstart](https://platform.openai.com/docs/quickstart) — API Key 발급·환경변수 설정
- [OpenAI API Key 보안 가이드](https://help.openai.com/en/articles/5112595-best-practices-for-api-key) — 저장·공유·폐기 원칙

### 형식별

- [LangChain Community Loader 소스](https://github.com/langchain-ai/langchain-community/tree/main/libs/community/langchain_community/document_loaders) — PDF·CSV·JSON·Office·HTML Loader 구현
- [PyMuPDF 공식 문서](https://pymupdf.readthedocs.io/) — PDF 파싱 엔진
- [pypdf 공식 문서](https://pypdf.readthedocs.io/) — PyPDFLoader 기반 라이브러리
- [HWP/HWPX Loader 예제](https://github.com/jaypakdevkr/HWP-Loader) — 단일·요소·폴더 로드
- [Unstructured Loader 가이드](https://docs.langchain.com/oss/python/integrations/document_loaders/unstructured_file) — 여러 문서 형식·요소 단위 파싱
- [Unstructured 지원 파일 형식](https://docs.unstructured.io/platform/supported-file-types) — PDF·DOCX·PPTX·XLSX 등 지원 범위
- [Docling Loader 가이드](https://docs.langchain.com/oss/python/integrations/document_loaders/docling) — 복잡한 문서 구조 대안

> Community Loader: 사용자 기여 통합. 운영 적용 전 보안·라이선스·업데이트 상태·실제 문서 품질 검증
