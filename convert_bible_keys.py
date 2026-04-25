"""
bible.json 키 변환 스크립트
창1:1 -> 창세기1:1 형식으로 변환
"""

import json
import re

# 약어 -> 전체 이름 매핑
BOOK_MAPPING = {
    "창": "창세기",
    "출": "출애굽기",
    "레": "레위기",
    "민": "민수기",
    "신": "신명기",
    "수": "여호수아",
    "삽": "사사기",
    "룻": "룻기",
    "삼상": "사무엘상",
    "삼하": "사무엘하",
    "왕상": "열왕기상",
    "왕하": "열왕기하",
    "대상": "역대상",
    "대하": "역대하",
    "스": "에스라",
    "느": "느헤미야",
    "에": "에스더",
    "욥": "욥기",
    "시": "시편",
    "잠": "잠언",
    "전": "전도서",
    "아": "아가",
    "사": "이사야",
    "렘": "예레미야",
    "애": "예레미야애가",
    "겔": "에스겔",
    "단": "다니엘",
    "호": "호세아",
    "요": "요엘",
    "암": "아모스",
    "옵": "오바댜",
    "욘": "요나",
    "미": "미가",
    "나": "나훔",
    "합": "하박국",
    "습": "스바냐",
    "학": "학개",
    "슥": "스가랴",
    "말": "말라기",
    "마": "마태복음",
    "막": "마가복음",
    "눅": "누가복음",
    "요": "요한복음",
    "행": "사도행전",
    "고전": "고린도전서",
    "고후": "고린도후서",
    "갈": "갈라디아서",
    "엡": "에베소서",
    "빌": "빌립보서",
    "골": "골로새서",
    "살전": "데살로니가전서",
    "살후": "데살로니가후서",
    "딤전": "디모데전서",
    "딤후": "디모데후서",
    "딛": "디도서",
    "몬": "빌레몬서",
    "히": "히브리서",
    "약": "야고보서",
    "벧전": "베드로전서",
    "벧후": "베드로후서",
    "요일": "요한일서",
    "요이": "요한이서",
    "요삼": "요한삼서",
    "유": "유다서",
    "계": "요한계시록",
}

# 중복 키 처리 (요, 스는 두 번 등장)
# 요 -> 요한복음 (우선), 요엘은 이미 처리
# 스 -> 에스라 (우선), 스바냐는 습으로 처리


def convert_key(key: str) -> str:
    """키를 변환합니다. 예: 창1:1 -> 창세기1:1"""
    # 정규식으로 키 파싱: 약어 + 장:절
    match = re.match(r'^([가-힣]+)(\d+):(\d+)$', key)
    if not match:
        return key
    
    abbrev = match.group(1)
    chapter = match.group(2)
    verse = match.group(3)
    
    # 약어 찾기
    full_name = BOOK_MAPPING.get(abbrev)
    if not full_name:
        # 매핑에 없으면 기존 키 반환
        print(f"  경고: 매핑되지 않은 약어 '{abbrev}'")
        return key
    
    return f"{full_name}{chapter}:{verse}"


def main():
    input_file = "bible.json"
    output_file = "bible_new.json"
    
    print("bible.json 키 변환 시작...")
    print("=" * 50)
    
    # JSON 파일 읽기
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"총 {len(data)}개 키를 변환합니다.")
    
    # 키 변환
    new_data = {}
    converted_count = 0
    skipped_count = 0
    
    for old_key, value in data.items():
        new_key = convert_key(old_key)
        
        if new_key == old_key:
            skipped_count += 1
        else:
            converted_count += 1
            if converted_count <= 10:
                print(f"  {old_key} -> {new_key}")
        
        # 새 키로 추가
        new_data[new_key] = value
    
    print("=" * 50)
    print(f"변환 완료: {converted_count}개")
    print(f"스킵: {skipped_count}개")
    
    # 새 파일로 저장
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n결과 저장: {output_file}")
    print("완료!")


if __name__ == "__main__":
    main()