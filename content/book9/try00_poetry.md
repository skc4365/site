# Poetry로 의존성과 가상환경 관리하기

## 글로벌 Poetry와 프로젝트 패키지

```text
Windows 사용자 환경
└─ pipx
   └─ Poetry CLI                  ← 어느 폴더에서나 poetry 명령 사용

프로젝트 A
├─ pyproject.toml
├─ poetry.lock
└─ Poetry 가상환경
   ├─ fastapi
   └─ pydantic

프로젝트 B
├─ pyproject.toml
├─ poetry.lock
└─ Poetry 가상환경
   ├─ langchain
   └─ langgraph
```

> Poetry 명령은 글로벌하게 사용할 수 있지만, 프로젝트가 사용하는 패키지를 글로벌 Python에 설치하지 않습니다.

Poetry 자체는 `pipx`가 만든 독립 환경에서 관리합니다.

```powershell
pipx list
where.exe poetry
poetry --version
```

프로젝트 패키지는 Poetry가 선택한 별도 가상환경에 설치됩니다.

```powershell
cd project-a
poetry env info
poetry run python -c "import sys; print(sys.executable)"

cd ..\project-b
poetry env info
poetry run python -c "import sys; print(sys.executable)"
```

두 프로젝트의 Python 실행 경로가 서로 다르면 정상적으로 격리된 것입니다.

## Windows AppData에 생성되는 가상환경

Poetry의 기본 설정에서는 프로젝트별 가상환경이 프로젝트 폴더가 아니라 Windows의 로컬 AppData 캐시에 모입니다.

```text
C:\Users\User\AppData\Local\pypoetry\Cache\virtualenvs
├─ project-a-a1b2c3d4-py3.12
│  ├─ Scripts
│  │  ├─ python.exe
│  │  └─ pip.exe
│  └─ Lib\site-packages
│     ├─ fastapi
│     └─ pydantic
│
└─ project-b-e5f6g7h8-py3.12
   ├─ Scripts
   │  └─ python.exe
   └─ Lib\site-packages
      ├─ langchain
      └─ langgraph
```

`project-a-a1b2c3d4-py3.12`와 같은 폴더 이름은 다음 정보를 나타냅니다.

```text
project-a  : 프로젝트 이름
a1b2c3d4   : 프로젝트 경로를 구분하는 해시값 예시
py3.12     : 가상환경에서 사용하는 Python 버전
```

실제 폴더 이름과 해시값은 컴퓨터와 프로젝트 경로에 따라 달라집니다.

### 내 컴퓨터의 실제 경로 확인

프로젝트 폴더에서 실행합니다.

```powershell
# Poetry가 가상환경을 저장하는 기본 폴더
poetry config virtualenvs.path

# 현재 프로젝트의 가상환경 폴더
poetry env info --path

# 현재 프로젝트가 사용하는 python.exe
poetry env info --executable

# 현재 프로젝트와 연결된 가상환경 목록
poetry env list --full-path
```

출력 예시입니다.

```text
C:\Users\User\AppData\Local\pypoetry\Cache\virtualenvs
C:\Users\User\AppData\Local\pypoetry\Cache\virtualenvs\project-a-a1b2c3d4-py3.12
C:\Users\User\AppData\Local\pypoetry\Cache\virtualenvs\project-a-a1b2c3d4-py3.12\Scripts\python.exe
```

PowerShell에서 저장된 가상환경들을 직접 확인할 수도 있습니다.

```powershell
$env:LOCALAPPDATA
Get-ChildItem "$env:LOCALAPPDATA\pypoetry\Cache\virtualenvs"
```

### AppData 폴더 구분

| 경로 | 역할 |
|---|---|
| `%LOCALAPPDATA%\pypoetry\Cache\virtualenvs` | 프로젝트별 가상환경의 기본 저장 위치 |
| `%APPDATA%\pypoetry` | Poetry 설정·데이터에 사용되는 영역 |
| `<프로젝트>\.venv` | 프로젝트 내부 가상환경을 선택했을 때의 위치 |

Poetry 프로그램의 설치 위치는 공식 설치 스크립트와 `pipx` 중 어떤 방법을 사용했는지에 따라 달라질 수 있습니다. 다음 명령으로 실제 실행 파일을 확인합니다.

```powershell
where.exe poetry
```

### 프로젝트 폴더에 `.venv` 만들기

AppData 대신 프로젝트 내부에서 가상환경을 바로 보고 싶다면, 새 프로젝트에서 패키지를 설치하기 전에 다음과 같이 설정합니다.

```powershell
poetry config virtualenvs.in-project true --local
poetry install
poetry env info --path
```

```text
project-a
├─ .venv
├─ pyproject.toml
└─ poetry.lock
```

> 이미 AppData 가상환경을 사용 중인 프로젝트는 설정만 바꿔도 기존 환경을 계속 사용할 수 있습니다. 수업에서는 새 프로젝트를 만든 직후 설정하는 것이 가장 단순합니다.

## Poetry와 venv 비교

| 항목 | `venv + pip` | Poetry |
|---|---|---|
| 가상환경 생성 | 직접 `python -m venv .venv` | Poetry가 생성·선택 |
| 환경 활성화 | `.venv\Scripts\Activate.ps1` | `poetry run` 사용 가능 |
| 의존성 선언 | `requirements.txt` | `pyproject.toml` |
| 정확한 버전 | 직접 고정해서 기록 | `poetry.lock`에 기록 |
| 패키지 추가 | `pip install fastapi` 후 파일 갱신 | `poetry add fastapi` |
| 재현 설치 | `pip install -r requirements.txt` | `poetry install` |
| 개발 의존성 | 파일을 별도로 관리 | Dependency Group 사용 |
| 적합한 상황 | 작고 단순한 실습 | 장기 프로젝트·팀 개발 |

### venv 방식

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install fastapi
python -m pip freeze > requirements.txt
```

### Poetry 방식

```powershell
poetry env use 3.12
poetry add fastapi
poetry run python app.py
```

두 방식 모두 가상환경으로 패키지를 격리합니다. 차이는 Poetry가 의존성 선언·해결·lock·실행을 하나의 도구로 관리한다는 점입니다.

## 실습 목표

- `pyproject.toml`과 `poetry.lock`의 역할을 구분한다.
- Poetry로 프로젝트와 가상환경을 만든다.
- 패키지 추가·삭제·동기화·실행 명령을 사용한다.

## 핵심 개념

```text
pyproject.toml : 프로젝트 정보와 허용할 의존성
poetry.lock    : 실제 설치할 정확한 버전
Poetry env     : 프로젝트별 가상환경
```

> 같은 프로젝트에서는 `pip requirements`와 Poetry를 동시에 설치 기준으로 사용하지 않습니다.

## 1. Poetry 설치

Poetry 자체는 프로젝트 환경과 분리해 설치합니다. 공식 문서는 `pipx` 방식을 우선 안내합니다.

```powershell
py -3.12 -m pip install --user pipx
py -3.12 -m pipx ensurepath
```

PowerShell을 다시 연 뒤:

```powershell
pipx install poetry
poetry --version
```

## 2. 새 프로젝트 만들기

```powershell
poetry new summary-service
cd summary-service
Get-ChildItem
```

기존 폴더라면 다음을 사용합니다.

```powershell
poetry init
```

## 3. Python 3.12 환경 선택

```powershell
poetry env use 3.12
poetry env info
poetry run python --version
```

프로젝트 안에 `.venv`를 만들고 싶다면 최초 생성 전에 설정합니다.

```powershell
poetry config virtualenvs.in-project true --local
```

## 4. 패키지 관리

```powershell
poetry add fastapi pydantic uvicorn
poetry add --group dev pytest ruff
poetry show
poetry show --tree
```

삭제와 갱신:

```powershell
poetry remove fastapi
poetry update
```

`update`는 허용 범위 안에서 lock을 다시 계산합니다. 수업 중에는 무심코 실행하지 않고 변경 결과를 검토합니다.

## 5. pyproject.toml 읽기

```toml
[project]
name = "summary-service"
version = "0.1.0"
requires-python = ">=3.12,<3.13"
dependencies = [
  "fastapi>=0.115,<1",
  "pydantic>=2.11,<3",
  "uvicorn>=0.34,<1",
]

[dependency-groups]
dev = [
  "pytest>=8,<9",
  "ruff>=0.12,<1",
]
```

Poetry 2.x에서는 PEP 621의 `[project]`와 dependency group을 기준으로 읽습니다.

## Try — 작은 API 실행

`app.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

```powershell
poetry run uvicorn app:app --reload
```

```text
http://127.0.0.1:8000/health
```

## 재현 설치

저장소를 처음 받은 교육생은 다음 명령만 실행합니다.

```powershell
poetry install
poetry run python --version
```

Git에는 `pyproject.toml`과 `poetry.lock`을 함께 커밋하고 가상환경은 제외합니다.

## 완료 기준

- [ ] Poetry와 프로젝트 환경이 분리되어 있다.
- [ ] `pyproject.toml`과 `poetry.lock`의 차이를 설명할 수 있다.
- [ ] `poetry install`과 `poetry run`으로 예제를 실행했다.
