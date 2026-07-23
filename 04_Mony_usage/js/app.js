/* ============================================
   APP.JS — 앱 초기화 및 부트스트랩
   ============================================ */

(async function () {
    'use strict';

    // ── 날짜 표시 ──
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        dateEl.textContent = `${yyyy}.${mm}.${dd} (${days[now.getDay()]})`;
    }

    // ── 사이드바 토글 ──
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-menu-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    // 모바일: 콘텐츠 클릭 시 사이드바 닫기
    document.getElementById('main-content').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('mobile-open');
        }
    });

    // ── 모달 초기화 ──
    Modal.init();

    // ── 화면 세로 모드 고정 지원 (Screen Orientation Lock) ──
    const lockPortrait = () => {
        try {
            if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
                window.screen.orientation.lock('portrait').catch(() => {});
            }
        } catch (e) {}
    };
    window.addEventListener('load', lockPortrait);
    document.addEventListener('touchstart', lockPortrait, { once: true });

    // ── PWA 서비스 워커 등록 (모바일 앱 설치 지원) ──
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('✅ PWA ServiceWorker 등록 성공:', reg.scope))
                .catch(err => console.warn('⚠️ PWA ServiceWorker 등록 실패:', err));
        });
    }

    // ── 라우터 초기화 ──
    Router.init();

    // ── 모바일 하단 탭 네비게이션 (3개 핵심 탭 + 대시보드) ──
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            const tab = item.dataset.tab;
            
            document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
            item.classList.add('active');
            
            if (page === 'club' && tab) {
                ClubPage.currentTab = tab;
            }
            await Router.navigate(page);
        });
    });

    // ── FAB: 빠른 입력 버튼 ──
    const fab = document.getElementById('fab-quick-add');
    if (fab) {
        fab.addEventListener('click', () => {
            // 현재 페이지에 따라 적절한 입력 모달 오픈
            const page = Router.currentPage;
            switch (page) {
                case 'personal':
                    PersonalPage.openTxModal();
                    break;
                case 'club':
                    if (ClubPage.currentTab === 'dues') ClubPage.openDuesModal();
                    else ClubPage.openGameModal();
                    break;
                case 'exchange':
                    ExchangePage.openExchangeModal();
                    break;
                default:
                    // 기본: 가계부 입력 (가장 자주 쓰는 기능)
                    PersonalPage.openTxModal();
                    break;
            }
        });
    }

    // ── Supabase 연결 확인 & 초기 페이지 로드 ──
    try {
        const { data, error } = await supabase.from('app_settings').select('key').limit(1);
        if (error) throw error;
        console.log('✅ Supabase 연결 성공');
    } catch (err) {
        console.warn('⚠️ Supabase 연결 실패:', err.message);
        console.warn('   → js/config.js에서 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정하세요.');
    }

    // 대시보드 로드
    Router.navigate('dashboard');
})();
