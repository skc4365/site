# FastAPI 심화 기능 및 Streamlit UI 연동

## 수업 목표

- FastAPI 의존성 주입과 Middleware의 역할을 설명한다.
- 비동기 HTTP Client로 API를 호출한다.
- Streamlit 상태와 캐시를 구분한다.
- FastAPI와 Streamlit을 두 프로세스로 실행한다.

## 최종 구조

```text
브라우저
   ↓
Streamlit :8501
   ↓ HTTP
FastAPI :8000
   ↓
Pydantic 검증 → Service → 결과
```

> Streamlit은 사용자 화면, FastAPI는 데이터 검증과 서비스 규칙을 담당합니다. 같은 함수를 두 곳에 중복 작성하지 않습니다.

## 1. 의존성 주입

```python
from typing import Annotated

from fastapi import Depends, Header, HTTPException


async def verify_api_key(x_api_key: Annotated[str | None, Header()] = None) -> str:
    if x_api_key != "lesson-key":
        raise HTTPException(status_code=401, detail="API 키가 올바르지 않습니다.")
    return x_api_key


@app.get("/private")
async def private_data(api_key: Annotated[str, Depends(verify_api_key)]):
    return {"status": "authorized"}
```

실제 운영 키는 코드에 넣지 않고 환경변수나 Secret Manager에서 읽습니다.

## 2. Middleware와 요청시간

```python
from time import perf_counter

from fastapi import Request


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    started = perf_counter()
    response = await call_next(request)
    elapsed = perf_counter() - started
    response.headers["X-Process-Time"] = f"{elapsed:.4f}"
    return response
```

Middleware는 모든 요청에 공통으로 적용할 로깅·추적·보안 Header 등에 사용합니다.

## 3. BackgroundTasks

```python
from fastapi import BackgroundTasks


def write_audit_log(message: str) -> None:
    with open("audit.log", "a", encoding="utf-8") as file:
        file.write(message + "\n")


@app.post("/events", status_code=202)
async def create_event(message: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_audit_log, message)
    return {"status": "accepted"}
```

오래 걸리거나 반드시 성공해야 하는 작업은 BackgroundTasks가 아니라 별도 Queue와 Worker를 사용합니다.

## 4. Streamlit에서 API 호출

`ui.py`:

```python
import httpx
import streamlit as st

API_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="Summary UI")
st.title("요약 서비스")

text = st.text_area("요약할 문장")
max_length = st.slider("최대 길이", min_value=10, max_value=200, value=100)

if st.button("요약하기", type="primary"):
    if not text.strip():
        st.warning("문장을 입력하세요.")
    else:
        try:
            response = httpx.post(
                f"{API_URL}/summaries",
                json={"text": text, "max_length": max_length},
                timeout=10.0,
            )
            response.raise_for_status()
            result = response.json()
            st.success(result["summary"])
        except httpx.HTTPStatusError as error:
            st.error(f"API 오류: {error.response.status_code}")
        except httpx.RequestError:
            st.error("FastAPI 서버에 연결할 수 없습니다.")
```

## 5. 두 서버 실행

터미널 1:

```powershell
python -m uvicorn main:app --reload --port 8000
```

터미널 2:

```powershell
python -m streamlit run ui.py --server.port 8501
```

브라우저:

```text
http://127.0.0.1:8501
```

## 6. Streamlit 상태와 캐시

```python
if "request_count" not in st.session_state:
    st.session_state.request_count = 0

st.session_state.request_count += 1
st.caption(f"요청 횟수: {st.session_state.request_count}")
```

- `session_state`: 사용자 세션별 UI 상태
- `cache_data`: 계산 결과나 데이터
- `cache_resource`: 모델·DB 연결처럼 재사용할 자원

공유 자원을 캐시할 때는 여러 사용자 요청에서 동시에 사용해도 안전한지 확인합니다.

## 통합 실습

1. Chapter 5의 FastAPI CRUD 서버를 실행합니다.
2. Streamlit에서 생성·목록 조회 화면을 만듭니다.
3. API 서버를 중지하고 연결 오류 화면을 확인합니다.
4. 입력 검증 422, 미존재 404, 정상 200·201을 각각 표시합니다.
5. 요청시간 Header를 Streamlit 화면에 출력합니다.

## 강사 체크포인트

- 두 터미널이 서로 다른 프로세스임을 먼저 그림으로 설명합니다.
- UI에서 DB나 서비스 객체를 직접 조작하지 않게 합니다.
- HTTP 시간 제한과 오류 처리가 빠지지 않았는지 확인합니다.
- CORS는 브라우저 JavaScript의 교차 출처 요청에서 필요하며, Streamlit 서버의 `httpx` 호출과 구분합니다.

## 완료 기준

- [ ] FastAPI와 Streamlit을 별도 프로세스로 실행할 수 있다.
- [ ] Streamlit에서 API의 정상·오류 응답을 처리할 수 있다.
- [ ] 의존성 주입·Middleware·BackgroundTasks의 사용 목적을 설명할 수 있다.
- [ ] UI·API·서비스 로직의 책임을 구분할 수 있다.
