# Streamlit Community Cloud 배포 가이드

## 한눈에 보는 배포 순서

```text
1. 앱 실행 확인
       ↓
2. 의존성 파일 준비
       ↓
3. 비밀값 분리
       ↓
4. GitHub 업로드
       ↓
5. Community Cloud 연결
       ↓
6. 저장소·브랜치·실행 파일 선택
       ↓
7. Deploy
       ↓
8. 로그 확인
```

배포 결과:

```text
내 컴퓨터의 app.py → 인터넷에서 접속 가능한 https://앱이름.streamlit.app
```

## 0. 준비물

- 실행 가능한 Streamlit 앱
- GitHub 계정
- GitHub 저장소
- Streamlit Community Cloud 계정

접속 주소:

- GitHub: <https://github.com>
- Streamlit Community Cloud: <https://share.streamlit.io>

## 1. 프로젝트 구조 확인

권장 구조:

```text
my-streamlit-app/
├─ app.py
├─ requirements.txt
├─ .gitignore
└─ .streamlit/
   └─ secrets.toml     # GitHub 업로드 금지
```

각 파일의 역할:

| 파일 | 역할 |
| --- | --- |
| `app.py` | 앱 시작 파일 |
| `requirements.txt` | Python 패키지 목록 |
| `.gitignore` | Git 제외 파일 목록 |
| `.streamlit/secrets.toml` | 로컬 비밀값 |

최소 `app.py`:

```python
import streamlit as st


st.set_page_config(page_title="나의 첫 앱", page_icon="🚀")
st.title("Streamlit Cloud 배포 성공")
st.write("GitHub 저장소와 연결된 앱입니다.")
```

## 2. 로컬 실행 확인

프로젝트 루트에서 실행:

```powershell
uv run streamlit run app.py
```

`pip` 환경의 실행 명령:

```powershell
python -m streamlit run app.py
```

확인 주소:

```text
http://localhost:8501
```

배포 전 체크:

- 앱 화면 정상 출력
- 터미널 오류 없음
- 파일 경로 오류 없음
- 필요한 데이터 파일 존재

## 3. 의존성 파일 준비

가장 단순한 방법: `requirements.txt`

```text
streamlit
pandas
requests
```

버전 고정 예시(2026-09-07 기준):

```text
streamlit==1.63.0
pandas
requests
```

운영 프로젝트: 로컬에서 검증한 실제 버전으로 고정.

현재 버전 확인:

```powershell
uv run streamlit version
uv pip list
```

작성 원칙:

- 코드에서 직접 사용하는 외부 패키지 포함
- `os`, `json`, `pathlib` 등 표준 라이브러리 제외
- Streamlit 버전 고정 권장
- 의존성 관리 파일 한 종류만 사용 권장

Community Cloud 인식 순서:

```text
uv.lock → Pipfile → environment.yml → requirements.txt → pyproject.toml
```

`uv` 프로젝트:

- `pyproject.toml`과 `uv.lock` 함께 업로드
- 잠금 파일 기반 동일 환경 구성

간단한 수업 프로젝트:

- `requirements.txt` 방식 권장

## 4. 비밀값 분리

API 키의 잘못된 사용:

```python
API_KEY = "실제-API-키"  # GitHub 노출 위험
```

권장 코드:

```python
import streamlit as st


api_key = st.secrets["API_KEY"]
```

로컬 `.streamlit/secrets.toml`:

```toml
API_KEY = "실제-API-키"
```

`.gitignore`:

```gitignore
.streamlit/secrets.toml
.env
__pycache__/
.venv/
```

보안 체크:

- API 키의 코드 직접 입력 금지
- `secrets.toml` GitHub 업로드 금지
- 이미 노출된 키의 즉시 폐기·재발급

## 5. GitHub 저장소 업로드

### 5-1. GitHub 저장소 생성

1. GitHub 로그인
2. 오른쪽 위 `+` 선택
3. `New repository` 선택
4. 저장소 이름 입력
5. `Public` 또는 `Private` 선택
6. `Create repository` 선택

### 5-2. 로컬 프로젝트 연결

```powershell
git init
git add .
git commit -m "Add Streamlit app"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

GitHub 화면의 필수 파일 확인:

```text
저장소
├─ app.py                  ✓
├─ requirements.txt        ✓
└─ .streamlit/
   └─ secrets.toml         ✗
```

## 6. Community Cloud 로그인

1. <https://share.streamlit.io> 접속
2. GitHub 계정으로 로그인
3. GitHub 저장소 접근 권한 승인
4. 저장소 소유자와 같은 Workspace 선택

<details>
<summary><strong>중요: GitHub Private 저장소 연결</strong></summary>

### 필요한 권한

- GitHub 저장소의 관리자 권한
- Streamlit Community Cloud의 GitHub 접근 승인
- Private 저장소용 추가 GitHub 권한 승인

### 연결 순서

1. Community Cloud 오른쪽 위 프로필 선택
2. `Settings` 선택
3. `Linked accounts` 또는 GitHub 연결 설정 선택
4. GitHub 권한 승인
5. Private 저장소 접근 허용
6. Community Cloud로 복귀
7. 저장소 소유자와 같은 Workspace 선택
8. `Create app`에서 저장소 이름 직접 입력

### 저장소가 목록에 없을 때

- 저장소 소유자 Workspace 확인
- GitHub 조직의 외부 앱 사용 정책 확인
- 조직 관리자의 Streamlit 승인 확인
- 저장소 관리자 권한 확인
- GitHub 연결 해제 후 재연결
- Repository 입력란에 `소유자/저장소명` 직접 입력

### 꼭 구분할 것

```text
Private GitHub 저장소 ≠ Private Streamlit 앱
```

- Private 저장소: 소스 코드의 공개 범위
- Private 앱: 배포된 웹 화면의 공개 범위
- 앱 공개 범위: `App settings → Sharing`에서 별도 설정

</details>

## 7. 앱 생성

1. 오른쪽 위 `Create app` 선택
2. `Yup, I have an app` 선택
3. 앱 정보 입력

입력 예시:

| 항목 | 입력값 |
| --- | --- |
| Repository | `사용자명/저장소명` |
| Branch | `main` |
| Main file path | `app.py` |
| App URL | 원하는 주소 이름 |

하위 폴더의 앱:

```text
Main file path: dashboard/app.py
```

경로 주의:

- `/` 사용
- `\` 사용 금지
- 영문 대소문자 정확히 일치
- GitHub 저장소 루트 기준 경로

## 8. Python 버전과 Secrets 설정

`Advanced settings` 선택.

### Python version

- 로컬 개발 버전과 동일한 버전 선택
- 미선택 시 Community Cloud 기본 버전 사용
- 현재 기본값: Python 3.12

### Secrets

로컬 `secrets.toml` 내용 붙여넣기:

```toml
API_KEY = "실제-API-키"
```

여러 비밀값 예시:

```toml
OPENAI_API_KEY = "실제-키"
DATABASE_URL = "실제-주소"
```

설정 완료:

```text
Advanced settings → Save
```

## 9. 배포 실행

```text
Deploy 선택 → 패키지 설치 → 앱 실행 → 공개 URL 생성
```

성공 확인:

- 앱 화면 정상 출력
- 버튼·입력 위젯 정상 동작
- 새로 고침 정상 동작
- 모바일 또는 다른 브라우저 접속
- 비밀값 노출 없음

공개 주소 예시:

```text
https://my-first-app.streamlit.app
```

## 10. 코드 수정과 재배포

로컬 코드 수정 후:

```powershell
git add .
git commit -m "Update app"
git push
```

배포 흐름:

```text
GitHub push → Community Cloud 변경 감지 → 앱 자동 업데이트
```

의존성 변경:

```text
requirements.txt 수정 → commit → push → 패키지 재설치
```

## 11. 오류 확인

앱 오른쪽 아래:

```text
Manage app → 로그 확인
```

로그의 마지막 오류부터 확인.

### `ModuleNotFoundError`

원인:

- `requirements.txt` 패키지 누락
- 패키지 이름 오류

해결:

```text
requirements.txt 수정 → commit → push
```

### `FileNotFoundError`

원인:

- 로컬에만 존재하는 파일
- 잘못된 상대 경로
- Windows 경로 구분자 `\`
- 대소문자 불일치

권장 경로:

```python
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
data_path = BASE_DIR / "data" / "sample.csv"
```

### `KeyError` 또는 Secrets 오류

확인 항목:

- `Advanced settings → Secrets` 입력 여부
- 코드와 Secrets의 키 이름 일치
- TOML 문법

### 앱 무한 로딩·메모리 오류

확인 항목:

- 대용량 파일 로딩
- 매 실행마다 모델 생성
- 종료 없는 반복문
- 과도한 캐시 데이터

개선 예시:

```python
import streamlit as st


@st.cache_resource
def load_model():
    return create_model()
```

### 새 코드 미반영

확인 항목:

- 올바른 브랜치에 push
- GitHub의 최신 commit
- Community Cloud의 Main file path

강제 재시작:

```text
Manage app → ⋮ → Reboot app
```

## 12. 부수적이지만 중요한 설정

<details>
<summary><strong>의존성 파일이 여러 개일 때</strong></summary>

Community Cloud의 탐색 순서:

```text
uv.lock → Pipfile → environment.yml → requirements.txt → pyproject.toml
```

탐색 위치:

1. 실행 파일이 있는 폴더
2. GitHub 저장소 루트

주의사항:

- 첫 번째로 발견된 파일만 사용
- `uv.lock` 존재 시 `requirements.txt`보다 우선
- 한 앱에 한 가지 의존성 관리 방식 권장
- 예상과 다른 패키지 설치 시 중복 파일 확인

</details>

<details>
<summary><strong>Secrets 안전 관리</strong></summary>

로컬 저장 위치:

```text
.streamlit/secrets.toml
```

Cloud 입력 위치:

```text
App settings → Secrets
```

필수 원칙:

- `secrets.toml`의 GitHub 업로드 금지
- `.gitignore` 등록
- 화면·로그에 API 키 출력 금지
- 노출된 키의 폐기와 재발급
- 코드와 Secrets의 키 이름 일치

이미 Git에 올린 비밀값:

```text
파일 삭제만으로 해결 불가 → 키 폐기 → 새 키 발급 → Cloud Secrets 교체
```

</details>

<details>
<summary><strong>Windows에서는 되는데 Cloud에서 실패할 때</strong></summary>

Community Cloud 실행 환경: Debian Linux

주요 차이:

- 대소문자 구분: `Data.csv`와 `data.csv`는 다른 파일
- 경로 구분자: `\` 대신 `/`
- 로컬 절대 경로 사용 불가
- Windows 전용 프로그램 사용 불가

권장 코드:

```python
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
data_path = BASE_DIR / "data" / "sample.csv"
```

추가 Linux 패키지:

```text
저장소 루트/packages.txt
```

`packages.txt` 예시:

```text
ffmpeg
libgl1
```

</details>

<details>
<summary><strong>앱 공개 범위와 공유</strong></summary>

설정 위치:

```text
App settings → Sharing
```

확인 항목:

- 전체 공개 여부
- 허용 사용자 이메일
- 조직 또는 Workspace 정책
- 로그 접근 권한

주의:

- Private 저장소 사용만으로 앱 화면 비공개 처리 불가
- 민감한 데이터의 화면·다운로드 노출 확인
- 공유 링크를 로그인이 없는 브라우저에서 테스트

</details>

<details>
<summary><strong>앱 절전과 재부팅</strong></summary>

Community Cloud 앱: 일정 시간 트래픽 부재 시 절전 가능

절전 앱 접속:

```text
앱 URL 방문 → 깨우기 선택 → 앱 재시작
```

강제 재부팅:

```text
Manage app → ⋮ → Reboot app
```

재부팅이 필요한 상황:

- 메모리 초기화
- 캐시 초기화
- 변경 내용 미반영
- 의존성 재설치 후 이상 동작

</details>

<details>
<summary><strong>배포 후 Python 버전 변경</strong></summary>

현재 제약: 배포된 앱의 Python 버전 직접 변경 불가

변경 순서:

1. Repository, Branch, Main file path 기록
2. App URL과 Secrets 기록
3. 기존 앱 삭제
4. 같은 설정으로 앱 재배포
5. `Advanced settings`에서 새 Python 버전 선택
6. Secrets 재입력

주의: 앱 삭제 전 설정값 별도 보관

</details>

## 13. 배포 전 최종 체크리스트

- [ ] 로컬 앱 실행 성공
- [ ] `app.py` 위치 확인
- [ ] 의존성 파일 준비
- [ ] Python 버전 확인
- [ ] API 키 코드 제거
- [ ] `secrets.toml`의 `.gitignore` 등록
- [ ] GitHub 파일 업로드 확인
- [ ] Repository와 Branch 확인
- [ ] Main file path 확인
- [ ] Cloud Secrets 입력
- [ ] 배포 로그 오류 없음
- [ ] 공개 URL 접속 성공

## 최소 배포 요약

```text
app.py 작성
  ↓
requirements.txt 작성
  ↓
GitHub push
  ↓
share.streamlit.io → Create app
  ↓
Repository / Branch / app.py 선택
  ↓
Secrets 입력
  ↓
Deploy
```

## 운영 참고

- GitHub 저장소: 배포 원본
- GitHub push: 앱 자동 업데이트
- Cloud logs: 오류 확인의 첫 위치
- 장시간 미사용 앱: 절전 상태 가능
- 절전 앱 방문: 다시 시작 안내
- Python 버전 변경: 앱 삭제 후 재배포 필요
- 외부 Linux 패키지: 저장소 루트의 `packages.txt`

## 공식 문서

- [Community Cloud 배포](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy)
- [프로젝트 파일 구성](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/file-organization)
- [Python 패키지 의존성](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies)
- [Secrets 관리](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/secrets-management)
- [앱 관리와 로그](https://docs.streamlit.io/deploy/streamlit-community-cloud/manage-your-app)
