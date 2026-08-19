# Supabase PostgreSQL 직접 연결

## 실습 목표

- Data API와 PostgreSQL 직접 연결의 차이를 설명한다.
- Supabase Dashboard에서 적절한 연결 문자열을 선택한다.
- psycopg로 Parameterized Query와 Transaction을 실행한다.

## 연결 방식 선택

| 방식 | 용도 | 일반적인 Port |
|---|---|---:|
| Direct | Migration, 관리도구, 장기 연결 | 5432 |
| Session Pooler | IPv4 환경의 지속 Backend | 5432 |
| Transaction Pooler | Serverless·짧은 연결 | 6543 |
| Data API | Client Library와 RLS 기반 접근 | HTTPS |

Dashboard 상단의 **Connect**에서 현재 프로젝트에 맞는 문자열을 복사합니다. Direct 연결은 네트워크의 IPv6 지원 여부도 확인합니다.

## 1. 환경변수

`.env`:

```text
SUPABASE_DB_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require
```

Database Password와 연결 문자열은 서버 전용 비밀정보입니다.

## 2. psycopg 설치

```powershell
python -m pip install "psycopg[binary]" psycopg-pool python-dotenv
```

## Try 1 — 연결과 단일 Query

```python
import os

import psycopg
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("SUPABASE_DB_URL")
if not database_url:
    raise RuntimeError("SUPABASE_DB_URL을 설정하세요.")

with psycopg.connect(database_url) as connection:
    with connection.cursor() as cursor:
        cursor.execute("select current_database(), current_user, now()")
        print(cursor.fetchone())
```

Context Manager를 벗어나면 Cursor와 Connection이 정리됩니다.

## Try 2 — 안전한 CRUD

```python
def create_note(database_url: str, title: str, content: str) -> int:
    sql = """
        insert into public.notes (title, content)
        values (%s, %s)
        returning id
    """
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql, (title, content))
            note_id = cursor.fetchone()[0]
        connection.commit()
    return note_id


def list_notes(database_url: str, limit: int = 10) -> list[tuple]:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "select id, title, created_at from public.notes order by id desc limit %s",
                (limit,),
            )
            return cursor.fetchall()
```

값을 SQL 문자열에 직접 이어 붙이지 않고 두 번째 인자로 전달해 SQL Injection을 방지합니다.

## Transaction 실패 확인

```python
try:
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "insert into public.notes (title, content) values (%s, %s)",
                ("정상 제목", "첫 작업"),
            )
            cursor.execute(
                "insert into public.notes (title, content) values (%s, %s)",
                (None, "실패 작업"),
            )
except psycopg.Error as error:
    print("transaction rolled back:", error.sqlstate)
```

두 번째 Query가 실패하면 Transaction 전체가 Rollback됩니다.

## 운영 체크

- 연결 문자열은 로그에 출력하지 않습니다.
- Web 요청마다 무제한 Connection을 만들지 않고 Pool을 사용합니다.
- Transaction Pooler에서는 Prepared Statement 제한을 확인합니다.
- 연결·Query 시간 제한과 재시도 정책을 둡니다.

## 완료 기준

- [ ] Direct·Session·Transaction 연결의 용도를 구분한다.
- [ ] SSL 연결 문자열을 환경변수에서 읽는다.
- [ ] Parameterized Query로 CRUD를 실행한다.
- [ ] Commit과 Rollback을 설명할 수 있다.

