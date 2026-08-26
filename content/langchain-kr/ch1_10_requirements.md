# ch01~ch10 사용 패키지

`ch01.md`부터 `ch10.md`까지의 코드에서 직접 import하거나 설치 명령으로 요구하는 패키지를 정리했습니다. Python 표준 라이브러리와 아래 패키지가 자동으로 설치하는 하위 의존성은 제외했습니다.

```text
# 환경 설정
python-dotenv                  # .env 파일에서 API 키와 환경 변수 로드

# LangChain 핵심 구성
langchain                     # LLM 애플리케이션, 체인, 검색기, 에이전트 구성
langchain-core                # 프롬프트, 문서, Runnable 등 LangChain 핵심 인터페이스
langchain-classic             # 기존 체인, 검색기, 메모리 등 호환 기능
langchain-community           # 커뮤니티 문서 로더, 벡터 저장소, 모델 연동
langchain-text-splitters      # 문서를 검색용 청크로 분할
langchain-experimental        # OpenCLIP 등 실험 단계 기능 제공
langchain-teddynote           # 교재의 로깅, 검색기, 문서 압축 등 편의 기능

# LLM 및 임베딩 서비스 연동
langchain-openai              # OpenAI 채팅 모델과 임베딩 연동
langchain-anthropic           # Anthropic Claude 모델 연동
langchain-cohere              # Cohere 모델과 재순위화 기능 연동
langchain-google-genai        # Google Gemini 모델 연동
langchain-huggingface         # Hugging Face 모델과 임베딩 연동
langchain-ollama              # 로컬 Ollama 모델 연동
langchain-together            # Together AI 모델 API 연동
langchain-upstage             # Upstage Solar, 임베딩, 문서 분석 API 연동
openai                        # OpenAI API 공식 클라이언트
anthropic                     # Anthropic API 공식 클라이언트
cohere                        # Cohere API 공식 클라이언트
google-generativeai           # google.generativeai 모듈과 Gemini 파일 API 사용
huggingface-hub               # Hugging Face Hub 모델 다운로드와 관리
ollama                        # 로컬 Ollama 서버 호출

# 로컬 모델 및 임베딩
transformers                  # Hugging Face Transformer 모델 로드와 추론
sentence-transformers         # 문장 및 문서 임베딩 생성
FlagEmbedding                 # BGE-M3 기반 dense·sparse·multi-vector 임베딩 생성
llama-cpp-python              # GGUF 형식 Llama 계열 모델을 로컬 CPU/GPU에서 실행
gpt4all                       # GPT4All 로컬 언어 모델과 임베딩 실행
open-clip-torch               # 이미지와 텍스트의 CLIP 임베딩 생성
torch                         # 딥러닝 모델의 텐서 연산과 추론 기반

# 벡터 저장소와 검색
faiss-cpu                     # CPU 기반 벡터 유사도 검색 및 FAISS 저장소 사용
chromadb                      # Chroma 벡터 데이터베이스 실행
langchain-chroma              # Chroma와 LangChain 연동
pinecone                      # Pinecone 관리형 벡터 데이터베이스 연동
rank-bm25                     # BM25 키워드 검색기 실행

# 문서 및 웹 데이터 로딩
beautifulsoup4                # HTML 파싱과 웹 페이지 본문 추출
requests                      # 웹 API와 파일을 HTTP로 요청
pypdf                         # PyPDFLoader의 PDF 텍스트 추출
pymupdf                       # PyMuPDFLoader의 PDF 고속 파싱과 렌더링
pdfplumber                    # PDFPlumberLoader의 PDF 텍스트와 표 추출
rapidocr-onnxruntime          # PDF 이미지에서 OCR로 글자 인식
unstructured                 # PDF, HTML, Office 문서를 구조화된 요소로 분리
openpyxl                      # Excel XLSX 문서 읽기
docx2txt                      # Word DOCX 문서의 텍스트 추출
python-pptx                   # PowerPoint PPTX 문서 읽기
arxiv                         # arXiv 논문 검색과 다운로드

# LlamaIndex 문서 처리
llama-index-core              # LlamaIndex의 문서, 노드, 인덱스 핵심 기능
llama-index-readers-file      # LlamaIndex의 파일 형식별 문서 로더
llama-parse                   # LlamaParse API를 이용한 복잡한 문서 파싱

# 한국어 및 자연어 처리
nltk                          # 문장과 단어 토큰화 등 자연어 처리
spacy                         # 언어 모델 기반 토큰화와 문장 분리
konlpy                        # Kkma, Okt, Komoran, Hannanum 한국어 형태소 분석
kiwipiepy                     # Kiwi 한국어 형태소 분석과 토큰화

# 데이터 분석과 시각화
numpy                         # 배열과 벡터 수치 연산
pandas                        # 표 형태 데이터 가공과 결과 확인
scikit-learn                  # 머신러닝 유틸리티와 코사인 유사도 계산
matplotlib                    # 그래프와 이미지 시각화
datasets                      # Hugging Face 데이터셋 스트리밍과 전처리
pillow                        # PIL 모듈을 통한 이미지 읽기와 변환
tqdm                          # 반복 처리 진행률 표시

# 오디오 및 동영상 처리
pytube                        # YouTube 동영상 정보 조회와 다운로드
moviepy                       # 동영상에서 오디오 추출 및 미디어 편집
pydub                         # 오디오 구간 분석, 분할, 형식 변환

# 노트북 실행 지원
ipython                       # Jupyter에서 display 등 대화형 출력 기능 제공
nest-asyncio                  # 실행 중인 Jupyter 이벤트 루프에서 비동기 코드 재실행

# 데이터 검증
pydantic                      # 타입 힌트 기반 입력·출력 데이터 모델 검증
```

> 참고: 오디오·동영상 예제는 시스템에 `ffmpeg` 실행 파일이 별도로 필요할 수 있으며, KoNLPy의 일부 분석기는 Java 실행 환경이 필요합니다.
