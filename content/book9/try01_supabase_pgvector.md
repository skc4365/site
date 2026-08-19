# Supabase pgvector 의미 검색

## 실습 목표

- Embedding과 Vector 유사도를 설명한다.
- Supabase PostgreSQL에서 pgvector 확장을 활성화한다.
- Vector를 저장하고 Cosine Similarity로 검색한다.
- RPC 함수와 Python Client를 연결한다.

## 먼저 보는 구조

```text
문서 → Embedding Model → Vector → PostgreSQL pgvector

질문 → 같은 Model → Query Vector → 유사도 검색 → 관련 문서
```

문서와 질문은 반드시 같은 Embedding Model과 같은 차원을 사용해야 합니다.

## 1. pgvector 활성화

SQL Editor:

```sql
create extension if not exists vector with schema extensions;
```

## 2. Vector Table

API 비용 없이 구조를 확인하도록 3차원 학습용 Vector를 사용합니다.

```sql
create table public.documents (
  id bigint generated always as identity primary key,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(3) not null
);

alter table public.documents enable row level security;

create policy "lesson can read documents"
on public.documents for select
to anon
using (true);

grant select on public.documents to anon;
```

실제 서비스에서는 사용하는 Embedding Model의 차원으로 `vector(3)`을 바꿉니다.

## 3. 샘플 Vector 저장

```sql
insert into public.documents (content, metadata, embedding) values
  ('파이썬 비동기 프로그래밍', '{"category":"python"}', '[0.9, 0.1, 0.0]'),
  ('FastAPI REST API',          '{"category":"api"}',    '[0.7, 0.3, 0.1]'),
  ('PostgreSQL 벡터 검색',      '{"category":"database"}','[0.1, 0.2, 0.9]');
```

## 4. SQL에서 유사도 확인

```sql
select
  id,
  content,
  1 - (embedding <=> '[0.8, 0.2, 0.0]'::extensions.vector(3)) as similarity
from public.documents
order by embedding <=> '[0.8, 0.2, 0.0]'::extensions.vector(3)
limit 2;
```

`<=>`는 Cosine Distance입니다. `1 - distance`로 바꾸면 값이 클수록 유사하다고 읽을 수 있습니다.

## 5. RPC 검색 함수

Data API는 pgvector 연산자를 직접 표현하기 어려우므로 SQL 함수로 감싸 `rpc()`로 호출합니다.

```sql
create or replace function public.match_documents(
  query_embedding extensions.vector(3),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where 1 - (documents.embedding <=> query_embedding) >= match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_documents(
  extensions.vector, float, int
) to anon;
```

## Try — Python에서 의미 검색

```python
query_vector = [0.8, 0.2, 0.0]

response = supabase.rpc(
    "match_documents",
    {
        "query_embedding": query_vector,
        "match_threshold": 0.5,
        "match_count": 3,
    },
).execute()

for document in response.data:
    print(document["content"], round(document["similarity"], 3))
```

## Vector Index

데이터가 많아지면 HNSW Index를 검토합니다.

```sql
create index documents_embedding_hnsw
on public.documents
using hnsw (embedding vector_cosine_ops);
```

작은 학습 데이터에서는 Index 효과가 거의 없습니다. 먼저 정확도를 확인하고 실제 데이터 규모에서 실행계획과 지연시간을 측정합니다.

## 실습 과제

1. Query Vector를 바꾸고 순위 변화를 기록합니다.
2. `metadata->>'category'` 조건을 검색 함수에 추가합니다.
3. Threshold를 0.3·0.6·0.9로 바꾸고 결과 수를 비교합니다.
4. 실제 Embedding Model을 선택하고 차원·모델명을 metadata에 기록합니다.

## 완료 기준

- [ ] Vector 차원과 Embedding Model의 관계를 설명한다.
- [ ] Cosine Distance와 Similarity를 구분한다.
- [ ] SQL 함수와 Python `rpc()`로 검색했다.
- [ ] RLS·함수 권한·metadata 필터를 확인했다.
