# ch11~ch16 사용 패키지

`ch11.md`부터 `ch16.md`까지의 코드에서 직접 import하거나 설치 명령으로 요구하는 패키지를 정리했습니다. Python 표준 라이브러리와 아래 패키지가 자동 설치하는 일반 하위 의존성은 제외했습니다.

```text
# 환경 설정
python-dotenv                  # .env 파일에서 API 키와 환경 변수 로드

# LangChain 핵심 구성
langchain                     # LLM 애플리케이션, 체인, 검색기, 에이전트 구성
langchain-core                # 프롬프트, 문서, Runnable 등 핵심 인터페이스
langchain-classic             # 기존 체인, 검색기, 메모리 등 호환 기능
langchain-community           # 커뮤니티 문서 로더, 도구, 벡터 저장소 연동
langchain-text-splitters      # 문서를 검색용 청크로 분할
langchain-experimental        # 실험 단계의 체인, 임베딩, 에이전트 기능
langchain-teddynote           # 교재의 로깅, 검색기, 평가 등 편의 기능

# 모델 및 임베딩 서비스 연동
langchain-openai              # OpenAI 채팅 모델과 임베딩 연동
langchain-anthropic           # Anthropic Claude 모델 연동
langchain-cohere              # Cohere 모델과 Rerank API 연동
langchain-google-genai        # Google Gemini 모델 연동
langchain-huggingface         # Hugging Face 모델과 임베딩 연동
langchain-ollama              # 로컬 Ollama 모델 연동
langchain-upstage             # Upstage 모델, 임베딩, Groundedness API 연동
openai                        # OpenAI API 공식 클라이언트
cohere                        # Cohere 생성 및 재순위화 API 클라이언트
huggingface-hub               # Hugging Face Hub 모델 다운로드와 관리
transformers                  # Transformer 모델 로드와 추론
sentence-transformers         # 문장 임베딩과 Cross-Encoder 재순위화
ollama                        # 로컬 Ollama 모델 서버 호출

# 에이전트와 외부 도구
langgraph                     # 상태 그래프 기반 에이전트 워크플로 구성
tavily-python                 # Tavily 웹 검색 API 호출

# 벡터 저장소와 검색·재순위화
faiss-cpu                     # CPU 기반 벡터 유사도 검색
chromadb                      # Chroma 벡터 데이터베이스 실행
rank-bm25                     # BM25 키워드 검색기 실행
flashrank                     # 경량 모델로 검색 결과 재순위화
fastembed                     # ONNX 기반 경량 텍스트 임베딩 생성

# 문서와 웹 데이터 처리
beautifulsoup4                # HTML 파싱과 웹 페이지 본문 추출
requests                      # 웹 API와 파일을 HTTP로 요청
httpx                         # 동기·비동기 HTTP 요청 및 스트리밍
pypdf                         # PyPDFLoader의 PDF 텍스트 추출
pdfplumber                    # PDFPlumberLoader의 PDF 텍스트와 표 추출
unstructured[all-docs]        # PDF와 Office 문서를 텍스트·표·이미지 요소로 분리
lxml                          # HTML·XML 고속 파싱과 Unstructured 문서 처리 지원
pillow                        # 이미지 읽기, 변환, 멀티모달 데이터 처리

# 오디오와 동영상 처리
pytube                        # YouTube 동영상 정보 조회와 다운로드
moviepy                       # 동영상에서 오디오 추출 및 미디어 편집
pydub                         # 오디오 구간 분석, 분할, 형식 변환

# 데이터 분석·시각화
numpy                         # 배열, 벡터, 임베딩 수치 연산
pandas                        # 표 형태 데이터 가공과 평가 결과 분석
scikit-learn                  # 코사인 유사도와 머신러닝 유틸리티
matplotlib                    # 그래프와 이미지 시각화
seaborn                       # 통계 그래프 시각화
umap-learn                    # 고차원 임베딩을 2D·3D로 차원 축소
datasets                      # Hugging Face 평가 데이터셋 로드와 관리
tqdm                          # 반복 처리와 번역 작업의 진행률 표시
tiktoken                      # OpenAI 모델 기준 토큰 수 계산

# 데이터베이스와 실행 구조
redis                         # 대화 기록을 Redis에 영구 저장
SQLAlchemy                    # SQLDatabase에서 관계형 데이터베이스 연결·질의
grandalf                      # LCEL 실행 그래프의 계층형 레이아웃 생성

# RAG 평가
ragas                         # RAG의 충실성·관련성·정확성 평가
langsmith                     # LLM 실행 추적, 데이터셋, 실험 및 평가 관리
rouge-score                   # 생성 문장과 기준 문장의 ROUGE 점수 계산
nltk                          # BLEU·METEOR 평가와 WordNet 데이터 사용
kiwipiepy                     # 한국어 형태소 분석 기반 ROUGE 토큰화
deepl                         # 평가 데이터의 DeepL 자동 번역

# 노트북 실행과 검증
ipython                       # Jupyter의 display 등 대화형 출력 기능
pydantic                      # 타입 힌트 기반 데이터 모델과 스키마 검증
```

> 참고: `ch16.md`의 `myrag`는 PyPI 패키지가 아니라 교재에서 별도로 제공해야 하는 로컬 `myrag.py` 모듈이므로 설치 목록에서 제외했습니다. 오디오·동영상 예제는 시스템에 `ffmpeg` 실행 파일이 필요할 수 있습니다.
