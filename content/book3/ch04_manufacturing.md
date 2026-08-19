# Chapter 04 쉬운 제조 실습 — 연습 프로젝트 준비하기

## 목표

Python 3.12에서 기계 상태 도우미가 실행될 폴더와 가상환경을 만듭니다.

## 쉬운 폴더 구조

```text
machine-helper/
  app/
    main.py          # 시작 파일
    data.py          # 연습 데이터 읽기
    helper.py        # 도우미 만들기
  data/
    machines.json    # 기계 연습 데이터
  tests/
    test_data.py
  .env.example
  pyproject.toml
```

처음에는 복잡한 `domain`, `adapter`, `repository` 이름을 사용하지 않습니다. 코드가 커질 때 해당 개념을 소개합니다.

## Python 3.12 환경

```powershell
uv python install 3.12
uv venv --python 3.12
.venv\Scripts\Activate.ps1
uv pip install "langchain>=1,<2" "langgraph>=1,<2" langchain-openai python-dotenv
```

확인:

```powershell
python --version
```

출력의 앞부분이 `Python 3.12`인지 확인합니다.

## 첫 실행 파일

```python
# app/main.py
machine = {
    "machine_id": "M-01",
    "made_count": 100,
    "bad_count": 3,
}

print(f"기계: {machine['machine_id']}")
print(f"만든 개수: {machine['made_count']}")
print(f"문제 제품: {machine['bad_count']}")
```

실행:

```powershell
python app/main.py
```

## 비밀번호 파일

`.env.example`:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

실제 키는 `.env`에 넣고 다른 사람에게 전달하거나 Git에 올리지 않습니다.

## 실습 체크

- Python 버전이 다르면 어떤 가상환경이 켜졌는지 확인합니다.
- `ModuleNotFoundError`가 나면 같은 환경에 패키지를 설치했는지 확인합니다.
- API가 없어도 `main.py`의 연습 데이터 출력은 되어야 합니다.

## 완료 기준

- [ ] Python 3.12 환경을 만들었다.
- [ ] 세 가지 숫자가 화면에 표시된다.
- [ ] 실제 비밀번호가 코드에 없다.
- [ ] 각 폴더의 역할을 쉬운 말로 설명할 수 있다.

