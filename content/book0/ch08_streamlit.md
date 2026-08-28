# Streamlit 사용자 가이드

## 학습 목표

- Python 코드로 웹 화면을 만든다.
- 입력 위젯과 레이아웃을 사용한다.
- 재실행과 세션 상태를 구분한다.
- 데이터·리소스 캐시를 사용한다.
- 파일 업로드와 채팅 화면을 구현한다.

## 1. 동작 구조

Streamlit은 Python 스크립트를 웹 애플리케이션으로 실행합니다.

```text
사용자 입력 → Streamlit 서버 → Python 코드를 위에서 아래로 재실행 → 화면 갱신
```

버튼을 누르거나 입력값을 바꾸면 코드가 다시 실행됩니다.

| 저장 위치 | 용도 |
|---|---|
| 일반 변수 | 한 번의 실행에서만 사용 |
| `st.session_state` | 사용자 세션 동안 유지 |
| `st.cache_data` | 데이터 처리 결과 재사용 |
| `st.cache_resource` | 모델·DB 연결 재사용 |

## 2. 설치와 실행

프로젝트를 만들고 Streamlit을 설치합니다.

```powershell
# 프로젝트 생성
uv init --app streamlit-app
cd streamlit-app

# Streamlit 설치
uv add streamlit pandas

# 설치 확인
uv run streamlit version
```

`app.py`를 실행합니다.

```powershell
# 개발 서버 실행
uv run streamlit run app.py
```

기본 주소는 `http://localhost:8501`입니다. 종료할 때는 터미널에서 `Ctrl+C`를 누릅니다.

## 3. 첫 화면 만들기

`app.py`:

```python
import streamlit as st


# 브라우저 설정
st.set_page_config(
    page_title="Streamlit 시작",
    page_icon="🚀",
    layout="wide",
)

st.title("Streamlit 시작하기")
st.header("Python으로 만드는 웹 화면")
st.subheader("첫 번째 앱")
st.write("문자열, 숫자, 표를 화면에 출력할 수 있습니다.")
st.markdown("**Markdown**도 사용할 수 있습니다.")
st.code("print('Hello, Streamlit!')", language="python")

st.success("정상 처리")
st.info("안내 메시지")
st.warning("주의 메시지")
st.error("오류 메시지")
```

`st.set_page_config()`는 다른 Streamlit 명령보다 먼저 호출합니다.

## 4. 입력 위젯

```python
import streamlit as st


name = st.text_input("이름")
age = st.number_input("나이", min_value=0, max_value=120, value=20)
level = st.selectbox("과정", ["초급", "중급", "고급"])
skills = st.multiselect("관심 기술", ["Python", "FastAPI", "Streamlit"])
agreed = st.checkbox("개인정보 처리에 동의합니다.")

if st.button("확인", type="primary"):
    if not name:
        st.warning("이름을 입력하세요.")
    elif not agreed:
        st.warning("동의가 필요합니다.")
    else:
        st.success(f"{name}님, {level} 과정을 선택했습니다.")
        st.write("나이:", age)
        st.write("관심 기술:", skills)
```

위젯의 반환값은 일반 Python 변수처럼 사용합니다.

## 5. Form으로 한 번에 제출하기

일반 위젯은 값이 바뀔 때마다 코드를 재실행합니다. 여러 입력을 한 번에 처리하려면 `st.form`을 사용합니다.

```python
import streamlit as st


with st.form("profile_form"):
    name = st.text_input("이름")
    email = st.text_input("이메일")
    submitted = st.form_submit_button("저장")

if submitted:
    st.success(f"{name} / {email} 저장 완료")
```

## 6. 화면 배치

### 사이드바

```python
import streamlit as st


with st.sidebar:
    st.header("설정")
    model = st.selectbox("모델", ["small", "medium", "large"])
    temperature = st.slider("Temperature", 0.0, 2.0, 0.7, 0.1)

st.write("모델:", model)
st.write("Temperature:", temperature)
```

### 열과 탭

```python
import streamlit as st


left, right = st.columns(2)

with left:
    st.metric("요청 수", 128, 12)

with right:
    st.metric("평균 응답", "1.2초", "-0.3초")

tab1, tab2 = st.tabs(["결과", "설정"])

with tab1:
    st.write("분석 결과")

with tab2:
    st.write("서비스 설정")
```

## 7. 데이터 출력

```python
import pandas as pd
import streamlit as st


data = pd.DataFrame(
    {
        "제품": ["A", "B", "C"],
        "생산량": [120, 95, 140],
        "불량률": [1.2, 2.1, 0.8],
    }
)

st.dataframe(data, use_container_width=True)
st.bar_chart(data.set_index("제품")["생산량"])
st.line_chart(data.set_index("제품")["불량률"])
```

- `st.dataframe`: 정렬 가능한 표
- `st.table`: 고정된 표
- `st.metric`: 핵심 수치
- `st.bar_chart`, `st.line_chart`: 간단한 차트

## 8. 세션 상태

일반 변수는 재실행할 때 초기화됩니다. 유지할 값은 `st.session_state`에 저장합니다.

```python
import streamlit as st


# 최초 한 번만 초기화
if "count" not in st.session_state:
    st.session_state.count = 0

if st.button("증가"):
    st.session_state.count += 1

if st.button("초기화"):
    st.session_state.count = 0

st.metric("현재 값", st.session_state.count)
```

사용자마다 별도의 세션 상태가 만들어집니다.

## 9. 캐시

### 데이터 캐시

데이터 조회나 변환 결과에는 `st.cache_data`를 사용합니다.

```python
import time

import pandas as pd
import streamlit as st


@st.cache_data(ttl=300)
def load_data() -> pd.DataFrame:
    # 느린 조회 예시
    time.sleep(2)
    return pd.DataFrame({"value": [10, 20, 30]})


st.dataframe(load_data())
```

### 리소스 캐시

모델이나 DB 연결에는 `st.cache_resource`를 사용합니다.

```python
import streamlit as st


@st.cache_resource
def load_model():
    # 모델 생성
    return {"name": "demo-model"}


model = load_model()
st.write(model)
```

| 데코레이터 | 사용 대상 |
|---|---|
| `st.cache_data` | DataFrame, API 응답, 계산 결과 |
| `st.cache_resource` | AI 모델, DB 연결, 클라이언트 객체 |

## 10. 파일 업로드와 다운로드

```python
import pandas as pd
import streamlit as st


uploaded_file = st.file_uploader("CSV 파일", type=["csv"])

if uploaded_file is not None:
    data = pd.read_csv(uploaded_file)
    st.dataframe(data, use_container_width=True)

    csv_data = data.to_csv(index=False).encode("utf-8-sig")
    st.download_button(
        "CSV 다운로드",
        data=csv_data,
        file_name="result.csv",
        mime="text/csv",
    )
```

업로드 파일은 크기와 확장자를 확인한 뒤 처리합니다.

## 11. 채팅 화면

```python
import streamlit as st


# 대화 기록 초기화
if "messages" not in st.session_state:
    st.session_state.messages = []

# 이전 대화 출력
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 새 질문 처리
if prompt := st.chat_input("질문을 입력하세요"):
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    answer = f"입력한 질문: {prompt}"
    st.session_state.messages.append({"role": "assistant", "content": answer})

    with st.chat_message("assistant"):
        st.markdown(answer)
```

실제 서비스에서는 `answer`를 만드는 부분에 AI 모델이나 FastAPI 호출을 연결합니다.

## 12. 진행 상태와 오류 처리

```python
import time

import streamlit as st


if st.button("작업 실행"):
    try:
        with st.spinner("처리 중..."):
            time.sleep(2)
        st.success("완료")
    except Exception as error:
        st.error(f"처리 실패: {error}")
```

운영환경에서는 사용자 메시지와 서버 로그를 구분합니다.

## 13. 환경변수와 Secrets

로컬 개발에서는 `.streamlit/secrets.toml`을 사용할 수 있습니다.

```text
streamlit-app/
├─ .streamlit/
│  └─ secrets.toml
├─ .gitignore
├─ app.py
├─ pyproject.toml
└─ uv.lock
```

`.streamlit/secrets.toml`:

```toml
OPENAI_API_KEY = "your-api-key"
API_BASE_URL = "http://localhost:8000"
```

`app.py`:

```python
import streamlit as st


api_key = st.secrets["OPENAI_API_KEY"]
api_url = st.secrets.get("API_BASE_URL", "http://localhost:8000")
```

`.gitignore`:

```gitignore
.venv/
.env
.streamlit/secrets.toml
```

비밀키를 코드나 Git 저장소에 넣지 않습니다.

## 14. 여러 페이지 구성

`pages` 폴더에 Python 파일을 추가하면 기본 멀티페이지 앱을 만들 수 있습니다.

```text
streamlit-app/
├─ app.py
└─ pages/
   ├─ 1_대시보드.py
   └─ 2_설정.py
```

`pages/1_대시보드.py`:

```python
import streamlit as st


st.title("대시보드")
st.write("생산 현황을 표시합니다.")
```

## 15. 자주 사용하는 실행 옵션

```powershell
# 포트 변경
uv run streamlit run app.py --server.port 8502

# 외부 접속 허용
uv run streamlit run app.py --server.address 0.0.0.0

# 실행 상태 확인
uv run streamlit version
```

외부 접속을 허용할 때는 방화벽과 네트워크 보안 정책을 확인합니다.

## 16. 개발 점검표

- [ ] `uv run streamlit run app.py`로 실행된다.
- [ ] 입력값을 검증한 뒤 처리한다.
- [ ] 유지할 값은 `st.session_state`에 저장한다.
- [ ] 데이터와 리소스 캐시를 구분한다.
- [ ] 비밀키는 Secrets나 환경변수로 관리한다.
- [ ] UI와 서비스 로직을 분리한다.

## 공식 문서

- [Streamlit 시작하기](https://docs.streamlit.io/get-started)
- [기본 개념과 재실행](https://docs.streamlit.io/get-started/fundamentals/main-concepts)
- [API 레퍼런스](https://docs.streamlit.io/develop/api-reference)
- [레이아웃과 컨테이너](https://docs.streamlit.io/develop/api-reference/layout)
- [Session State](https://docs.streamlit.io/develop/api-reference/caching-and-state/st.session_state)
- [Caching](https://docs.streamlit.io/develop/concepts/architecture/caching)
- [Chat Elements](https://docs.streamlit.io/develop/api-reference/chat)
- [Secrets 관리](https://docs.streamlit.io/develop/concepts/connections/secrets-management)
- [Streamlit Community Cloud 배포](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app)
