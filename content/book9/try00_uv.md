# uv로 Python 개발환경 만들기

## Python 버전과 패키지 관리 한눈에 보기

```text
내 컴퓨터
├─ uv 실행 파일
│  └─ 위치 확인: (Get-Command uv).Source
│
├─ uv 관리형 Python 저장소
│  ├─ Python 3.11.x
│  └─ Python 3.12.x
│     위치 확인: uv python dir
│
└─ 개발 프로젝트
   ├─ legacy-api/
   │  ├─ .python-version  → Python 3.11 선택
   │  ├─ pyproject.toml   → 사용할 패키지 선언
   │  ├─ uv.lock          → 정확한 패키지 버전 잠금
   │  └─ .venv/           → 프로젝트 전용 패키지
   │
   ├─ ai-service/
   │  ├─ .python-version  → Python 3.12 선택
   │  ├─ pyproject.toml   → FastAPI·Pydantic 선언
   │  ├─ uv.lock          → 정확한 패키지 버전 잠금
   │  └─ .venv/           → 프로젝트 전용 패키지
   │
   └─ agent-project/
      ├─ .python-version  → Python 3.12 선택
      ├─ pyproject.toml   → LangChain·LangGraph 선언
      ├─ uv.lock          → 정확한 패키지 버전 잠금
      └─ .venv/           → 프로젝트 전용 패키지
```

```text
uv python install → Python 설치
uv python pin     → 프로젝트 Python 선택
uv add/remove     → 패키지 추가·제거
uv lock           → 패키지 버전 잠금
uv sync           → .venv 생성·동기화
uv run            → 프로젝트 환경에서 실행
```

## 1. uv 설치

### Windows

```powershell
# uv 설치
winget install --id astral-sh.uv --exact

# 설치 확인
uv --version
```

### macOS

```bash
# uv 설치
brew install uv

# 설치 확인
uv --version
```

### Linux

```bash
# uv 설치
curl -LsSf https://astral.sh/uv/install.sh | sh

# 설치 확인
uv --version
```

설치 후 명령을 찾지 못하면 터미널과 VS Code를 다시 실행합니다.

## 2. 개발환경 구축

### 프로젝트 생성

```powershell
# 프로젝트 생성
uv init --app my-python-app
cd my-python-app

# Python 설치·고정
uv python install 3.12
uv python pin 3.12

# .venv와 uv.lock 생성
uv sync
```

프로젝트 생성 완료

```text
my-python-app/
├─ .python-version   # Python 버전
├─ .venv/            # 가상환경
├─ main.py            # 실행 파일
├─ pyproject.toml     # 패키지 선언
└─ uv.lock            # 패키지 버전 잠금
```

### 패키지 설치

```powershell
# 실행 패키지
uv add fastapi "uvicorn[standard]" pydantic python-dotenv

# 개발 패키지
uv add --dev pytest pytest-cov ruff mypy

# 설치 목록
uv tree
```

패키지는 `pip install` 대신 `uv add`로 설치합니다.

### 개발 명령

```powershell
# Python 실행
uv run python main.py

# FastAPI 실행
uv run uvicorn main:app --reload

# 코드 정리
uv run ruff format .

# 코드 검사
uv run ruff check .

# 타입 검사
uv run mypy .

# 테스트
uv run pytest
```

가상환경을 직접 활성화하지 않아도 `uv run`이 `.venv`를 사용합니다.

### 버전과 경로 확인

```powershell
# uv 위치
(Get-Command uv).Source

# Python 저장 위치
uv python dir

# 현재 Python 버전·경로
uv run python --version
uv run python -c "import sys; print(sys.executable)"

# 설치 패키지
uv pip list
```

### 패키지 관리

```powershell
# 패키지 추가
uv add 패키지이름

# 개발 패키지 추가
uv add --dev 패키지이름

# 패키지 제거
uv remove 패키지이름

# 환경 동기화
uv sync

# 전체 업데이트
uv lock --upgrade
uv sync
```

### Git 설정

`.gitignore`에 로컬 환경과 비밀키를 제외합니다.

```gitignore
.venv/
.env
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/
.mypy_cache/
```

Git에는 `.python-version`, `pyproject.toml`, `uv.lock`을 함께 저장합니다.

### 다른 PC에서 환경 복구

```powershell
# 저장소 받기
git clone 저장소_URL
cd 프로젝트_폴더

# 동일 환경 설치
uv sync --locked

# 실행 확인
uv run python main.py
```

## 공식 문서

- [uv 공식 문서](https://docs.astral.sh/uv/)
- [uv 설치](https://docs.astral.sh/uv/getting-started/installation/)
- [uv 프로젝트 사용법](https://docs.astral.sh/uv/guides/projects/)
- [Python 버전 관리](https://docs.astral.sh/uv/concepts/python-versions/)
- [프로젝트 의존성 관리](https://docs.astral.sh/uv/concepts/projects/dependencies/)
- [잠금과 환경 동기화](https://docs.astral.sh/uv/concepts/projects/sync/)
- [`uv run` 사용법](https://docs.astral.sh/uv/concepts/projects/run/)
- [CLI 명령어](https://docs.astral.sh/uv/reference/cli/)
