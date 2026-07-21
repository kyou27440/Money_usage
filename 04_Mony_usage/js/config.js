/* ============================================
   CONFIG.JS — Supabase 연결 설정
   ============================================
   ⚠️ 아래 두 값을 Supabase 프로젝트의 실제 값으로 교체하세요.
   SETUP_GUIDE.md의 STEP 3을 참고하세요.
   ============================================ */

const SUPABASE_URL = 'https://YOUR_PROJECT_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Supabase 클라이언트 생성
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
