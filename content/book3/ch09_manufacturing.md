# Chapter 09 쉬운 제조 실습 — 데이터 기능을 별도 프로그램으로 나누기

## 쉬운 말

| 기술 용어 | 쉬운 표현 |
|---|---|
| MCP Server | 기능을 제공하는 프로그램 |
| MCP Client | 기능을 요청하는 연결부 |
| Host | 도우미를 실행하는 메인 프로그램 |
| Transport | 두 프로그램이 대화하는 방법 |

## 나누기 전

```text
[도우미 프로그램]
  ├─ 질문 처리
  ├─ 기계 데이터 읽기
  └─ 안내서 검색
```

## 나눈 후

```text
[도우미 프로그램]
  └─ MCP 연결부
       ├→ [기계 데이터 기능 프로그램]
       └→ [안내서 기능 프로그램]
```

## 쉬운 MCP 서버

```python
from mcp.server.fastmcp import FastMCP

server = FastMCP("MachineDataServer")


@server.tool()
def read_machine(machine_id: str) -> dict:
    """연습용 기계 데이터를 읽습니다."""
    return {
        "machine_id": machine_id,
        "made_count": 100,
        "bad_count": 3,
        "source": "연습 데이터",
    }


if __name__ == "__main__":
    server.run(transport="stdio")
```

## 실습 순서

1. `read_machine()` 함수를 직접 실행합니다.
2. MCP 서버에 기능이 보이는지 확인합니다.
3. MCP Client에서 기능을 직접 호출합니다.
4. 그다음 도우미에 연결합니다.
5. 서버를 끄고 오류 메시지를 확인합니다.

## 왜 나누는가?

좋은 이유:

- 데이터 기능을 여러 도우미가 함께 사용한다.
- 데이터 접근 권한을 따로 관리해야 한다.
- 데이터 담당 팀이 기능 프로그램을 별도로 관리한다.

나쁜 이유:

- 단지 MCP를 써 보고 싶어서 나눈다.
- 같은 사람이 같은 컴퓨터에서 관리하는 작은 함수다.

## 완료 기준

- [ ] MCP Server와 Client를 쉬운 말로 설명한다.
- [ ] 도우미 없이 기능을 직접 시험했다.
- [ ] 서버가 꺼졌을 때 안전하게 오류를 반환한다.
- [ ] 별도 프로그램으로 나눌 이유를 설명한다.

