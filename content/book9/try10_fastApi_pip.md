# pip로 FastAPI 프로젝트 만들기

## 딱 6단계

```text
1. 폴더 이동
2. 가상환경 생성
3. 가상환경 활성화
4. FastAPI 설치
5. main.py 작성
6. 서버 실행
```

완성 구조:

```text
D:\ws\
├─ .venv\
├─ main.py
├─ requirements.txt
└─ .gitignore
```

가상환경 활성화 후 CMD 표시:

```text
(.venv) D:\ws>
```

명령 입력 위치: `>` 오른쪽

## 1. 프로젝트 폴더로 이동

CMD 실행 후:

```bat
if not exist D:\ws mkdir D:\ws
cd /d D:\ws
```

현재 위치:

```text
D:\ws>
```

## 2. 가상환경 생성

```bat
python -m venv D:\ws\.venv
```

생성 결과:

```text
D:\ws\.venv
```

## 3. 가상환경 활성화

```bat
D:\ws\.venv\Scripts\activate.bat
```

활성화 확인:

```text
(.venv) D:\ws>
```

앞의 `(.venv)` 표시가 핵심.

## 4. FastAPI 설치

```bat
(.venv) D:\ws>python -m pip install "fastapi[standard]"
```

설치 확인:

```bat
(.venv) D:\ws>python -m fastapi --version
```

## 5. `main.py` 작성

VS Code에서 `D:\ws` 폴더 열기:

```bat
(.venv) D:\ws>code D:\ws
```

새 파일 생성:

```text
D:\ws\main.py
```

`main.py`:

```python
from fastapi import FastAPI


app = FastAPI()


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "FastAPI 실행 성공"}
```

파일 저장: `Ctrl+S`

## 6. 개발 서버 실행

CMD 위치와 가상환경 확인:

```text
(.venv) D:\ws>
```

실행:

```bat
(.venv) D:\ws>python -m fastapi dev D:\ws\main.py

# 또는 
(.venv) D:\ws>uvicorn main:app --reload
```

접속 주소:

| 주소 | 확인 내용 |
| --- | --- |
| <http://127.0.0.1:8000> | API 결과 |
| <http://127.0.0.1:8000/docs> | Swagger API 문서 |
| <http://127.0.0.1:8000/redoc> | ReDoc 문서 |

예상 결과:

```json
{"message":"FastAPI 실행 성공"}
```

서버 종료:

```text
Ctrl+C
```

## 전체 명령 한 번에 보기

`main.py` 작성 전:

```bat
if not exist D:\ws mkdir D:\ws
cd /d D:\ws

python -m venv D:\ws\.venv
D:\ws\.venv\Scripts\activate.bat

(.venv) D:\ws>python -m pip install "fastapi[standard]"
(.venv) D:\ws>code D:\ws
```

`main.py` 작성·저장 후:

```bat
(.venv) D:\ws>python -m fastapi dev D:\ws\main.py
```

## 다음 실행부터

컴퓨터 또는 CMD 재시작 후:

```bat
cd /d D:\ws
D:\ws\.venv\Scripts\activate.bat

(.venv) D:\ws>python -m fastapi dev D:\ws\main.py
```

새 가상환경 생성과 FastAPI 재설치 불필요.

## 패키지 저장

설치 목록 저장:

```bat
(.venv) D:\ws>python -m pip freeze > D:\ws\requirements.txt
```

`requirements.txt` 기반 재설치:

```bat
(.venv) D:\ws>python -m pip install -r D:\ws\requirements.txt
```

## `.gitignore`

`D:\ws\.gitignore`:

```gitignore
.venv/
__pycache__/
*.pyc
.env
```

Git 업로드 대상:

```text
main.py
requirements.txt
.gitignore
```

Git 제외 대상:

```text
.venv/
.env
__pycache__/
```

## pip 관리 명령

기준 위치:

```text
(.venv) D:\ws>
```

| 목적 | 가상환경 상태 | 명령 |
| --- | --- | --- |
| 패키지 설치 | `(.venv)` | `python -m pip install 패키지명` |
| FastAPI 정보 | `(.venv)` | `python -m pip show fastapi` |
| 설치 목록 | `(.venv)` | `python -m pip list` |
| 업데이트 목록 | `(.venv)` | `python -m pip list --outdated` |
| 패키지 업데이트 | `(.venv)` | `python -m pip install --upgrade 패키지명` |
| 패키지 제거 | `(.venv)` | `python -m pip uninstall 패키지명` |
| 의존성 검사 | `(.venv)` | `python -m pip check` |
| 가상환경 종료 | `(.venv)` | `deactivate` |

<details>
<summary><strong>pip 대신 python -m pip를 사용하는 이유</strong></summary>

```text
pip install ...           → PATH에서 찾은 pip
python -m pip install ... → 현재 Python에 연결된 pip
```

여러 Python 설치 환경에서의 경로 혼동 방지.

가상환경 Python 절대경로:

```bat
D:\ws\.venv\Scripts\python.exe -m pip install "fastapi[standard]"
```

</details>

<details>
<summary><strong>PowerShell 명령어</strong></summary>

```powershell
New-Item -ItemType Directory -Path D:\ws -Force
Set-Location D:\ws
python -m venv D:\ws\.venv
D:\ws\.venv\Scripts\Activate.ps1
python -m pip install "fastapi[standard]"
python -m fastapi dev D:\ws\main.py
```

실행 정책 오류:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
D:\ws\.venv\Scripts\Activate.ps1
```

</details>

<details>
<summary><strong>fastapi 명령을 찾을 수 없을 때</strong></summary>

가상환경 다시 활성화:

```bat
cd /d D:\ws
D:\ws\.venv\Scripts\activate.bat
```

설치 확인:

```bat
(.venv) D:\ws>python -m pip show fastapi
(.venv) D:\ws>python -m pip check
```

재설치:

```bat
(.venv) D:\ws>python -m pip install "fastapi[standard]"
```

</details>

<details>
<summary><strong>Error loading ASGI app 오류</strong></summary>

확인 항목:

- `D:\ws\main.py` 파일 존재
- `app = FastAPI()` 코드 존재
- 파일 저장 여부
- Python 문법 오류

다시 실행:

```bat
(.venv) D:\ws>cd /d D:\ws
(.venv) D:\ws>python -m fastapi dev D:\ws\main.py
```

</details>

<details>
<summary><strong>포트 8000 사용 중 오류</strong></summary>

다른 포트 사용:

```bat
(.venv) D:\ws>python -m fastapi dev D:\ws\main.py --port 8001
```

접속 주소:

```text
http://127.0.0.1:8001/docs
```

</details>

## 최종 체크

- [ ] CMD 위치 `D:\ws`
- [ ] 프롬프트 앞 `(.venv)` 표시
- [ ] `D:\ws\main.py` 저장
- [ ] FastAPI 설치 완료
- [ ] 개발 서버 실행
- [ ] `/docs` 접속 성공
- [ ] `requirements.txt` 생성

## 핵심 3줄

```bat
cd /d D:\ws
D:\ws\.venv\Scripts\activate.bat

(.venv) D:\ws>python -m fastapi dev D:\ws\main.py
```

## 공식 문서

- [FastAPI 첫 실행](https://fastapi.tiangolo.com/)
- [FastAPI CLI](https://fastapi.tiangolo.com/fastapi-cli/)
- [pip 사용자 가이드](https://pip.pypa.io/en/stable/user_guide/)
