title = "파이썬 학습 목차"
line = "================="
mydict = {
    "c1":"파이썬 기본 문법",
    "c2":"클래스 · 데코레이터 · 예외 처리 · 로깅",
    "c3":"async/await 및 asyncio 비동기 프로그래밍",
    "c4":"Pydantic BaseModel 데이터 검증",
    "c5":"FastAPI RESTful API 설계",
    "c6":"FastAPI 심화 기능 및 Streamlit UI 연동",
    "time":11
}

print(title, line, sep = "\n", end = "\n")
print(mydict["c1"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c2"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c3"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c4"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c5"], mydict["time"], sep = ", 시간: ", end = "\n")
print(mydict["c6"], mydict["time"], sep = ", 시간: ", end = "\n")