# Day 1 수업

Day 1 폴더에서 사용하는 예제 코드와 데이터 파일입니다. 파일 이름을 누르면 내용을 펼치거나 접을 수 있습니다.

## 교안

<details>
<summary><code>day1_pip_venv.pdf</code> — PDF 교안 보기</summary>

<p><a href="content/book8/day1/교안/day1_pip_venv.pdf" target="_blank" rel="noopener noreferrer">PDF를 새 창에서 열기</a></p>
<div class="pdf-viewer" data-pdf-src="content/book8/day1/교안/day1_pip_venv.pdf" data-pdf-title="Day 1 pip 및 가상환경 교안"></div>

</details>

<details>
<summary><code>Streamlit_pip.pdf</code> — Streamlit pip 교안 보기</summary>

<p><a href="content/book8/day1/교안/Streamlit_pip.pdf" target="_blank" rel="noopener noreferrer">PDF를 새 창에서 열기</a></p>
<div class="pdf-viewer" data-pdf-src="content/book8/day1/교안/Streamlit_pip.pdf" data-pdf-title="Streamlit pip 교안"></div>

</details>

## 파이썬 예제

<details>
<summary><code>ex1_text.py</code> — 문자열 출력</summary>

```python
print("파이썬 학습 목차")
print("=================")
print("파이썬 기본 문법", 8)
print("클래스 · 데코레이터 · 예외 처리 · 로깅", 8)
print("async/await 및 asyncio 비동기 프로그래밍", 8)
print("Pydantic BaseModel 데이터 검증", 8)
print("FastAPI RESTful API 설계", 8)
print("FastAPI 심화 기능 및 Streamlit UI 연동", 8)
```

</details>

<details>
<summary><code>ex1_variables.py</code> — 변수</summary>

```python
title = "파이썬 학습 목차"
line = "================="
c1, time = "파이썬 기본 문법", 9
c2 = "클래스 · 데코레이터 · 예외 처리 · 로깅"
c3 = "async/await 및 asyncio 비동기 프로그래밍"
c4 = "Pydantic BaseModel 데이터 검증"
c5 = "FastAPI RESTful API 설계"
c6 = "FastAPI 심화 기능 및 Streamlit UI 연동"

print(title, line, sep = "\n", end = "\n")
print(c1, time, sep = ", 시간: ", end = "\n")
print(c2, time, sep = ", 시간: ", end = "\n")
print(c3, time, sep = ", 시간: ", end = "\n")
print(c4, time, sep = ", 시간: ", end = "\n")
print(c5, time, sep = ", 시간: ", end = "\n")
print(c6, time, sep = ", 시간: ", end = "\n")
```

</details>

<details>
<summary><code>ex1_list.py</code> — 리스트</summary>

```python
title = "파이썬 학습 목차"
line = "================="
time = 10
mylist = ["파이썬 기본 문법",
          "클래스 · 데코레이터 · 예외 처리 · 로깅",
          "async/await 및 asyncio 비동기 프로그래밍",
          "Pydantic BaseModel 데이터 검증",
          "FastAPI RESTful API 설계",
          "FastAPI 심화 기능 및 Streamlit UI 연동" 
          ]

print(title, line, sep = "\n", end = "\n")
print(mylist[0], time, sep = ", 시간: ", end = "\n")
print(mylist[1], time, sep = ", 시간: ", end = "\n")
print(mylist[2], time, sep = ", 시간: ", end = "\n")
print(mylist[3], time, sep = ", 시간: ", end = "\n")
print(mylist[4], time, sep = ", 시간: ", end = "\n")
print(mylist[5], time, sep = ", 시간: ", end = "\n")
```

</details>

<details>
<summary><code>ex1_dict.py</code> — 딕셔너리</summary>

```python
title = "파이썬 학습 목차"
line = "================="
mydict = {
    "c1":"파이썬 기본 문법",
    "c2":"클래스 · 데코레이터 · 예외 처리 · 로깅",
    "c3":"async/await 및 asyncio 비동기 프로그래밍",
    "c4":"Pydantic BaseModel 데이터 검증",
    "c5":"FastAPI RESTful API 설계",
    "c6":"FastAPI 심화 기능 및 Streamlit UI 연동",
    "time":11
}

print(title, line, sep = "\n", end = "\n")
print(mydict["c1"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c2"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c3"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c4"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c5"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c6"], mydict["time"], sep = ", 시간: ", end = "\n")
```

</details>

<details>
<summary><code>ex1_json.py</code> — JSON 읽기</summary>

```python
import json

with open("courses.json", "r", encoding="utf-8") as file:
    data = json.load(file)

print(data["title"])
print("====================")

for course in data["courses"]:
    name = course["name"]
    hours = course["hours"]
    required = course["required"]
    tools = course["tools"]

    print("과목:", name)
    print("시간:", hours if hours is not None else "미정")
    print("필수:", required)
    print("도구:", ", ".join(tools))
    print()

# Serialization직렬화 와 Deserialization역직렬화.
```

</details>

<details>
<summary><code>ex1_csv.py</code> — CSV 읽기</summary>

```python
import csv
from pathlib import Path


# CSV는 에이전트의 질문·답변 평가 데이터셋으로 활용할 수 있습니다.
csv_path = Path(__file__).parent / "data" / "agent_eval.csv"

with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
    questions = list(csv.DictReader(file))

print(f"전체 평가 문항: {len(questions)}개\n")

for item in questions:
    print(f"문항 {item['id']} ({item['difficulty']})")
    print(f"질문: {item['question']}")
    print(f"기대 키워드: {item['expected_keyword']}")
    print()

# 조건에 맞는 데이터만 선택하는 예제입니다.
beginner_questions = [
    item for item in questions if item["difficulty"] == "초급"
]

print(f"초급 문항 수: {len(beginner_questions)}개")
```

</details>

<details>
<summary><code>ex1_markdown_prompt.py</code> — Markdown 프롬프트 읽기</summary>

```python
from pathlib import Path


# 이 파이썬 파일을 기준으로 외부 Markdown 파일의 위치를 찾습니다.
prompt_path = Path(__file__).parent / "prompts" / "system.md"
system_prompt = prompt_path.read_text(encoding="utf-8")

user_input = input("질문을 입력하세요: ")

# LLM API에 전달할 메시지와 같은 데이터 구조입니다.
messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_input},
]

print("\n[불러온 메시지]")
for message in messages:
    print(f"{message['role']}: {message['content']}")
```

</details>

<details>
<summary><code>ex2_st.py</code> — Streamlit 시작하기</summary>

```python
import streamlit as st

st.write("# 제목")
st.write("반가워용~~~")

st.write("### :blue[파란색] 작은 제목")
```

</details>

<details>
<summary><code>test.py</code> — 테스트 코드</summary>

```python
print("환영해요~!")

def my_function(**myname):
  print(myname + " " + myname)

my_function("Emil")
```

</details>

## 예제 데이터와 프롬프트

<details>
<summary><code>courses.json</code></summary>

```json
{
  "title": "AI 네이티브 개발 과정",
  "courses": [
    {
      "name": "파이썬 핵심 문법",
      "hours": 9,
      "required": true,
      "tools": ["Python", "VS Code"]
    },
    {
      "name": "LLM API와 구조화 출력",
      "hours": 8,
      "required": true,
      "tools": ["Pydantic", "OpenAI API"]
    },
    {
      "name": "AI 에이전트 개발",
      "hours": null,
      "required": false,
      "tools": ["LangChain", "MCP"]
    }
  ]
}
```

</details>

<details>
<summary><code>data/agent_eval.csv</code></summary>

```csv
id,question,expected_keyword,difficulty
1,AI 에이전트란 무엇인가요?,도구,초급
2,JSON 파일을 파이썬에서 읽는 방법은?,json.load,초급
3,에이전트가 잘못된 도구를 호출하면 어떻게 처리하나요?,예외 처리,중급
4,구조화된 LLM 출력을 검증하는 방법은?,Pydantic,중급
5,에이전트의 답변 품질을 어떻게 평가하나요?,평가 데이터셋,중급
```

</details>

<details>
<summary><code>prompts/system.md</code></summary>

```markdown
# 역할

당신은 AI 네이티브 개발 수업을 돕는 파이썬 튜터입니다.

## 답변 원칙

- 초보자가 이해할 수 있는 쉬운 표현을 사용합니다.
- 먼저 핵심 개념을 설명하고 짧은 코드 예제를 제시합니다.
- 코드에는 필요한 부분만 간결하게 담습니다.
- 모르는 내용은 추측하지 않고 확인이 필요하다고 말합니다.

## 답변 형식

1. 핵심 설명
2. 코드 예제
3. 연습 문제 하나
```

</details>
