# venv 개발환경 구축

## 완성할 환경

```text
Windows
  └─ Python 3.12
      └─ 프로젝트 폴더
          ├─ .venv/           가상환경
          ├─ requirements.txt 패키지 목록
          ├─ .env             API 키
          ├─ .gitignore       Git 제외 목록
          └─ check_env.py     환경 확인
```

> 처음에는 설치보다 **현재 어떤 Python과 가상환경을 사용하고 있는지 확인하는 습관**이 중요합니다.

## 1. 필요한 프로그램

| 프로그램 | 용도 | 확인 명령 |
|---|---|---|
| Python 3.12 | 예제 실행 | `py -3.12 --version` |
| VS Code | 코드 작성 | VS Code에서 확인 |
| Git | 변경 이력 관리 | `git --version` |

Python 설치 프로그램에서는 `Add python.exe to PATH`를 선택합니다. 설치 후 새 PowerShell을 열어 확인합니다.

```powershell
py -0p
py -3.12 --version
```

예상 결과:

```text
Python 3.12.x
```

## 2. 프로젝트 폴더 만들기

```powershell
mkdir my-agent
cd my-agent
```

영문 폴더명과 짧은 경로를 사용하면 도구별 경로 문제를 줄일 수 있습니다.

## 3. 가상환경 만들기

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

PowerShell 앞에 `(.venv)`가 표시되면 활성화된 것입니다.

```powershell
python --version
where.exe python
```

`where.exe python`의 첫 경로가 현재 프로젝트의 `.venv\Scripts\python.exe`인지 확인합니다.

PowerShell 실행 정책 때문에 활성화되지 않을 때는 현재 터미널에만 허용합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

가상환경 종료:

```powershell
deactivate
```

## 4. requirements.txt 만들기

```text
langchain==1.3.14
langgraph==1.2.9
langchain-openai==1.4.1
python-dotenv>=1.1,<2
```

설치:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

확인:

```powershell
python -m pip show langchain
python -m pip check
```

`pip check`가 `No broken requirements found`를 표시하면 의존성 충돌이 없습니다.

## 5. API 키를 .env로 분리하기

`.env`:

```text
OPENAI_API_KEY=여기에_실제_API_키
OPENAI_MODEL=gpt-4.1-mini
```

`.gitignore`:

```text
.venv/
.env
__pycache__/
*.pyc
.vscode/
```

`.env`는 Git에 올리지 않습니다. 공유할 때는 값이 비어 있는 `.env.example`만 전달합니다.

## 6. 환경 확인 코드

`check_env.py`:

```python
import os
import platform

from dotenv import load_dotenv

load_dotenv()

print("Python:", platform.python_version())
print("가상환경:", os.getenv("VIRTUAL_ENV", "활성화되지 않음"))
print("API 키:", "설정됨" if os.getenv("OPENAI_API_KEY") else "없음")

major, minor, *_ = platform.python_version_tuple()
if (major, minor) != ("3", "12"):
    raise RuntimeError("Python 3.12 환경에서 실행하세요.")

print("기본 환경 확인 완료")
```

실행:

```powershell
python check_env.py
```

API 키의 실제 값은 화면에 출력하지 않습니다.

## 7. VS Code에서 Python 선택하기

1. 프로젝트 폴더를 VS Code로 엽니다.
2. `Ctrl+Shift+P`를 누릅니다.
3. `Python: Select Interpreter`를 선택합니다.
4. `.venv\Scripts\python.exe`를 선택합니다.
5. 새 터미널에서 `python --version`을 다시 확인합니다.

## 바로 사용할 파일

- [requirements.txt](../course/try00-environment/requirements.txt)
- [.env.example](../course/try00-environment/.env.example)
- [.gitignore](../course/try00-environment/.gitignore)
- [check_env.py](../course/try00-environment/check_env.py)
- [README.md](../course/try00-environment/README.md)

## 최종 점검

- [ ] `py -3.12 --version`이 정상 출력된다.
- [ ] 프로젝트 안에 `.venv`가 있다.
- [ ] `where.exe python`의 첫 경로가 `.venv`이다.
- [ ] `python -m pip check`가 통과한다.
- [ ] `.env`가 `.gitignore`에 포함되어 있다.
- [ ] `python check_env.py`가 실행된다.

## 다음으로

환경 확인이 끝나면 **TRY 01 · Supabase**로 이동합니다.
