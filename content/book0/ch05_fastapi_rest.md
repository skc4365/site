# FastAPI RESTful API 설계

## 수업 목표

- HTTP Method와 상태 코드를 설명한다.
- Pydantic 모델을 FastAPI 요청·응답에 연결한다.
- CRUD API를 계층별로 나눈다.
- `HTTPException`으로 오류 응답을 만든다.

## 먼저 보는 구조

```text
HTTP 요청 → Route → Pydantic 검증 → Service → 저장소 → JSON 응답
```

## 1. 설치와 실행

```powershell
python -m pip install fastapi uvicorn
python -m uvicorn main:app --reload
```

확인 주소:

```text
API 문서: http://127.0.0.1:8000/docs
```

## 2. 첫 API

```python
from fastapi import FastAPI

app = FastAPI(title="Summary API", version="1.0.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

`async def` Endpoint에서는 비동기 DB·HTTP Client를 `await`할 수 있습니다.

## 3. 요청·응답 모델

```python
from datetime import datetime, timezone

from pydantic import BaseModel, Field


class SummaryCreate(BaseModel):
    text: str = Field(min_length=2, max_length=500)
    max_length: int = Field(default=100, ge=10, le=200)


class Summary(BaseModel):
    id: int
    text: str
    summary: str
    created_at: datetime
```

## 4. CRUD API

```python
from fastapi import FastAPI, HTTPException, status

app = FastAPI(title="Summary API")
database: dict[int, Summary] = {}
next_id = 1


@app.post("/summaries", response_model=Summary, status_code=status.HTTP_201_CREATED)
async def create_summary(payload: SummaryCreate) -> Summary:
    global next_id
    item = Summary(
        id=next_id,
        text=payload.text,
        summary=payload.text[: payload.max_length],
        created_at=datetime.now(timezone.utc),
    )
    database[item.id] = item
    next_id += 1
    return item


@app.get("/summaries", response_model=list[Summary])
async def list_summaries() -> list[Summary]:
    return list(database.values())


@app.get("/summaries/{summary_id}", response_model=Summary)
async def get_summary(summary_id: int) -> Summary:
    item = database.get(summary_id)
    if item is None:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")
    return item


@app.delete("/summaries/{summary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_summary(summary_id: int) -> None:
    if database.pop(summary_id, None) is None:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")
```

메모리 딕셔너리는 학습용입니다. 서버 재시작 시 사라지므로 이후 DB Repository로 교체합니다.

## REST 설계 기준

| 목적 | Method | 경로 | 정상 상태 |
|---|---|---|---:|
| 목록 조회 | GET | `/summaries` | 200 |
| 한 건 조회 | GET | `/summaries/{id}` | 200 |
| 생성 | POST | `/summaries` | 201 |
| 수정 | PUT/PATCH | `/summaries/{id}` | 200 |
| 삭제 | DELETE | `/summaries/{id}` | 204 |

## Try — Swagger UI로 확인

1. `/docs`를 엽니다.
2. POST `/summaries`로 데이터를 생성합니다.
3. GET `/summaries/{id}`로 조회합니다.
4. 존재하지 않는 ID를 조회해 404를 확인합니다.
5. DELETE 후 다시 조회합니다.

## 실습 과제

1. `PATCH /summaries/{id}`를 추가합니다.
2. 목록에 `limit` Query Parameter를 추가합니다.
3. Route의 데이터 처리 코드를 `SummaryService` 클래스로 이동합니다.

## 강사 체크포인트

- Pydantic 검증 실패 422와 존재하지 않는 자원 404를 구분합니다.
- HTTP Method와 함수 이름이 아니라 자원의 의미로 경로를 설계합니다.
- `--reload`는 개발용이며 운영 실행 옵션이 아님을 설명합니다.

## 완료 기준

- [ ] GET·POST·PATCH·DELETE의 역할을 구분할 수 있다.
- [ ] Pydantic 요청·응답 모델을 Route에 연결할 수 있다.
- [ ] Swagger UI에서 정상·오류 흐름을 시험할 수 있다.

