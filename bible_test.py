"""
Bible API Test - King James Version
bible-api.com에서 KJV 성경을 불러오는 테스트 코드
"""

import requests
import json


BASE_URL = "https://bible-api.com"


def get_verse(reference: str, translation: str = "kjv") -> dict:
    """
    단일 구절 또는 구절 범위를 조회합니다.
    
    Args:
        reference: 성경 구절 참조 (예: "john 3:16", "matt 25:31-33")
        translation: 번역본 ID (기본값: kjv)
    
    Returns:
        dict: 성경 데이터
    """
    url = f"{BASE_URL}/{reference}?translation={translation}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching verse: {e}")
        return {}


def get_chapter(book: str, chapter: int, translation: str = "kjv") -> dict:
    """
    특정 장 전체를 조회합니다.
    
    Args:
        book: 책 이름 (예: "john", "genesis")
        chapter: 장 번호
        translation: 번역본 ID (기본값: kjv)
    
    Returns:
        dict: 성경 데이터
    """
    url = f"{BASE_URL}/data/{translation}/{book}/{chapter}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching chapter: {e}")
        return {}


def print_verse(data: dict) -> None:
    """구절 데이터를 출력합니다."""
    if not data:
        print("No data available")
        return
    
    print("=" * 50)
    print(f"Reference: {data.get('reference', 'N/A')}")
    print(f"Translation: {data.get('translation', 'N/A')}")
    print("-" * 50)
    
    verses = data.get('verses', [])
    for verse in verses:
        chapter = verse.get('chapter', '')
        verse_num = verse.get('verse', '')
        text = verse.get('text', '')
        print(f"{chapter}:{verse_num} {text}")
    
    print("=" * 50)


def print_chapter(data: dict) -> None:
    """장 데이터를 출력합니다."""
    if not data:
        print("No data available")
        return
    
    print("=" * 50)
    print(f"Book: {data.get('book_id', 'N/A')}")
    print(f"Chapter: {data.get('chapter', 'N/A')}")
    print(f"Translation: {data.get('translation', 'N/A')}")
    print("-" * 50)
    
    verses = data.get('verses', [])
    for verse in verses:
        verse_num = verse.get('verse', '')
        text = verse.get('text', '')
        print(f"{verse_num:3d} {text}")
    
    print("=" * 50)


def test_single_verse():
    """단일 구절 테스트"""
    print("\n[Test 1] Single Verse - John 3:16")
    data = get_verse("john 3:16", "kjv")
    print_verse(data)
    return data


def test_verse_range():
    """구절 범위 테스트"""
    print("\n[Test 2] Verse Range - Matthew 25:31-33")
    data = get_verse("matthew 25:31-33", "kjv")
    print_verse(data)
    return data


def test_multiple_books():
    """여러 책에서 구절 조회 테스트"""
    print("\n[Test 3] Multiple References - john 3:16, genesis 1:1")
    data = get_verse("john 3:16, genesis 1:1", "kjv")
    print_verse(data)
    return data


def test_chapter():
    """장 전체 조회 테스트"""
    print("\n[Test 4] Full Chapter - John 3")
    data = get_chapter("JHN", 3, "kjv")
    print_chapter(data)
    return data


def test_abbreviated_book():
    """약어 책 이름 테스트"""
    print("\n[Test 5] Abbreviated Book Name - jn 3:16")
    data = get_verse("jn 3:16", "kjv")
    print_verse(data)
    return data


def test_different_translation():
    """다른 번역본 테스트"""
    print("\n[Test 6] Different Translation - WEB (World English Bible)")
    data = get_verse("john 3:16", "web")
    print_verse(data)
    return data


def main():
    """메인 테스트 함수"""
    print("Bible API Test - King James Version")
    print("=" * 50)
    print(f"Base URL: {BASE_URL}")
    print("=" * 50)
    
    # 테스트 실행
    test_single_verse()
    test_verse_range()
    test_multiple_books()
    test_chapter()
    test_abbreviated_book()
    test_different_translation()
    
    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)


if __name__ == "__main__":
    main()