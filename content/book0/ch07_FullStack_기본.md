# FullStack - Streamlit과 FastAPI 기본구조 경험하기

## 수업 목표



## 최종 구조

```text

```

## 의존 설치

```cmd
# back
pip install fastapi uvicorn pydantic

# front
pip install streamlit requests
```


## backend.py

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Agent Backend")

# 클라이언트로부터 받을 데이터 구조 정의
class QueryRequest(BaseModel):
    user_message: str

# AI 처리 및 응답 API 엔드포인트
@app.post("/api/chat")
async def handle_chat(request: QueryRequest):
    # 실제 환경에서는 이곳에 LangChain / LangGraph 로직이 들어갑니다.
    user_input = request.user_message
    ai_response = f"[AI 에이전트 답변] '{user_input}'에 대한 분석 결과입니다."
    
    # JSON 형태로 응답 반환
    return {
        "status": "success",
        "reply": ai_response
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

```



## frontend.py

```python
import streamlit as st
import requests

# 백엔드 API 주소 설정
BACKEND_URL = "http://localhost:8000/api/chat"

st.set_page_config(page_title="AI Agent UI", layout="centered")
st.title("🤖 AI 에이전트 서비스")
st.caption("FastAPI 백엔드와 통신하는 Streamlit UI 예시입니다.")

# Streamlit 세션 상태 초기화 (대화 기록 저장용)
if "messages" not in st.session_state:
    st.session_state.messages = []

# 기존 대화 기록 출력
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# 사용자 입력 받기
if user_input := st.chat_input("AI 에이전트에게 질문을 입력하세요..."):
    
    # 1. UI에 사용자 메시지 즉시 표시 및 저장
    with st.chat_message("user"):
        st.markdown(user_input)
    st.session_state.messages.append({"role": "user", "content": user_input})
    
    # 2. FastAPI 백엔드로 API 요청 전송
    with st.chat_message("assistant"):
        with st.spinner("에이전트가 생각 중입니다..."):
            try:
                # HTTP POST 요청 발송 (JSON 데이터 포함)
                response = requests.post(
                    BACKEND_URL, 
                    json={"user_message": user_input},
                    timeout=30
                )
                
                if response.status_code == 200:
                    # 응답 데이터 파싱
                    result = response.json()
                    ai_reply = result.get("reply", "응답을 파싱하지 못했습니다.")
                    
                    # UI에 AI 답변 표시 및 저장
                    st.markdown(ai_reply)
                    st.session_state.messages.append({"role": "assistant", "content": ai_reply})
                else:
                    st.error(f"백엔드 에러 발생: 상태 코드 {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                st.error("FastAPI 백ends 서버가 켜져 있는지 확인해주세요. (Connection Refused)")

```

## 3. 실행 Back

```cmd
python backend.py
```

## 4. 실행 Front


```cmd
streamlit run frontend.py
```

## 실행결과
<img class="chapter-result-image" src="content/book0/image-1.png" alt="Streamlit과 FastAPI 실행 결과">
