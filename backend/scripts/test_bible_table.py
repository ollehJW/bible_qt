from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / "backend" / ".env"


def main() -> int:
    env = read_env(ENV_PATH)
    supabase_url = env.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = env.get("SUPABASE_KEY", "")

    if not supabase_url or not supabase_key:
        print("SUPABASE_URL and SUPABASE_KEY are required in backend/.env")
        return 1

    bad_chars = [
        {"index": index, "codepoint": ord(char)}
        for index, char in enumerate(supabase_key)
        if ord(char) > 127
    ]
    if bad_chars:
        print("SUPABASE_KEY contains non-ASCII characters and cannot be used as an HTTP header.")
        print(json.dumps(bad_chars[:10], ensure_ascii=False, indent=2))
        return 1

    endpoint = (
        f"{supabase_url}/rest/v1/bible"
        "?select=book,chapter,verse,text,step"
        "&order=book.asc,chapter.asc,verse.asc"
        "&limit=1"
    )

    request = Request(
        endpoint,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            print(f"HTTP {response.status}")
            print(json.dumps(json.loads(body), ensure_ascii=False, indent=2))
            return 0
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP {exc.code}")
        print(body or "(empty response body)")
        return 1
    except URLError as exc:
        print(f"Network error: {exc.reason}")
        return 1


def read_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


if __name__ == "__main__":
    raise SystemExit(main())
