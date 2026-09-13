# RAG 8단계 사용자 가이드

## 학습 목표

- 외부 문서 기반 질의응답
- RAG 색인·질의 흐름 이해
- 단계별 입력·출력 확인
- 답변 근거와 출처 표시
- 검색 오류와 생성 오류 분리

## 전체 흐름

```text
[색인 과정: 문서 등록·변경 시]
문서 로드 → 문서 분할 → 임베딩 → 벡터 저장소

[질의 과정: 사용자 질문 시]
질문 → 검색기 → 프롬프트 → LLM → 답변·출처
```

```text
RAG = Retrieval(검색) + Augmented(문맥 보강) + Generation(생성)
```

## 8단계 구성

| 단계 | 핵심 작업 | 입력 | 출력 |
|---:|---|---|---|
| 1 | 문서 로드 | 텍스트 파일 | `Document` 목록 |
| 2 | 문서 분할 | 긴 `Document` | 검색용 Chunk |
| 3 | 임베딩 준비 | 임베딩 모델명 | `OpenAIEmbeddings` |
| 4 | 벡터 저장 | Chunk | `InMemoryVectorStore` |
| 5 | 검색기 생성 | Vector Store | `Retriever` |
| 6 | 프롬프트 생성 | Context·질문 규칙 | `ChatPromptTemplate` |
| 7 | LLM·파서 생성 | 모델 설정 | 생성 Chain |
| 8 | 검색·생성·출처 | 사용자 질문 | 최종 답변·근거 |

> 1~4단계: 색인 과정 / 5~8단계: 질의 과정

---

## 0. 실습 준비

### 준비물

- Python 3.12
- OpenAI API Key
- 터미널: PowerShell·명령 프롬프트·Bash
- 소량의 API 사용 비용

### uv 환경

```powershell
mkdir rag-8step
cd rag-8step
uv init --python 3.12
uv add langchain langchain-openai langchain-text-splitters python-dotenv
mkdir data
```

### pip 환경

```powershell
mkdir rag-8step
cd rag-8step
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U langchain langchain-openai langchain-text-splitters python-dotenv
mkdir data
```

macOS·Linux 활성화:

```bash
source .venv/bin/activate
```

### 프로젝트 구조

```text
rag-8step/
├─ .env
├─ .gitignore
├─ rag_8steps.py
└─ data/
   └─ company_policy.txt
```

### 실습 문서

`data/company_policy.txt`:

```text
[휴가 규정]
연차 휴가 신청 기한: 사용일 3일 전
연차 휴가 신청 위치: 그룹웨어
반차 구분: 오전 반차, 오후 반차

[보안 규정]
비밀번호 변경 주기: 90일
비밀번호 변경 위치: 보안 포털
외부 저장 장치 사용 조건: 보안 담당자 승인

[교육 규정]
정보보안 교육 대상: 신규 입사자
정보보안 교육 기한: 입사 후 30일 이내
```

### API Key

`.env`:

```dotenv
OPENAI_API_KEY=발급받은_API_Key
```

`.gitignore`:

```gitignore
.env
.venv/
__pycache__/
```

보안 원칙:

- 코드 내부 API Key 입력 금지
- 화면 캡처·메신저 공유 금지
- Git 저장소 업로드 금지
- 노출 Key 즉시 폐기·재발급

---

## 1단계. 문서 로드

### 목적

- 파일 읽기
- LangChain `Document` 변환
- 출처 metadata 등록

### 코드

```python
from pathlib import Path

from langchain_core.documents import Document


file_path = Path("data/company_policy.txt")
text = file_path.read_text(encoding="utf-8")

documents = [
    Document(
        page_content=text,
        metadata={"source": file_path.name},
    )
]

print(f"로드한 문서: {len(documents)}개")
```

### 핵심 객체

| 속성 | 내용 |
|---|---|
| `page_content` | 문서 본문 |
| `metadata` | 출처·페이지·작성일·권한 등 부가정보 |

### 확인

```python
print(documents[0].page_content[:100])
print(documents[0].metadata)
```

예상 metadata:

```text
{'source': 'company_policy.txt'}
```

---

## 2단계. 문서 분할

### 목적

- 긴 문서의 Chunk 분할
- 검색 단위 생성
- 앞뒤 문맥 일부 보존

### 코드

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter


splitter = RecursiveCharacterTextSplitter(
    chunk_size=120,
    chunk_overlap=20,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

print(f"분할된 Chunk: {len(chunks)}개")
for index, chunk in enumerate(chunks, start=1):
    print(index, chunk.metadata, chunk.page_content[:60])
```

### 주요 설정

| 설정 | 의미 | 실습값 | 일반 시작 범위 |
|---|---|---:|---:|
| `chunk_size` | Chunk 최대 문자 수 | 120 | 500~1,000 |
| `chunk_overlap` | 인접 Chunk 중복 문자 수 | 20 | 50~200 |
| `add_start_index` | 원문 시작 위치 metadata | `True` | `True` 권장 |

### 품질 신호

- 너무 큰 Chunk: 여러 주제 혼합
- 너무 작은 Chunk: 문맥 단절
- 과도한 Overlap: 저장량·비용·중복 검색 증가
- 최적값: 문서 구조·질문 유형별 실험

---

## 3단계. 임베딩 준비

### 목적

- 문서 의미의 숫자 벡터 변환
- 질문과 문서의 의미 유사도 비교

### 코드

```python
from langchain_openai import OpenAIEmbeddings


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

### 필수 원칙

- 문서·질문: 동일 임베딩 모델
- 모델 변경: 전체 문서 재색인
- 대량 문서: 호출 비용·처리 시간 확인
- 비밀 문서: 외부 API 전송 정책 확인

---

## 4단계. 벡터 저장소 생성

### 목적

- Chunk 임베딩 생성
- 문서 벡터와 metadata 저장
- 의미 기반 검색 준비

### 코드

```python
from langchain_core.vectorstores import InMemoryVectorStore


vector_store = InMemoryVectorStore.from_documents(
    documents=chunks,
    embedding=embeddings,
)
```

### 현재 저장소 특성

| 항목 | `InMemoryVectorStore` |
|---|---|
| 용도 | 개념 학습·소규모 테스트 |
| 저장 위치 | 실행 프로세스 메모리 |
| 프로그램 종료 | 데이터 소멸 |
| 운영 적합성 | 낮음 |

운영 환경 후보:

- 영구 저장 Vector DB
- 문서 ID 기반 추가·수정·삭제
- metadata 필터
- 백업·복구
- 동시 접속·권한 관리

---

## 5단계. 검색기 생성

### 목적

- 질문과 가까운 Chunk 검색
- LLM 전달용 `Document` 목록 생성

### 코드

```python
retriever = vector_store.as_retriever(
    search_kwargs={"k": 2},
)
```

`k=2`: 관련 Chunk 최대 2개

### 검색 단독 검증

```python
test_docs = retriever.invoke("연차는 어디에서 신청하나요?")

for doc in test_docs:
    print(doc.metadata)
    print(doc.page_content)
```

### 판정 기준

- 출력 형식: `list[Document]`
- 필수 내용: 질문의 정답 근거
- 필수 metadata: 실제 출처
- 근거 누락: 1~5단계 우선 점검

> Retriever 결과: 답변이 아닌 관련 문서 목록

---

## 6단계. 프롬프트 생성

### 목적

- 답변 역할 지정
- 검색 문서 사용 범위 제한
- 근거 부족 시 응답 규칙 지정

### 코드

```python
from langchain_core.prompts import ChatPromptTemplate


prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "당신은 사내 규정 안내 도우미입니다. "
            "제공된 문서만 사용해 한국어로 답하세요. "
            "문서에 근거가 없으면 '제공된 문서에서 확인할 수 없습니다.'라고 답하세요.",
        ),
        ("human", "[문서]\n{context}\n\n[질문]\n{question}"),
    ]
)
```

### 입력 변수

| 변수 | 값 |
|---|---|
| `{context}` | Retriever 검색 문서 |
| `{question}` | 사용자 질문 |

### 권장 규칙

- 제공 문서만 근거로 사용
- 근거 없는 추측 금지
- 답변 언어 지정
- 문서와 질문의 명확한 구분
- 외부 문서 내부 지시문 무시

---

## 7단계. LLM과 출력 파서 생성

### 목적

- 답변 생성 모델 설정
- AI 메시지의 문자열 변환
- LCEL 기반 생성 Chain 구성

### 코드

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI


model = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
generation_chain = prompt | model | StrOutputParser()
```

### Chain 흐름

```text
Prompt → ChatOpenAI → AIMessage → StrOutputParser → str
```

### 설정

| 항목 | 값 | 목적 |
|---|---|---|
| `model` | `gpt-4.1-mini` | 실습용 Chat Model |
| `temperature` | `0` | 비교적 일관된 답변 |

모델 오류 점검:

- 계정의 모델 사용 권한
- 조직 정책
- API Key 프로젝트
- 사용 가능 모델명

---

## 8단계. 검색·생성·출처 출력

### 목적

- 질문 기반 문서 검색
- 검색 문서의 Context 변환
- 답변 생성
- 실제 metadata 기반 출처 표시

### 코드

```python
def format_context(found_docs: list[Document]) -> str:
    sections = []
    for index, doc in enumerate(found_docs, start=1):
        source = doc.metadata.get("source", "unknown")
        sections.append(f"[{index}] 출처: {source}\n{doc.page_content}")
    return "\n\n".join(sections)


question = "연차 휴가는 어디에서 신청하나요?"
found_docs = retriever.invoke(question)
context = format_context(found_docs)

answer = generation_chain.invoke(
    {
        "context": context,
        "question": question,
    }
)

print(f"질문: {question}")
print(f"답변: {answer}")
print("출처:")
for doc in found_docs:
    print(
        "-",
        doc.metadata.get("source", "unknown"),
        "start_index=",
        doc.metadata.get("start_index", "unknown"),
    )
```

### 예상 결과

```text
질문: 연차 휴가는 어디에서 신청하나요?
답변: 연차 휴가 신청 위치는 그룹웨어입니다.
출처:
- company_policy.txt start_index= 0
```

출력 차이 가능 항목:

- 답변 표현
- 검색 Chunk 수
- `start_index` 값

### 출처 원칙

```text
권장: 검색된 Document.metadata → 출처
금지: LLM의 기억·추측 → 출처
```

---

## 전체 실행 코드

`rag_8steps.py`:

```python
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


load_dotenv()

# 1. 문서 로드
file_path = Path("data/company_policy.txt")
text = file_path.read_text(encoding="utf-8")
documents = [
    Document(page_content=text, metadata={"source": file_path.name})
]

# 2. 문서 분할
splitter = RecursiveCharacterTextSplitter(
    chunk_size=120,
    chunk_overlap=20,
    add_start_index=True,
)
chunks = splitter.split_documents(documents)

# 3. 임베딩 준비
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 4. 벡터 저장소 생성
vector_store = InMemoryVectorStore.from_documents(
    documents=chunks,
    embedding=embeddings,
)

# 5. 검색기 생성
retriever = vector_store.as_retriever(search_kwargs={"k": 2})

# 6. 프롬프트 생성
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "당신은 사내 규정 안내 도우미입니다. "
            "제공된 문서만 사용해 한국어로 답하세요. "
            "문서에 근거가 없으면 '제공된 문서에서 확인할 수 없습니다.'라고 답하세요.",
        ),
        ("human", "[문서]\n{context}\n\n[질문]\n{question}"),
    ]
)

# 7. LLM과 출력 파서 생성
model = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
generation_chain = prompt | model | StrOutputParser()


def format_context(found_docs: list[Document]) -> str:
    sections = []
    for index, doc in enumerate(found_docs, start=1):
        source = doc.metadata.get("source", "unknown")
        sections.append(f"[{index}] 출처: {source}\n{doc.page_content}")
    return "\n\n".join(sections)


# 8. 검색·생성·출처 출력
question = "연차 휴가는 어디에서 신청하나요?"
found_docs = retriever.invoke(question)
answer = generation_chain.invoke(
    {
        "context": format_context(found_docs),
        "question": question,
    }
)

print(f"질문: {question}")
print(f"답변: {answer}")
print("출처:")
for doc in found_docs:
    print(
        "-",
        doc.metadata.get("source", "unknown"),
        "start_index=",
        doc.metadata.get("start_index", "unknown"),
    )
```

### 실행

uv:

```powershell
uv run python rag_8steps.py
```

pip 가상환경:

```powershell
python rag_8steps.py
```

---

## 질문별 검증

| 유형 | 질문 예시 | 기대 결과 |
|---|---|---|
| 직접 표현 | `비밀번호는 어디에서 변경하나요?` | 보안 포털 |
| 유사 표현 | `USB 사용에 필요한 조건은?` | 보안 담당자 승인 |
| 문서 외 질문 | `출장비 지원 한도는?` | 문서에서 확인 불가 |

필수 테스트:

1. 문서 내 정답 질문
2. 표현 변경 질문
3. 문서 외 질문

오류 신호:

- 문서 외 질문에 임의 금액·규정 생성
- 검색 문서와 무관한 답변
- 실제 검색 결과와 다른 출처

---

## 단계별 문제 해결

| 증상 | 점검 단계 | 핵심 조치 |
|---|---:|---|
| `FileNotFoundError` | 1 | 실행 위치·파일 경로 확인 |
| 한글 깨짐 | 1 | UTF-8 저장·`encoding="utf-8"` 확인 |
| `ModuleNotFoundError` | 0 | 가상환경·패키지 설치 확인 |
| API Key 오류 | 0·3·7 | `.env`·변수명·Key 권한 확인 |
| 정답 Chunk 검색 실패 | 2·5 | Chunk 크기·Overlap·`k` 조정 후 재색인 |
| 검색 성공·답변 오류 | 6·7 | 프롬프트·전달 Context 확인 |
| 잘못된 출처 | 1·8 | metadata 등록·출력 경로 확인 |
| 반복 색인 비용 | 4 | 영구 Vector DB·변경분 색인 적용 |

### 오답 진단 순서

```text
오답
 ├─ 검색 결과에 정답 근거 없음
 │   └─ 1~5단계 점검
 └─ 검색 결과에 정답 근거 있음
     └─ 6~8단계 점검
```

검색 실패 우선순위:

1. 원문 포함 여부
2. 로드 결과
3. Chunk 내용
4. 임베딩 모델 일치
5. 검색 개수 `k`

생성 실패 우선순위:

1. Context 전달 내용
2. 프롬프트 변수명
3. 근거 제한 규칙
4. 모델 출력

---

## 운영 확장 항목

### 데이터

- metadata: `source`, `page`, `updated_at`, 접근 권한
- 고유 문서 ID
- 변경 문서만 재색인
- 삭제 문서의 벡터 제거
- 중복 Chunk 방지

### 검색

- metadata 필터
- Keyword + Vector Hybrid Search
- Reranker
- 질문 재작성
- 검색 결과별 유사도 점수

### 보안

- 사용자별 문서 접근 제어
- 개인정보·비밀정보 마스킹
- 검색 Context의 Prompt Injection 방어
- 로그 내 API Key·개인정보 제거

### 운영

- 영구 Vector DB
- 색인 작업과 질의 API 분리
- 질문·검색 결과·지연 시간 기록
- 오류·비용 모니터링
- 백업·복구 정책

### 평가

- 검색 정확도
- Context Precision·Recall
- 답변 충실성
- 답변 관련성
- 출처 정확성
- 응답 시간·비용

---

## 완료 체크리스트

- [ ] `.env` Git 제외
- [ ] `Document` 변환과 출처 metadata 등록
- [ ] Chunk 내용·크기 확인
- [ ] 문서·질문의 동일 임베딩 모델
- [ ] Retriever 단독 테스트 성공
- [ ] 문서 외 질문의 답변 거부
- [ ] 실제 metadata 기반 출처
- [ ] 색인 과정과 질의 과정 분리
- [ ] 검색 오류와 생성 오류 분리 진단

## 핵심 정리

1. RAG: 검색 문서 기반 LLM 입력 보강
2. 1~4단계: 문서 색인
3. 5~8단계: 질문 처리
4. Retriever 출력: `Document` 목록
5. 답변 품질의 출발점: 검색 품질
6. 출처 기준: 실제 `Document.metadata`
7. 기본 완성 후 확장: 영구 저장소·Hybrid Search·Reranker·평가

## 공식 참고 문서

- [LangChain Semantic Search](https://docs.langchain.com/oss/python/langchain/knowledge-base) — 문서 분할·색인·검색·최소 RAG
- [LangChain Text Splitters](https://docs.langchain.com/oss/python/integrations/splitters) — 문서 유형별 분할
- [LangChain OpenAIEmbeddings](https://docs.langchain.com/oss/python/integrations/embeddings/openai) — 임베딩·Vector Store 연동
- [LangChain ChatOpenAI](https://docs.langchain.com/oss/python/integrations/chat/openai) — 모델 설치·인증
