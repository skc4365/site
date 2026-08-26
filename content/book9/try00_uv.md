# uv 처음 사용 가이드

## 학습 목표

- uv가 Python, 가상환경, 패키지와 잠금 파일을 어떻게 관리하는지 설명한다.
- Python 3.12 기반 uv 프로젝트를 처음부터 만든다.
- 패키지 추가·삭제·업데이트와 프로그램 실행을 uv 명령으로 수행한다.
- `pyproject.toml`과 `uv.lock`으로 다른 PC에서 같은 환경을 재현한다.

> 처음에는 가상환경을 수동으로 활성화하기보다 `uv run`으로 실행하는 습관을 권장합니다.

`uv`는 Python 설치, 가상환경, 패키지 설치, 의존성 잠금, 명령 실행을 하나의 명령으로 관리하는 별도의 도구입니다.

이 문서는 `uv` 방식을 처음 사용하는 학습자를 위한 독립 가이드입니다. 기존 `venv + pip` 방식과 uv 방식을 섞지 않고, 프로젝트 의존성은 uv 명령으로 관리합니다.

| 기존 방식 | uv 방식 | 역할 |
|---|---|---|
| `py -3.12 -m venv .venv` | `uv sync` | 프로젝트 가상환경 생성 |
| `requirements.txt` | `pyproject.toml` | 프로젝트가 요구하는 패키지 선언 |
| `pip install 패키지` | `uv add 패키지` | 패키지를 프로젝트 의존성으로 추가 |
| `pip uninstall 패키지` | `uv remove 패키지` | 프로젝트 의존성 제거 |
| `pip freeze` | `uv lock` | 재현 가능한 정확한 버전 결정 |
| 직접 `python app.py` | `uv run python app.py` | 프로젝트 환경에서 프로그램 실행 |

> uv 프로젝트에서는 `uv add`, `uv remove`, `uv sync`, `uv run`을 사용합니다. 활성화된 가상환경에서 임의로 `pip install`하면 `pyproject.toml`과 실제 환경이 달라질 수 있습니다.

## 1. uv 설치

Windows에서는 `winget`으로 설치하는 방법이 간단합니다.

```powershell
winget install --id=astral-sh.uv -e
```

공식 설치 스크립트를 사용할 수도 있습니다. 인터넷에서 받은 스크립트를 실행하므로, 조직의 보안 정책을 먼저 확인합니다.

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

macOS·Linux 공식 설치 명령:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

설치 후 **새 터미널**을 열고 확인합니다.

```powershell
uv --version
uv --help
```

standalone installer로 설치했다면 다음 명령으로 uv 자체를 업데이트할 수 있습니다.

```powershell
uv self update
```

`winget`, Homebrew, pipx 등으로 설치했다면 해당 패키지 관리자의 업데이트 명령을 사용합니다.

## 2. Python 3.12 준비

uv는 필요한 Python 버전도 설치하고 관리할 수 있습니다.

```powershell
uv python install 3.12
uv python list
```

이 명령은 시스템에 이미 있는 Python을 지우지 않습니다. uv가 관리하는 Python 3.12를 추가합니다.

## 3. 새 프로젝트 만들기

```powershell
mkdir my-uv-agent
cd my-uv-agent
uv init --bare
uv python pin 3.12
```

`--bare`는 입문 실습에 필요한 최소 `pyproject.toml`만 만듭니다. 패키지로 배포할 애플리케이션이나 라이브러리는 이후 `uv init --app` 또는 `uv init --lib` 구조를 학습합니다.

현재 폴더의 핵심 파일은 다음과 같습니다.

```text
my-uv-agent/
  ├─ .python-version  사용할 Python 버전
  └─ pyproject.toml   직접 사용하는 패키지와 프로젝트 설정
```

## 4. 패키지 추가

```powershell
uv add langchain langgraph langchain-openai python-dotenv
```

`uv add`는 한 번에 다음 작업을 수행합니다.

1. 패키지를 `pyproject.toml`에 기록합니다.
2. 호환되는 정확한 버전을 `uv.lock`에 기록합니다.
3. `.venv`를 만들거나 갱신합니다.
4. 패키지를 `.venv`에 설치합니다.

생성 결과:

```text
my-uv-agent/
  ├─ .venv/           uv가 관리하는 가상환경
  ├─ .python-version  Python 3.12 지정
  ├─ pyproject.toml   직접 의존성
  └─ uv.lock          전체 의존성의 정확한 잠금 버전
```

버전 범위를 지정할 때는 PowerShell이 기호를 해석하지 않도록 따옴표로 감쌉니다.

```powershell
uv add "python-dotenv>=1.1,<2"
uv add "langchain>=1,<2"
```

개발할 때만 사용하는 패키지는 `--dev`로 구분합니다.

```powershell
uv add --dev pytest ruff
```

## 5. Python 파일 실행

프로젝트 폴더에 다음 `check_env.py`를 만듭니다.

```python
import os
import platform

from dotenv import load_dotenv

load_dotenv()

print("Python:", platform.python_version())
print("가상환경:", os.getenv("VIRTUAL_ENV", "감지되지 않음"))
print("API 키:", "설정됨" if os.getenv("OPENAI_API_KEY") else "없음")
```

uv가 관리하는 환경에서 실행합니다.

```powershell
uv run python check_env.py
```

`uv run`은 실행 전에 다음 상태를 자동으로 확인합니다.

- `pyproject.toml`과 `uv.lock`이 일치하는가?
- `.venv`가 존재하는가?
- 잠긴 버전의 패키지가 모두 설치되어 있는가?

따라서 가상환경을 활성화하지 않아도 됩니다.

```powershell
uv run python --version
uv run python -c "import langchain; print(langchain.__version__)"
```

가상환경을 직접 활성화하는 기존 방식도 사용할 수 있습니다.

```powershell
uv sync
.venv\Scripts\Activate.ps1
python check_env.py
deactivate
```

macOS·Linux 활성화 명령:

```bash
uv sync
source .venv/bin/activate
python check_env.py
deactivate
```

처음에는 활성화 여부에 덜 영향을 받는 `uv run`을 권장합니다.

## 6. 패키지 확인·삭제·업데이트

설치된 의존성 트리 확인:

```powershell
uv tree
```

패키지 삭제:

```powershell
uv remove langgraph
```

특정 패키지만 호환 범위 안에서 업데이트:

```powershell
uv lock --upgrade-package langchain
uv sync
```

모든 패키지의 업데이트는 결과가 크게 달라질 수 있으므로 Git 변경 내용을 확인한 뒤 수행합니다.

```powershell
uv lock --upgrade
uv sync
```

## 7. pyproject.toml과 uv.lock의 차이

| 파일 | 사람이 직접 수정? | Git에 저장? | 의미 |
|---|---:|---:|---|
| `pyproject.toml` | 가능 | 예 | 프로젝트가 허용하는 Python·패키지 버전 범위 |
| `uv.lock` | 아니요 | 예 | 실제 설치할 모든 직접·간접 의존성의 정확한 버전 |
| `.python-version` | 가능 | 예 | uv가 프로젝트에서 선택할 Python 버전 |
| `.venv/` | 아니요 | 아니요 | 현재 PC에 설치된 실행 환경 |

`uv.lock`은 팀원이 같은 버전으로 환경을 재현하게 해주므로 Git에 포함합니다. `.venv`는 크고 운영체제마다 다르므로 Git에서 제외합니다.

`.gitignore`:

```text
.venv/
.env
__pycache__/
*.pyc
```

## 8. 다른 PC에서 프로젝트 실행

Git 저장소를 받은 사람은 Python과 패키지를 하나씩 설치하지 않고 다음 순서로 환경을 재현합니다.

```powershell
git clone 저장소_URL
cd 프로젝트_폴더
uv sync --locked
uv run python check_env.py
```

`--locked`는 `pyproject.toml`과 `uv.lock`이 다르면 자동 변경하지 않고 오류를 내므로, CI와 수업 환경에서 예기치 않은 버전 변화를 막는 데 유용합니다.

## 9. requirements.txt에서 이동

기존 `requirements.txt`의 패키지를 uv 프로젝트 의존성으로 가져올 수 있습니다.

```powershell
uv init --bare
uv python pin 3.12
uv add -r requirements.txt
```

이후에는 `pyproject.toml`과 `uv.lock`을 기준으로 관리합니다. 외부 시스템에 `requirements.txt`가 꼭 필요한 경우에만 내보냅니다.

```powershell
uv export --format requirements-txt --output-file requirements.txt
```

## 10. 프로젝트에 설치하지 않고 도구 한 번 실행

`ruff`, `black` 같은 CLI 도구를 시험만 할 때는 `uvx`를 사용할 수 있습니다.

```powershell
uvx ruff check .
```

`uvx`는 임시 격리 환경에서 도구를 실행하므로 해당 도구를 프로젝트 의존성에 추가하지 않습니다. 팀 전체가 같은 버전을 사용해야 하는 도구는 `uv add --dev`로 기록하는 편이 좋습니다.

## 11. 자주 발생하는 문제

### `uv` 명령을 찾을 수 없음

설치 직후 열려 있던 터미널에는 PATH 변경이 반영되지 않을 수 있습니다. PowerShell과 VS Code를 모두 닫고 다시 엽니다.

```powershell
Get-Command uv
uv --version
```

### 잘못된 Python 버전이 선택됨

```powershell
uv python pin 3.12
uv sync
uv run python --version
```

### `.venv` 상태가 이상함

`.venv`에는 직접 작성한 소스가 없어야 합니다. 필요한 파일을 백업한 뒤 `.venv`만 삭제하고 잠금 파일로 다시 만들 수 있습니다.

```powershell
Remove-Item -LiteralPath .venv -Recurse -Force
uv sync --locked
```

### `uv sync` 후 수동 설치 패키지가 사라짐

`uv sync`는 기본적으로 잠금 파일과 환경을 정확히 맞춥니다. `pip install`로만 추가한 패키지는 선언되지 않은 의존성이므로 제거될 수 있습니다. 필요한 패키지는 반드시 `uv add 패키지명`으로 기록합니다.

## 12. uv 최종 점검

- [ ] `uv --version`이 정상 출력된다.
- [ ] `uv run python --version`이 Python 3.12를 표시한다.
- [ ] `pyproject.toml`, `uv.lock`, `.python-version`이 존재한다.
- [ ] `.venv/`와 `.env`가 `.gitignore`에 포함되어 있다.
- [ ] `uv tree`에서 직접 추가한 패키지를 확인할 수 있다.
- [ ] `uv run python check_env.py`가 정상 실행된다.

공식 문서:

- [uv 설치](https://docs.astral.sh/uv/getting-started/installation/)
- [uv 프로젝트 시작](https://docs.astral.sh/uv/guides/projects/)
- [의존성 잠금과 동기화](https://docs.astral.sh/uv/concepts/projects/sync/)
- [uv run으로 명령 실행](https://docs.astral.sh/uv/concepts/projects/run/)
