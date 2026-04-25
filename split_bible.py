"""
bible.json을 258개의 스텝 JSON 파일로 분할하는 스크립트
"""

import json
import os

# Bible 데이터 로드
print("bible.json 로드 중...")
with open("bible.json", "r", encoding="utf-8") as f:
    bible_data = json.load(f)

print(f"총 {len(bible_data)}개 구절 로드됨")

# Reading plan 로드
print("\nreading plan 로드 중...")
with open("bible_300_reading_plan.csv", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 헤더 스킵
plan_data = []
for line in lines[1:]:  # 첫 번째 줄(헤더) 건너뛰기
    parts = line.strip().split(",")
    if len(parts) >= 6:
        plan_data.append({
            "step": int(parts[0]),
            "start_book": parts[1],
            "start_chapter": int(parts[2]),
            "end_book": parts[3],
            "end_chapter": int(parts[4]),
            "chapter_count": int(parts[5])
        })

print(f"총 {len(plan_data)}개 스텝 로드됨")

# 책 약어 매핑 (bible.json 키와 일치)
BOOK_KEYS = {
    "창세기": "창세기", "출애굽기": "출애굽기", "레위기": "레위기",
    "민수기": "민수기", "신명기": "신명기", "여호수아": "여호수아",
    "사사기": "사사기", "룻기": "룻기", "사무엘상": "사무엘상",
    "사무엘하": "사무엘하", "열왕기상": "열왕기상", "열왕기하": "열왕기하",
    "역대상": "역대상", "역대하": "역대하", "에스라": "에스라",
    "느헤미야": "느헤미야", "에스더": "에스더", "욥기": "욥기",
    "시편": "시편", "잠언": "잠언", "전도서": "전도서", "아가": "아가",
    "이사야": "이사야", "예레미야": "예레미야", "예레미야애가": "예레미야애가",
    "에스겔": "에스겔", "다니엘": "다니엘", "호세아": "호세아",
    "요엘": "요엘", "아모스": "아모스", "오바댜": "오바댜",
    "요나": "요나", "미가": "미가", "나훔": "나훔",
    "하박국": "하박국", "스바냐": "스바냐", "학개": "학개",
    "스가랴": "스가랴", "말라기": "말라기", "마태복음": "마태복음",
    "마가복음": "마가복음", "누가복음": "누가복음", "요한복음": "요한복음",
    "사도행전": "사도행전", "로마서": "로마서", "고린도전서": "고린도전서",
    "고린도후서": "고린도후서", "갈라디아서": "갈라디아서", "에베소서": "에베소서",
    "빌립보서": "빌립보서", "골로새서": "골로새서", "데살로니가전서": "데살로니가전서",
    "데살로니가후서": "데살로니가후서", "디모데전서": "디모데전서",
    "디모데후서": "디모데후서", "디도서": "디도서", "빌레몬서": "빌레몬서",
    "히브리서": "히브리서", "야고보서": "야고보서", "베드로전서": "베드로전서",
    "베드로후서": "베드로후서", "요한일서": "요한일서", "요한이서": "요한이서",
    "요한삼서": "요한삼서", "유다서": "유다서", "요한계시록": "요한계시록",
}

# 책 순서 (인덱스 기반)
BOOK_ORDER = list(BOOK_KEYS.keys())


def get_chapter_key(book: str, chapter: int, verse: int) -> str:
    """bible.json 키 생성"""
    return f"{book}{chapter}:{verse}"


def is_same_book(book1: str, book2: str) -> bool:
    """같은 책인지 확인"""
    return book1 == book2


def get_verse_range(start_book: str, start_chapter: int, end_book: str, end_chapter: int):
    """시작~끝 범위의 모든 구절 키를 생성"""
    keys = []
    
    start_idx = BOOK_ORDER.index(start_book)
    end_idx = BOOK_ORDER.index(end_book)
    
    if start_idx == end_idx:
        # 같은 책
        for ch in range(start_chapter, end_chapter + 1):
            verse = 1
            while True:
                key = get_chapter_key(start_book, ch, verse)
                if key in bible_data:
                    keys.append(key)
                    verse += 1
                else:
                    break
    else:
        # 다른 책 사이
        # 시작 책의 시작 장부터
        ch = start_chapter
        verse = 1
        while True:
            key = get_chapter_key(start_book, ch, verse)
            if key in bible_data:
                keys.append(key)
                verse += 1
            else:
                break
        
        # 중간 책들
        for book_idx in range(start_idx + 1, end_idx):
            book = BOOK_ORDER[book_idx]
            ch = 1
            while True:
                key = get_chapter_key(book, ch, 1)
                if key in bible_data:
                    # 이 장의 모든 구절 추가
                    v = 1
                    while True:
                        k = get_chapter_key(book, ch, v)
                        if k in bible_data:
                            keys.append(k)
                            v += 1
                        else:
                            break
                    ch += 1
                else:
                    break
        
        # 끝 책의 끝 장까지
        ch = 1
        while ch <= end_chapter:
            verse = 1
            while True:
                key = get_chapter_key(end_book, ch, verse)
                if key in bible_data:
                    keys.append(key)
                    verse += 1
                else:
                    break
            ch += 1
    
    return keys


# 스텝별 JSON 생성
print("\n스텝 JSON 파일 생성 중...")
os.makedirs("steps", exist_ok=True)

created_count = 0
for plan in plan_data:
    step = plan["step"]
    start_book = plan["start_book"]
    start_chapter = plan["start_chapter"]
    end_book = plan["end_book"]
    end_chapter = plan["end_chapter"]
    
    # 구절 키 수집
    verse_keys = get_verse_range(start_book, start_chapter, end_book, end_chapter)
    
    # 스텝 데이터 생성
    step_data = {
        "step": step,
        "start_book": start_book,
        "start_chapter": start_chapter,
        "end_book": end_book,
        "end_chapter": end_chapter,
        "verses": {}
    }
    
    for key in verse_keys:
        if key in bible_data:
            step_data["verses"][key] = bible_data[key]
    
    # 파일 저장
    filename = f"steps/step_{step:03d}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(step_data, f, ensure_ascii=False, indent=2)
    
    created_count += 1
    if step <= 5 or step % 50 == 0:
        print(f"  Step {step}: {start_book}{start_chapter} ~ {end_book}{end_chapter} ({len(step_data['verses'])} verses)")

print(f"\n총 {created_count}개 스텝 JSON 파일 생성 완료!")
print("steps/ 폴더에 저장됨")