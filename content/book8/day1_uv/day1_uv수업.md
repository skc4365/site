# Day 1 uv 수업

uv를 사용해 Streamlit 프로젝트 환경을 만들고 실행하는 예제입니다. 파일 이름을 누르면 내용을 펼치거나 접을 수 있습니다.

## 교안

<details>
<summary><code>Streamlit_uv.pdf</code> — Streamlit uv 교안 보기</summary>

<p><a href="content/book8/day1_uv/교안/Streamlit_uv.pdf" target="_blank" rel="noopener noreferrer">PDF를 새 창에서 열기</a></p>
<div class="pdf-viewer" data-pdf-src="content/book8/day1_uv/교안/Streamlit_uv.pdf" data-pdf-title="Streamlit uv 교안"></div>

</details>

## 파이썬 예제

<details>
<summary><code>test.py</code> — uv로 Streamlit 실행하기</summary>

```python
import streamlit as st

st.write("# 제목")
st.write("반가워용~~~")

st.write("### :blue[파란색] 작은 제목")

# 기본 pip
# pip install streamlit

# 기본 서버실행
# # Running
# python -m streamlit run your_script.py

# # is equivalent to:
# streamlit run your_script.py
# 기본 초기페이지
# streamlit hello

# ---------------
# 다른녀석 uv
# uv init
# uv venv
# .venv\Scripts\activate.bat      
# 가상환경이 뜨면 설치
# uv add streamlit
# 패키지설치 확인
# uv tree
# 파일작성(test.py)
# 서버실행
# uv run streamlit run test.py


# streamlit hello
```

</details>
