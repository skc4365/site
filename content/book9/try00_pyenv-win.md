# pyenv-win으로 Python 버전 관리하기

## 버전별 관리 예시

```text
Windows PC
└─ pyenv-win
   ├─ Python 3.10.11
   │  └─ legacy-api/      → .python-version: 3.10.11
   ├─ Python 3.11.9
   │  └─ data-project/    → .python-version: 3.11.9
   └─ Python 3.12.10
      ├─ ai-service/      → .python-version: 3.12.10
      │  └─ .venv/       → AI 서비스 전용 패키지
      └─ agent-project/   → .python-version: 3.12.10
         └─ .venv/       → Agent 전용 패키지
```

```text
pyenv-win = 프로젝트가 사용할 Python 실행기 선택
.venv     = 해당 프로젝트가 사용할 패키지 격리
```

프로젝트 폴더를 이동하면 `.python-version`에 기록된 Python이 선택됩니다.

```powershell
cd legacy-api
python --version  # Python 3.10.11

cd ..\ai-service
python --version  # Python 3.12.10
```

같은 Python 3.12를 사용하는 두 프로젝트도 `.venv`를 따로 만들면 서로 다른 패키지 버전을 사용할 수 있습니다.

| 프로젝트 | Python | 가상환경 패키지 예시 |
|---|---|---|
| `legacy-api` | 3.10.11 | FastAPI 0.x |
| `ai-service` | 3.12.10 | FastAPI·Pydantic 2 |
| `agent-project` | 3.12.10 | LangChain·LangGraph 1.x |

## 실습 목표

- Python 버전 관리자와 가상환경의 차이를 설명한다.
- pyenv-win으로 Python 3.12를 설치하고 프로젝트 버전을 고정한다.
- 선택된 Python으로 `.venv`를 만든다.

## 핵심 개념

```text
pyenv-win: 컴퓨터에 여러 Python 버전을 설치·선택
venv     : 선택한 Python 안에서 프로젝트 패키지를 격리
```

둘 중 하나를 고르는 것이 아닙니다. `pyenv-win → Python 선택 → venv 생성` 순서로 함께 사용할 수 있습니다.

## 1. 설치 전 확인

```powershell
where.exe python
py -0p
```

기존 Python 경로를 기록합니다. Microsoft Store의 App Execution Alias가 먼저 잡히면 설정에서 `python.exe` Alias를 끄거나 PATH 순서를 확인합니다.

## 2. pyenv-win 설치

공식 설치 스크립트는 먼저 파일로 내려받고 내용을 확인한 뒤 실행합니다.

```powershell
Invoke-WebRequest `
  -UseBasicParsing `
  -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" `
  -OutFile ".\install-pyenv-win.ps1"

Get-Content .\install-pyenv-win.ps1
.\install-pyenv-win.ps1
```

PowerShell을 완전히 닫았다 다시 열고 확인합니다.

```powershell
pyenv --version
where.exe pyenv
```

## 3. Python 3.12 설치

설치 가능한 정확한 패치 버전을 먼저 찾습니다.

```powershell
pyenv install --list | Select-String "3.12"
```

목록에 표시된 버전 하나를 선택합니다.

```powershell
pyenv install 3.12.10
pyenv versions
```

버전 번호는 예시입니다. `install --list`에 실제로 표시된 최신 3.12 패치 버전을 사용합니다.

## 4. 전역과 프로젝트 버전

```powershell
pyenv global 3.12.10
python --version
python -c "import sys; print(sys.executable)"
```

프로젝트 폴더에서만 고정:

```powershell
mkdir my-agent
cd my-agent
pyenv local 3.12.10
Get-Content .python-version
pyenv version
```

`local` 명령은 `.python-version` 파일을 만들며, 해당 폴더에서 선택할 버전을 기록합니다.

## 5. 가상환경 생성

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

```powershell
python --version
where.exe python
```

첫 번째 Python 경로가 프로젝트의 `.venv`여야 합니다.

## Try — 버전 점검 코드

```python
import platform
import sys

print("version:", platform.python_version())
print("executable:", sys.executable)
print("prefix:", sys.prefix)
print("base_prefix:", sys.base_prefix)
print("venv:", sys.prefix != sys.base_prefix)
```

## 자주 발생하는 문제

| 문제 | 확인 방법 |
|---|---|
| `pyenv`를 찾지 못함 | PowerShell 재시작, `where.exe pyenv` |
| 버전이 바뀌지 않음 | PATH에서 pyenv-win 경로의 순서 확인 |
| 원하는 버전이 없음 | `pyenv update` 후 목록 재확인 |
| `.venv`가 다른 버전 | 가상환경 삭제 후 선택한 Python으로 다시 생성 |

## 완료 기준

- [ ] `pyenv versions`에서 설치 버전을 확인했다.
- [ ] `.python-version`으로 프로젝트 버전을 고정했다.
- [ ] `.venv`의 Python 경로와 버전을 확인했다.
