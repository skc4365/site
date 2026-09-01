import csv
from pathlib import Path


# CSV는 에이전트의 질문·답변 평가 데이터셋으로 활용할 수 있습니다.
csv_path = Path(__file__).parent / "data" / "agent_eval.csv"

with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
    questions = list(csv.DictReader(file))

print(f"전체 평가 문항: {len(questions)}개\n")

for item in questions:
    print(f"문항 {item['id']} ({item['difficulty']})")
    print(f"질문: {item['question']}")
    print(f"기대 키워드: {item['expected_keyword']}")
    print()

# 조건에 맞는 데이터만 선택하는 예제입니다.
beginner_questions = [
    item for item in questions if item["difficulty"] == "초급"
]

print(f"초급 문항 수: {len(beginner_questions)}개")
