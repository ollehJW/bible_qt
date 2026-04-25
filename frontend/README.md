# Sacred Space Web

모바일 우선 React 웹앱입니다. Windows PowerShell에서 `npm` 실행 정책 오류가 나면 `npm.cmd`를 사용하세요.

Supabase 연결을 위해 `frontend/.env.local`을 만들고 값을 채우세요.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```powershell
npm.cmd install
npm.cmd run dev
```

브라우저에서 Vite가 출력한 주소를 열면 됩니다. 같은 Wi-Fi의 휴대폰에서 보려면 `Network` 주소로 접속하세요.

```powershell
npm.cmd run build
```

빌드 결과는 `dist/`에 생성됩니다.
