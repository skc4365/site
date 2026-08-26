# Book 3 CH 01~11 사용 패키지

`ch_01_교재소스.md`부터 `ch_11_교재소스.md`까지의 코드와 실행 구조에서 직접 사용하는 외부 패키지를 정리했습니다. Python 표준 라이브러리와 아래 패키지가 자동으로 설치하는 일반 하위 의존성은 제외했습니다.

```text
# 환경 설정
python-dotenv                  # .env 파일에서 OpenAI·Tavily 등의 API 키와 환경 변수 로드

# LangChain과 모델 연동
langchain                     # LLM 애플리케이션, 도구, 검색기, 에이전트 구성
langchain-core                # 메시지, ToolMessage, 도구 등 LangChain 핵심 인터페이스
langchain-openai              # OpenAI 채팅 모델과 임베딩을 LangChain에 연결

# LangGraph 에이전트 워크플로
langgraph                     # 상태 그래프, Command, Send, 체크포인트, 메모리 저장소 구성
typing-extensions             # LangGraph State 정의에 사용하는 TypedDict 등 최신 타입 기능 제공
pydantic                      # 도구 입력, Agent 설정, A2A 메시지 등의 데이터 모델 검증

# 검색과 RAG
langchain-tavily              # Tavily 웹 검색을 LangChain Tool로 연결
langchain-chroma              # Chroma 벡터 저장소를 LangChain 검색기로 연결

# MCP 연동
mcp                           # FastMCP 서버, MCP ClientSession, stdio 전송 구현
langchain-mcp-adapters        # MCP Prompt와 Tool을 LangChain Agent 형식으로 변환

# A2A 연동
a2a-sdk                       # Agent Card, AgentExecutor, A2A Client·Server 프로토콜 구현
httpx                         # A2A Agent Card 조회와 비동기 HTTP 메시지 전송

# API 서버 실행
fastapi                       # Agent와 오케스트레이터의 HTTP API 작성
uvicorn                       # FastAPI·A2A ASGI 애플리케이션 실행 서버
```

> 참고: `tools`, `network_agent`는 설치 패키지가 아니라 교재 프로젝트 내부의 로컬 Python 모듈입니다. 실행하려면 해당 `.py` 파일과 패키지 디렉터리가 함께 있어야 합니다.

> `ch11`에서 설명하는 Supabase와 Google Drive 연동은 문서에 구체적인 import문이나 SDK 코드가 제시되지 않아 목록에 임의로 추가하지 않았습니다. 실제 구현 파일을 사용할 때는 해당 프로젝트의 잠금 파일 또는 requirements를 함께 확인해야 합니다.
