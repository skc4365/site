from pathlib import Path


# 이 파이썬 파일을 기준으로 외부 Markdown 파일의 위치를 찾습니다.
prompt_path = Path(__file__).parent / "prompts" / "system.md"
system_prompt = prompt_path.read_text(encoding="utf-8")

user_input = input("질문을 입력하세요: ")

# LLM API에 전달할 메시지와 같은 데이터 구조입니다.
messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": user_input},
]

print("\n[불러온 메시지]")
for message in messages:
    print(f"{message['role']}: {message['content']}")
