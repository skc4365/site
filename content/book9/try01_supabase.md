# Supabase 시작하기

## 실습 목표

- Supabase 프로젝트와 PostgreSQL의 관계를 설명한다.
- Python Client를 환경변수로 초기화한다.
- Table 생성·조회·추가를 실행한다.
- 공개 키, 서버 키와 RLS의 책임을 구분한다.

## 먼저 보는 구조

```text
Python App → Supabase Data API → PostgreSQL
                  ├→ Auth
                  ├→ Storage
                  └→ Realtime
```

Supabase 프로젝트마다 실제 PostgreSQL Database가 제공됩니다. Python Client는 Data API를 사용해 Database 기능에 접근합니다.

## 1. 프로젝트 준비

1. Supabase Dashboard에서 새 프로젝트를 만듭니다.
2. Project URL과 공개용 API Key를 확인합니다.
3. SQL Editor를 엽니다.

`.env`:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

`.gitignore`:

```text
.env
.venv/
__pycache__/
```

Service Role Key는 RLS를 우회할 수 있으므로 브라우저·교안·Git에 넣지 않습니다.

## 2. 테이블과 RLS 만들기

SQL Editor:

```sql
create table public.notes (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 100),
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "lesson can read notes"
on public.notes for select
to anon
using (true);

create policy "lesson can insert notes"
on public.notes for insert
to anon
with check (char_length(title) between 1 and 100);

grant select, insert, update, delete on public.notes to anon;
grant usage, select on sequence public.notes_id_seq to anon;
```

학습용 정책입니다. 사용자별 데이터라면 `auth.uid()`와 소유자 컬럼을 이용해 행을 분리해야 합니다.

## 3. Python Client 설치·연결

```powershell
python -m pip install supabase python-dotenv
```

```python
import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if not url or not key:
    raise RuntimeError("SUPABASE_URL과 SUPABASE_KEY를 확인하세요.")

supabase: Client = create_client(url, key)
```

## Try — 추가하고 조회하기

```python
inserted = (
    supabase.table("notes")
    .insert({"title": "첫 메모", "content": "Supabase 연결 성공"})
    .execute()
)
print("inserted:", inserted.data)

selected = (
    supabase.table("notes")
    .select("id,title,content,created_at")
    .order("id", desc=True)
    .limit(10)
    .execute()
)

for note in selected.data:
    print(note["id"], note["title"])
```

## 수정과 삭제

```python
note_id = inserted.data[0]["id"]

supabase.table("notes").update(
    {"content": "수정된 내용"}
).eq("id", note_id).execute()

supabase.table("notes").delete().eq("id", note_id).execute()
```

`update()`와 `delete()`에는 의도한 행만 선택하도록 필터를 반드시 붙입니다.

## 실습 과제

1. 제목으로 검색하는 `ilike` Query를 추가합니다.
2. 목록을 5개씩 페이지로 나눕니다.
3. insert 정책을 제거한 뒤 오류를 확인하고 RLS의 역할을 설명합니다.

## 완료 기준

- [ ] URL과 Key를 `.env`에서 읽는다.
- [ ] Table 생성·추가·조회·수정·삭제를 실행했다.
- [ ] 공개 Key와 Service Role Key의 차이를 설명할 수 있다.
- [ ] RLS가 활성화된 상태에서 Policy를 적용했다.
