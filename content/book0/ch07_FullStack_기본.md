# Streamlit과 FastAPI 기본 구조

## 학습 목표

- 프런트엔드·백엔드 역할 구분
- HTTP 요청·응답 흐름 이해
- 두 서버의 독립 실행
- 채팅 기록 유지

## 한눈에 보는 아키텍처

```text
사용자
  ↓ 질문
Streamlit :8501
  ↓ POST /api/chat
FastAPI :8000
  ↓ 데이터 검증·서비스 처리
JSON 응답
  ↓
Streamlit 화면 출력
```

<p style="color:#d32f2f; font-weight:700;">
Streamlit은 화면, FastAPI는 데이터와 서비스 규칙.
</p>

## 1. 개발환경

```powershell
# 프로젝트 생성
uv init --app fullstack-app
cd fullstack-app

# 패키지 설치
uv add fastapi uvicorn pydantic streamlit httpx
```

```text
fullstack-app/
├─ backend.py
├─ frontend.py
├─ pyproject.toml
└─ uv.lock
```

## 2. FastAPI 백엔드

`backend.py`:

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field


app = FastAPI(title="AI Agent Backend")


class QueryRequest(BaseModel):
    user_message: str = Field(min_length=1, max_length=1000)


class QueryResponse(BaseModel):
    status: str
    reply: str


@app.post("/api/chat", response_model=QueryResponse)
async def handle_chat(request: QueryRequest) -> QueryResponse:
    # 서비스 처리
    reply = f"[AI 에이전트] {request.user_message}"
    return QueryResponse(status="success", reply=reply)
```

핵심:

- `QueryRequest`: 입력 검증
- `QueryResponse`: 응답 형식
- `/api/chat`: 요청 주소
- `async def`: 비동기 처리

## 3. Streamlit 프런트엔드

`frontend.py`:

```python
import httpx
import streamlit as st


BACKEND_URL = "http://localhost:8000/api/chat"

st.set_page_config(page_title="AI Agent", page_icon="🤖")
st.title("AI 에이전트")

# 대화 초기화
if "messages" not in st.session_state:
    st.session_state.messages = []

# 대화 출력
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 질문 처리
if prompt := st.chat_input("질문을 입력하세요"):
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    try:
        with st.spinner("처리 중..."):
            response = httpx.post(
                BACKEND_URL,
                json={"user_message": prompt},
                timeout=30,
            )
            response.raise_for_status()
            answer = response.json()["reply"]
    except httpx.HTTPError as error:
        answer = f"백엔드 연결 실패: {error}"

    st.session_state.messages.append(
        {"role": "assistant", "content": answer}
    )

    with st.chat_message("assistant"):
        st.markdown(answer)
```

핵심:

- `st.chat_input`: 질문 입력
- `st.session_state`: 대화 유지
- `httpx.post`: 백엔드 호출
- `raise_for_status`: 오류 응답 확인

## 4. 실행

터미널 1:

```powershell
# 백엔드
uv run uvicorn backend:app --reload --port 8000
```

터미널 2:

```powershell
# 프런트엔드
uv run streamlit run frontend.py --server.port 8501
```

확인 주소:

- FastAPI 문서: `http://localhost:8000/docs`
- Streamlit 화면: `http://localhost:8501`

## 기억 공식

```text
입력 → UI → API → 검증 → 처리 → JSON → 화면
```

<p style="color:#d32f2f; font-weight:700;">
화면과 서비스 로직의 분리: 변경·테스트·배포의 시작.
</p>

## 완료 기준

- [ ] 두 서버 독립 실행
- [ ] Streamlit 질문 입력
- [ ] FastAPI 요청 검증
- [ ] JSON 응답 출력
- [ ] 연결 오류 표시

## 공식 문서

- [Streamlit 시작하기](https://docs.streamlit.io/get-started)
- [Streamlit Chat Elements](https://docs.streamlit.io/develop/api-reference/chat)
- [FastAPI 첫 단계](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [FastAPI Request Body](https://fastapi.tiangolo.com/tutorial/body/)
- [HTTPX QuickStart](https://www.python-httpx.org/quickstart/)

## 실행 결과

<img class="chapter-result-image" src="content/book0/image-1.png" alt="Streamlit과 FastAPI 실행 결과">
