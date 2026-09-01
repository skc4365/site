import json

with open("courses.json", "r", encoding="utf-8") as file:
    data = json.load(file)

print(data["title"])
print("====================")

for course in data["courses"]:
    name = course["name"]
    hours = course["hours"]
    required = course["required"]
    tools = course["tools"]

    print("과목:", name)
    print("시간:", hours if hours is not None else "미정")
    print("필수:", required)
    print("도구:", ", ".join(tools))
    print()

# Serialization직렬화 와 Deserialization역직렬화.