# 목표 저금통 (funfun-goal-jar)

목표 금액을 정해두고, 입금/출금을 기록하면 누적되어 프로그레스 바가 채워지는 공유 앱.
목표를 **여러 개** 만들어 상단 탭으로 전환하고, 각 입출금에 **10자 메모**를 남길 수 있습니다.
휴대폰·PC·여러 사람이 **같은 URL로 접속해 같은 데이터**를 보고 수정합니다. (로그인 없음)

- 프론트엔드: Vite + React (SPA, 백엔드 코드 없음)
- 데이터: Supabase (무료 Postgres + 자동 API + 실시간 동기화)
- 배포: Vercel (정적 배포)

## 로컬 실행

```bash
pnpm install   # 또는 npm install
pnpm dev       # http://localhost:5173
```

Supabase 키 없이도 바로 뜹니다 → **데모 모드**(이 브라우저의 localStorage에만 저장).
기기 간 공유를 켜려면 아래 Supabase 설정을 하세요.

## Supabase 설정 (기기 간 공유 켜기)

1. [supabase.com](https://supabase.com) 에서 무료 프로젝트 생성
2. **SQL Editor** 에 `supabase/schema.sql` 내용을 붙여넣고 실행
3. **Project Settings > API** 에서 `Project URL` 과 `anon public` 키 복사
4. 프로젝트 루트에 `.env` 파일 생성 (`.env.example` 참고):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. `pnpm dev` 재실행 → 데모 배너가 사라지고 공유 모드로 전환

## Vercel 배포

1. 이 프로젝트를 GitHub 레포에 push
2. [vercel.com](https://vercel.com) 에서 GitHub 레포 연결 (프레임워크: Vite 자동 감지)
3. **Environment Variables** 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가
4. Deploy → 발급된 URL을 휴대폰·다른 사람과 공유
