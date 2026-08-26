# langchain-teddynote 기능과 직접 구현

`langchain-teddynote`는 LangChain 한국어 튜토리얼에서 반복되는 코드를 편리하게 사용하도록 저자가 만든 유틸리티 패키지입니다. 이 문서는 **ch01~ch16에서 실제로 가져와 사용하는 저자 패키지의 기능**만 정리합니다.

각 항목은 다음 순서로 구성합니다.

1. 저자 패키지에서 제공하는 기능과 사용 형태
2. `langchain-teddynote` 없이 직접 작성하는 대체 코드

> 아래 대체 코드는 공식 저장소 코드를 복사한 것이 아니라 같은 목적을 달성하도록 독립적으로 작성한 교육용 구현입니다. LangChain, LangGraph, Kiwi, Pinecone, Tavily처럼 기능 자체에 필요한 원래 라이브러리는 계속 사용합니다.

## 1. 교재에서 사용하는 저자 패키지 소스

| 모듈 | 교재에서 사용하는 기능 | 역할 |
|---|---|---|
| `logging` | `logging.langsmith()` | LangSmith 추적용 환경 변수 설정 |
| `messages` | `stream_response()` | 모델의 스트리밍 청크를 즉시 출력하고 선택적으로 합쳐 반환 |
| `messages` | `AgentCallbacks`, `AgentStreamParser`, `stream_graph()` | 에이전트의 도구 호출·관찰·최종 답변과 LangGraph 스트림 출력 |
| `callbacks` | `StreamingCallback` | 모델이 생성하는 토큰을 콜백으로 실시간 출력 |
| `models` | `MultiModal` | 로컬 이미지나 URL을 멀티모달 메시지로 변환해 모델 호출 |
| `models` | `ChatPerplexity` | Perplexity API를 LangChain 채팅 모델처럼 사용 |
| `prompts` | `load_prompt()` | YAML 프롬프트 파일을 읽어 PromptTemplate 생성 |
| `prompts` | `CustomExampleSelector` | few-shot 예제 중 지정한 일부만 선택 |
| `translate` | `Translator` | DeepL API 번역 호출을 callable 객체로 감쌈 |
| `community.kiwi_tokenizer` | `KiwiTokenizer` | Kiwi 형태소 분석기로 한국어를 토큰화 |
| `korean` | `stopwords()` | 한국어 검색에서 제외할 불용어 목록 제공 |
| `document_loaders` | `HWPLoader` | HWP 5.x OLE 문서에서 텍스트를 추출해 Document로 반환 |
| `document_compressors` | `LLMChainExtractor`, `LLMChainFilter` | 질문과 관련된 문장만 추출하거나 관련 문서만 통과시킴 |
| `retrievers` | `KiwiBM25Retriever` | Kiwi 토큰을 사용하는 한국어 BM25 검색 |
| `retrievers` | `EnsembleRetriever`, `EnsembleMethod` | 여러 검색 결과를 RRF·CC 방식으로 결합 |
| `community.pinecone` | 인덱스·sparse encoder·upsert·삭제·hybrid retriever | Pinecone dense+sparse 하이브리드 검색의 반복 작업 단순화 |
| `tools.tavily` | `TavilySearch` | Tavily 검색과 결과 정리 |
| `tools` | `GoogleNews` | Google News RSS 검색 결과 조회 |
| `graphs` | `visualize_graph()` | LangGraph 구조를 이미지로 시각화 |
| `evaluator` | `GroundnessChecker`, `OpenAIRelevanceGrader` | 답변의 근거 충실성과 검색 문서 관련성 평가 |

## 2. LangSmith 추적 설정

### 저자 패키지 사용

```python
from langchain_teddynote import logging

logging.langsmith("my-project")
```

### 직접 구현

LangSmith 추적은 필요한 환경 변수를 직접 설정하면 됩니다.

```python
import os


def enable_langsmith(project_name: str) -> None:
    if not os.getenv("LANGSMITH_API_KEY"):
        raise RuntimeError("LANGSMITH_API_KEY가 설정되지 않았습니다.")

    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_PROJECT"] = project_name


enable_langsmith("my-project")
```

## 3. 모델 응답 스트리밍

### 저자 패키지 사용

```python
from langchain_teddynote.messages import stream_response

result = stream_response(llm.stream("질문"), return_output=True)
```

### 직접 구현

```python
from collections.abc import Iterable
from typing import Any


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return "" if content is None else str(content)


def print_stream(chunks: Iterable[Any], return_output: bool = False) -> str | None:
    parts: list[str] = []

    for chunk in chunks:
        text = _content_to_text(getattr(chunk, "content", chunk))
        if text:
            print(text, end="", flush=True)
            parts.append(text)

    print()
    return "".join(parts) if return_output else None


result = print_stream(llm.stream("질문"), return_output=True)
```

## 4. 스트리밍 콜백

### 저자 패키지 사용

```python
from langchain_teddynote.callbacks import StreamingCallback

llm = ChatOpenAI(streaming=True, callbacks=[StreamingCallback()])
```

### 직접 구현

```python
from typing import Any
from langchain_core.callbacks import BaseCallbackHandler


class PrintTokenCallback(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        print(token, end="", flush=True)


llm = ChatOpenAI(streaming=True, callbacks=[PrintTokenCallback()])
```

## 5. 멀티모달 이미지 호출

### 저자 패키지 사용

```python
from langchain_teddynote.models import MultiModal

multimodal = MultiModal(llm, system_prompt="이미지를 분석하세요.")
answer = multimodal.invoke("sample.png")
```

### 직접 구현

로컬 이미지는 Base64 data URL로, 웹 이미지는 URL 그대로 전달합니다.

```python
import base64
import mimetypes
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage


def image_source(path_or_url: str) -> str:
    if path_or_url.startswith(("http://", "https://")):
        return path_or_url

    path = Path(path_or_url)
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def ask_image(llm, image: str, question: str, system: str = "이미지를 분석하세요."):
    messages = [
        SystemMessage(content=system),
        HumanMessage(
            content=[
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {"url": image_source(image)}},
            ]
        ),
    ]
    return llm.invoke(messages)


answer = ask_image(llm, "sample.png", "이미지의 핵심 내용을 설명해 주세요.")
print(answer.content)
```

## 6. Perplexity 채팅 모델

### 저자 패키지 사용

```python
from langchain_teddynote.models import ChatPerplexity

llm = ChatPerplexity(model="sonar")
```

### 직접 구현

Perplexity가 제공하는 OpenAI 호환 endpoint를 `ChatOpenAI`에 지정합니다.

```python
import os
from langchain_openai import ChatOpenAI


llm = ChatOpenAI(
    model="sonar",
    api_key=os.environ["PERPLEXITY_API_KEY"],
    base_url="https://api.perplexity.ai",
)

answer = llm.invoke("최근 AI 에이전트 기술 동향을 출처와 함께 요약해 주세요.")
print(answer.content)
```

## 7. YAML 프롬프트 로드

### 저자 패키지 사용

```python
from langchain_teddynote.prompts import load_prompt

prompt = load_prompt("prompts/summary.yaml")
```

### 직접 구현

```python
from pathlib import Path
import yaml

from langchain_core.prompts import ChatPromptTemplate, PromptTemplate


def load_yaml_prompt(file_path: str):
    data = yaml.safe_load(Path(file_path).read_text(encoding="utf-8"))

    if "messages" in data:
        messages = [(item["role"], item["content"]) for item in data["messages"]]
        return ChatPromptTemplate.from_messages(messages)

    if "template" in data:
        return PromptTemplate.from_template(data["template"])

    raise ValueError("YAML에 messages 또는 template이 필요합니다.")


prompt = load_yaml_prompt("prompts/summary.yaml")
```

## 8. Few-shot 예제 선택

### 저자 패키지 사용

```python
from langchain_teddynote.prompts import CustomExampleSelector

selector = CustomExampleSelector(examples, k=3)
```

### 직접 구현

순서대로 일부만 선택하는 가장 단순한 selector입니다. 의미 기반 선택이 필요하면 LangChain의 `SemanticSimilarityExampleSelector`를 사용합니다.

```python
from typing import Any
from langchain_core.example_selectors.base import BaseExampleSelector


class FirstKExampleSelector(BaseExampleSelector):
    def __init__(self, examples: list[dict[str, Any]], k: int = 3):
        self.examples = list(examples)
        self.k = k

    def add_example(self, example: dict[str, Any]) -> None:
        self.examples.append(example)

    def select_examples(self, input_variables: dict[str, str]) -> list[dict[str, Any]]:
        return self.examples[: self.k]
```

## 9. DeepL 번역

### 저자 패키지 사용

```python
from langchain_teddynote.translate import Translator

translator = Translator(api_key, "EN", "KO")
translated = translator("hello")
```

### 직접 구현

```python
import deepl


class DeepLTranslator:
    def __init__(self, api_key: str, source_lang: str, target_lang: str):
        self.client = deepl.Translator(api_key)
        self.source_lang = source_lang
        self.target_lang = target_lang

    def __call__(self, text: str) -> str:
        result = self.client.translate_text(
            text,
            source_lang=self.source_lang,
            target_lang=self.target_lang,
        )
        return result.text


translator = DeepLTranslator(api_key, "EN", "KO")
print(translator("hello"))
```

## 10. Kiwi 한국어 토큰화와 불용어

### 저자 패키지 사용

```python
from langchain_teddynote.community.kiwi_tokenizer import KiwiTokenizer
from langchain_teddynote.korean import stopwords

tokens = KiwiTokenizer().tokenize("설비 상태를 점검합니다.")
```

### 직접 구현

저자 패키지의 불용어 목록을 복제하지 않고 업무 도메인에 맞는 목록을 직접 정의합니다.

```python
from kiwipiepy import Kiwi


class DomainKiwiTokenizer:
    def __init__(self, stop_words: set[str] | None = None):
        self.kiwi = Kiwi()
        self.stop_words = stop_words or set()

    def tokenize(self, text: str) -> list[str]:
        useful_tags = {"NNG", "NNP", "VV", "VA", "SL", "SN"}
        return [
            token.form
            for token in self.kiwi.tokenize(text)
            if token.tag in useful_tags and token.form not in self.stop_words
        ]


domain_stop_words = {"하다", "되다", "있다"}
tokenizer = DomainKiwiTokenizer(domain_stop_words)
print(tokenizer.tokenize("설비 상태를 점검하고 이상 여부를 확인합니다."))
```

## 11. HWP 문서 로드

### 저자 패키지 사용

```python
from langchain_teddynote.document_loaders import HWPLoader

documents = HWPLoader("sample.hwp").load()
```

### 직접 구현

다음 코드는 HWP 5.x OLE 형식의 `BodyText/Section*` 레코드에서 텍스트 태그를 읽는 최소 구현입니다. HWPX는 ZIP/XML 형식이므로 별도 로더가 필요합니다.

```python
import re
import struct
import unicodedata
import zlib

import olefile
from langchain_core.documents import Document


def _clean_hwp_text(text: str) -> str:
    text = re.sub(r"[\u4e00-\u9fff]+", "", text)
    return "".join(ch for ch in text if unicodedata.category(ch)[0] != "C")


def load_hwp(file_path: str) -> list[Document]:
    paragraphs: list[str] = []

    with olefile.OleFileIO(file_path) as hwp:
        entries = hwp.listdir()
        if ["FileHeader"] not in entries:
            raise ValueError("HWP 5.x OLE 파일이 아닙니다.")

        header = hwp.openstream("FileHeader").read()
        compressed = bool(header[36] & 1)
        sections = sorted(
            path for path in entries
            if len(path) == 2 and path[0] == "BodyText" and path[1].startswith("Section")
        )

        for section in sections:
            data = hwp.openstream(section).read()
            if compressed:
                data = zlib.decompress(data, -15)

            offset = 0
            while offset + 4 <= len(data):
                record = struct.unpack_from("<I", data, offset)[0]
                tag_id = record & 0x3FF
                size = (record >> 20) & 0xFFF
                payload = data[offset + 4 : offset + 4 + size]
                if tag_id == 67:
                    paragraphs.append(payload.decode("utf-16le", errors="ignore"))
                offset += 4 + size

    text = _clean_hwp_text("\n".join(paragraphs))
    return [Document(page_content=text, metadata={"source": file_path})]
```

## 12. LLM 문서 추출과 필터

### 저자 패키지 사용

```python
from langchain_teddynote.document_compressors import LLMChainExtractor, LLMChainFilter
```

### 직접 구현

질문과 문서를 프롬프트에 넣고, 추출 결과가 있는 문서만 새 `Document`로 만듭니다.

```python
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


extract_prompt = ChatPromptTemplate.from_messages([
    ("system", "문서에서 질문과 직접 관련된 문장만 원문 그대로 추출하세요. 없으면 빈 문자열을 반환하세요."),
    ("human", "질문: {question}\n\n문서:\n{document}"),
])


def extract_relevant(llm, documents: list[Document], question: str) -> list[Document]:
    chain = extract_prompt | llm | StrOutputParser()
    compressed: list[Document] = []

    for document in documents:
        text = chain.invoke({"question": question, "document": document.page_content}).strip()
        if text:
            compressed.append(Document(page_content=text, metadata=document.metadata))

    return compressed
```

문서 전체를 통과시킬지 판단하려면 구조화 출력을 사용합니다.

```python
from pydantic import BaseModel, Field


class Relevance(BaseModel):
    relevant: bool = Field(description="문서가 질문에 답하는 데 유용하면 true")


filter_prompt = ChatPromptTemplate.from_messages([
    ("system", "질문과 문서의 관련성을 판정하세요."),
    ("human", "질문: {question}\n\n문서:\n{document}"),
])


def filter_relevant(llm, documents: list[Document], question: str) -> list[Document]:
    chain = filter_prompt | llm.with_structured_output(Relevance)
    return [
        document
        for document in documents
        if chain.invoke({"question": question, "document": document.page_content}).relevant
    ]
```

## 13. Kiwi BM25 검색

### 저자 패키지 사용

```python
from langchain_teddynote.retrievers import KiwiBM25Retriever

retriever = KiwiBM25Retriever.from_documents(documents)
```

### 직접 구현

```python
from rank_bm25 import BM25Okapi
from langchain_core.documents import Document


class KiwiBM25:
    def __init__(self, documents: list[Document], tokenizer: DomainKiwiTokenizer, k: int = 4):
        self.documents = documents
        self.tokenizer = tokenizer
        self.k = k
        corpus = [tokenizer.tokenize(doc.page_content) for doc in documents]
        self.index = BM25Okapi(corpus)

    def invoke(self, query: str) -> list[Document]:
        tokens = self.tokenizer.tokenize(query)
        scores = self.index.get_scores(tokens)
        order = sorted(range(len(scores)), key=scores.__getitem__, reverse=True)
        return [self.documents[index] for index in order[: self.k]]


retriever = KiwiBM25(documents, tokenizer, k=4)
results = retriever.invoke("설비 이상 원인은?")
```

## 14. 여러 검색기의 RRF 결합

### 저자 패키지 사용

```python
from langchain_teddynote.retrievers import EnsembleMethod, EnsembleRetriever

retriever = EnsembleRetriever(
    retrievers=[dense_retriever, bm25_retriever],
    method=EnsembleMethod.RRF,
)
```

### 직접 구현

RRF는 각 검색기의 순위만 이용해 점수를 합산합니다.

```python
from collections import defaultdict
from langchain_core.documents import Document


def reciprocal_rank_fusion(
    result_lists: list[list[Document]],
    weights: list[float] | None = None,
    rank_constant: int = 60,
) -> list[Document]:
    weights = weights or [1.0] * len(result_lists)
    scores: dict[str, float] = defaultdict(float)
    documents: dict[str, Document] = {}

    for weight, results in zip(weights, result_lists):
        for rank, document in enumerate(results, start=1):
            key = f"{document.page_content}\n{sorted(document.metadata.items())}"
            documents[key] = document
            scores[key] += weight / (rank_constant + rank)

    ranked_keys = sorted(scores, key=scores.get, reverse=True)
    return [documents[key] for key in ranked_keys]


dense_results = dense_retriever.invoke(query)
keyword_results = bm25_retriever.invoke(query)
results = reciprocal_rank_fusion([dense_results, keyword_results], [0.6, 0.4])
```

## 15. Pinecone dense+sparse 하이브리드 검색

### 저자 패키지 사용

```python
from langchain_teddynote.community.pinecone import (
    PineconeKiwiHybridRetriever,
    create_index,
    create_sparse_encoder,
    fit_sparse_encoder,
    upsert_documents,
)
```

### 직접 구현

핵심 흐름은 dense 임베딩과 BM25 sparse 벡터를 같은 ID로 저장하고, 질의 시 두 점수를 가중 결합하는 것입니다.

```python
import os
from pinecone import Pinecone, ServerlessSpec
from pinecone_text.sparse import BM25Encoder


pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index_name = "hybrid-search"

if not pc.has_index(index_name):
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="dotproduct",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

index = pc.Index(index_name)
sparse_encoder = BM25Encoder()
sparse_encoder.fit([doc.page_content for doc in documents])

dense_vectors = embeddings.embed_documents([doc.page_content for doc in documents])
sparse_vectors = sparse_encoder.encode_documents([doc.page_content for doc in documents])

records = []
for number, (document, dense, sparse) in enumerate(
    zip(documents, dense_vectors, sparse_vectors)
):
    records.append({
        "id": str(number),
        "values": dense,
        "sparse_values": sparse,
        "metadata": {"text": document.page_content, **document.metadata},
    })

index.upsert(vectors=records, namespace="manual")
```

하이브리드 질의에서는 dense와 sparse 값에 각각 가중치를 곱합니다.

```python
def hybrid_query(query: str, alpha: float = 0.6, top_k: int = 5):
    dense = embeddings.embed_query(query)
    sparse = sparse_encoder.encode_queries(query)

    weighted_dense = [value * alpha for value in dense]
    weighted_sparse = {
        "indices": sparse["indices"],
        "values": [value * (1 - alpha) for value in sparse["values"]],
    }

    return index.query(
        namespace="manual",
        vector=weighted_dense,
        sparse_vector=weighted_sparse,
        top_k=top_k,
        include_metadata=True,
    )
```

삭제는 Pinecone SDK를 직접 호출합니다.

```python
index.delete(ids=["1", "2"], namespace="manual")
index.delete(filter={"category": {"$eq": "obsolete"}}, namespace="manual")
index.delete(delete_all=True, namespace="manual")
```

## 16. Tavily 웹 검색

### 저자 패키지 사용

```python
from langchain_teddynote.tools.tavily import TavilySearch

search = TavilySearch(max_results=5)
results = search.search("AI 에이전트 동향")
```

### 직접 구현

```python
import os
from tavily import TavilyClient


client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


def search_tavily(query: str, max_results: int = 5) -> list[dict]:
    response = client.search(
        query=query,
        max_results=max_results,
        search_depth="advanced",
        include_answer=False,
    )
    return [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "content": item.get("content", ""),
            "score": item.get("score"),
        }
        for item in response.get("results", [])
    ]
```

## 17. Google News RSS 검색

### 저자 패키지 사용

```python
from langchain_teddynote.tools import GoogleNews

news = GoogleNews().search_by_keyword("생성형 AI")
```

### 직접 구현

```python
from urllib.parse import quote_plus
import feedparser


def search_google_news(keyword: str, limit: int = 10) -> list[dict[str, str]]:
    url = (
        "https://news.google.com/rss/search"
        f"?q={quote_plus(keyword)}&hl=ko&gl=KR&ceid=KR:ko"
    )
    feed = feedparser.parse(url)
    return [
        {
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "published": entry.get("published", ""),
        }
        for entry in feed.entries[:limit]
    ]
```

## 18. LangGraph 시각화와 스트리밍

### 저자 패키지 사용

```python
from langchain_teddynote.graphs import visualize_graph
from langchain_teddynote.messages import stream_graph

visualize_graph(graph)
stream_graph(graph, inputs, config)
```

### 직접 구현

```python
from pathlib import Path


def save_graph_png(compiled_graph, file_path: str = "graph.png") -> None:
    png = compiled_graph.get_graph().draw_mermaid_png()
    Path(file_path).write_bytes(png)


def print_graph_stream(compiled_graph, inputs: dict, config: dict | None = None) -> None:
    for message, metadata in compiled_graph.stream(
        inputs,
        config=config,
        stream_mode="messages",
    ):
        text = _content_to_text(getattr(message, "content", ""))
        if text:
            node = metadata.get("langgraph_node", "unknown")
            print(f"[{node}] {text}", end="", flush=True)
    print()
```

## 19. 답변 근거성과 문서 관련성 평가

### 저자 패키지 사용

```python
from langchain_teddynote.evaluator import GroundnessChecker, OpenAIRelevanceGrader
```

### 직접 구현

하나의 구조화 출력 모델로 두 평가를 모두 구성할 수 있습니다.

```python
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate


class BinaryGrade(BaseModel):
    verdict: Literal["yes", "no"] = Field(description="평가 통과 여부")
    reason: str = Field(description="판정 이유")


def build_grader(llm, criterion: str):
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{criterion} yes 또는 no로 엄격히 평가하고 이유를 설명하세요."),
        ("human", "기준 자료:\n{context}\n\n평가 대상:\n{target}"),
    ])
    return prompt | llm.with_structured_output(BinaryGrade)


groundedness_grader = build_grader(
    llm,
    "답변의 모든 핵심 주장이 기준 자료에서 뒷받침되는지",
)
relevance_grader = build_grader(
    llm,
    "검색 문서가 사용자의 질문에 답하는 데 직접 관련되는지",
)

groundedness = groundedness_grader.invoke({"context": context, "target": answer})
relevance = relevance_grader.invoke({"context": question, "target": document.page_content})
```

## 20. Agent 도구 호출 스트림 파싱

### 저자 패키지 사용

```python
from langchain_teddynote.messages import AgentCallbacks, AgentStreamParser
```

### 직접 구현

현행 LangGraph에서는 `stream_mode`으로 이벤트 종류를 정하고 청크를 직접 분기할 수 있습니다.

```python
def print_agent_events(agent, inputs: dict, config: dict | None = None) -> None:
    for part in agent.stream(inputs, config=config, stream_mode="updates"):
        for node_name, update in part.items():
            print(f"\n[{node_name}]")

            for message in update.get("messages", []):
                if getattr(message, "tool_calls", None):
                    for call in message.tool_calls:
                        print(f"도구 호출: {call['name']}({call['args']})")
                elif getattr(message, "type", "") == "tool":
                    print(f"도구 결과: {message.content}")
                elif getattr(message, "content", None):
                    print(_content_to_text(message.content))
```

## 21. 어떤 방식을 선택할까?

| 상황 | 권장 방식 |
|---|---|
| 교재 예제를 빠르게 실행 | `langchain-teddynote` 사용 |
| 기능의 내부 원리를 학습 | 이 문서의 직접 구현부터 작성 |
| 운영 서비스에서 작은 기능 하나만 필요 | 직접 구현하거나 공식 SDK를 직접 호출 |
| HWP·한국어 BM25·Pinecone hybrid처럼 구현량이 큼 | 패키지를 사용하되 버전 고정과 테스트 추가 |
| 장기간 유지보수·감사가 중요 | 직접 구현하고 입력·출력·예외·보안 정책을 명시 |

패키지를 제거하는 것 자체가 목적은 아닙니다. 중요한 점은 편의 함수 아래에서 어떤 공식 API가 호출되고 데이터가 어떻게 변환되는지 이해하는 것입니다.

## 참고 자료

- [langchain-teddynote 공식 저장소](https://github.com/teddylee777/langchain-teddynote)
- [공식 README와 사용 예제](https://github.com/teddylee777/langchain-teddynote#readme)
- [패키지 소스 디렉터리](https://github.com/teddylee777/langchain-teddynote/tree/main/langchain_teddynote)
- [PyPI 배포 페이지](https://pypi.org/project/langchain-teddynote/)

> 소스 확인일: 2026-08-26. 패키지와 LangChain/LangGraph API는 계속 변경될 수 있으므로 실제 프로젝트에서는 버전을 고정하고 테스트해야 합니다.
