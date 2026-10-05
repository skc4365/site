# ChromaDB 학습 가이드

> **문서의 벡터화 → 의미 기반 검색 → 조건 필터링 → Agent / RAG 연동**

## 학습 순서

### 1. Getting Started — 첫 저장, 첫 검색

참고: [Chroma 공식 시작 가이드](https://docs.trychroma.com/docs/overview/getting-started)

**핵심 개념**

- **임베딩**: 텍스트 의미의 수치 벡터 표현
- **벡터 검색**: 질문과 가까운 의미의 문서 탐색
- **Collection**: 문서·임베딩·메타데이터의 저장 및 검색 단위

**실습 가이드**

- `chromadb` 설치 → `chromadb.Client()` 생성 → Collection 생성
- 고유 문자열 `ids`와 `documents` 등록 → 기본 임베딩 함수의 자동 벡터화
- `query_texts`와 `n_results` 지정 → 검색 문서·ID·거리 확인

**완료 기준**: 문서 등록부터 첫 의미 검색까지의 전체 흐름 재현

### 2. Python 튜토리얼 — 전체 흐름 재현

참고: [ChromaDB Python 튜토리얼](https://dev.to/kalyna_pro/chromadb-tutorial-build-your-first-vector-database-with-python-2026-16bg)

**핵심 개념**

- **데이터 흐름**: 원문 → 임베딩 → 저장 → 질문 임베딩 → 검색 결과
- **메모리 저장과 영구 저장**: 실행 중 임시 데이터 / 로컬 디스크 보존 데이터

**실습 가이드**

- 튜토리얼 예제 실행 → 입력 문서·질문·검색 결과 대조
- 자체 예제 문서 구성 → 질문 표현 변경 → 검색 순위 비교
- `PersistentClient(path="./chroma_db")` 적용 → 프로그램 재시작 → 데이터 보존 확인

**완료 기준**: 자체 데이터 검색과 재시작 후 데이터 복원

### 3. Manage Collections — 저장 구조 확립

참고: [Chroma 공식 Collection 관리 가이드](https://docs.trychroma.com/docs/collections/manage-collections)

**핵심 개념**

- **레코드 구성**: `ids` · `documents` · `embeddings` · `metadatas`
- **ID**: Collection 내 레코드 식별 기준
- **임베딩 일관성**: 저장·검색 단계의 동일 모델 및 벡터 차원

**실습 가이드**

- `create_collection` · `get_collection` · `get_or_create_collection` 용도 비교
- Collection 목록 조회 → 이름별 접근 → 레코드 수 확인
- 문서별 출처·주제 메타데이터 설계 → 실습용 Collection 삭제

**완료 기준**: Collection 생성·재사용·조회·삭제 흐름과 레코드 구조 정리

### 4. add · query · upsert · delete — 데이터 조작 핵심

참고: [등록·검색](https://docs.trychroma.com/docs/overview/getting-started) · [갱신](https://docs.trychroma.com/docs/collections/update-data) · [삭제](https://docs.trychroma.com/docs/collections/delete-data)

| 동작 | 핵심 역할 | 실습 포인트 |
| --- | --- | --- |
| `add` | 신규 레코드 등록 | 고유 ID·문서·메타데이터의 대응 |
| `query` | 의미 유사도 기반 검색 | 질문별 상위 결과·거리 비교 |
| `upsert` | 기존 ID 갱신 / 신규 ID 등록 | 동일 ID 수정 전후 비교 |
| `delete` | ID 또는 조건 기반 삭제 | 삭제 대상과 잔여 데이터 확인 |

**실습 가이드**

- 문서 등록 → 의미 검색 → 동일 ID 내용 갱신 → 검색 결과 비교 → 대상 삭제
- `get(ids=[...])` 기반 원본 조회와 `query(...)` 기반 의미 검색의 차이 비교
- `distances`: 거리값 기준 결과 해석, 동일 거리 척도에서 작은 값의 높은 유사도

**완료 기준**: 동작별 레코드 수·내용·검색 결과의 변화 확인

### 5. Advanced Filtering / Metadata Query — 검색 범위 정밀 제어

참고: [메타데이터 필터링](https://docs.trychroma.com/docs/querying-collections/metadata-filtering) · [문서 내용 필터링](https://docs.trychroma.com/docs/querying-collections/full-text-search)

**핵심 개념**

- **`where`**: 출처·주제·페이지 등 메타데이터 조건
- **`where_document`**: 문서 본문의 문자열 조건
- **조건 필터 + 벡터 검색**: 조건에 맞는 문서 범위 내 의미 검색

**실습 가이드**

- 주제 조건: `where={"topic": "AI"}`
- 숫자 범위: `where={"page": {"$gte": 10}}`
- 복합 조건: `$and` · `$or` / 포함 조건: `$in` · `$nin`
- 본문 포함: `where_document={"$contains": "RAG"}`
- 동일 질문의 필터 적용 전후 비교 → 조건 일치 여부와 검색 결과 수 확인

**완료 기준**: 메타데이터 조건과 본문 조건의 구분, 복합 필터 검색 재현

### 6. Agent / RAG 연동 — 검색 결과의 답변 근거화

**핵심 개념**

- **RAG**: 외부 문서 검색 결과를 활용한 답변 생성
- **Retriever**: 질문에 관련된 문서 조각의 검색 인터페이스
- **Agent 검색 도구**: 필요 시 호출 가능한 Chroma 검색 기능

**실습 가이드**

- 문서 분할 → 임베딩 → Chroma 저장 → 질문 검색 → 근거 문맥 구성 → LLM 답변
- 문서 조각별 출처·페이지 메타데이터 보존 → 답변 근거 연결
- Chroma 검색 함수의 Agent 도구 등록 → 검색 호출·반환 문서·최종 답변 확인
- 관련 질문·무관한 질문 비교 → 검색 품질과 근거 부족 시 답변 처리 확인

**완료 기준**: 검색 문서·출처·최종 답변의 연결, Agent 검색 도구 호출 확인

## 최종 체크포인트

- **기본기**: Collection 관리와 데이터 조작 흐름
- **정확도**: 일관된 임베딩과 목적에 맞는 조건 필터
- **지속성**: 영구 저장과 재시작 후 데이터 보존
- **활용성**: 출처 기반 RAG 답변과 Agent 검색 연동
