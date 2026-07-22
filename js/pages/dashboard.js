/* ============================================
   DASHBOARD.JS — 통합 대시보드 페이지
   ============================================ */

const DashboardPage = {
    async render() {
        const [clubBal, exchangeTotal, games, members, calcHistories] = await Promise.all([
            Store.getClubTotalBalance(),
            Store.getExchangeTotal(),
            Store.getGames({ limit: 5 }),
            Store.getMembers('active'),
            Store.getCalcHistoryList()
        ]);

        const recentGames = games.slice(0, 3);

        return `
        <div class="version-banner" style="background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(16,185,129,0.18)); border: 1px solid rgba(99,102,241,0.35); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.4rem;">💰</span>
                <div>
                    <div style="font-weight:700;font-size:0.98rem;color:var(--text-primary);">등수별 최종 지불 합계 금액 하이라이트 표시 적용 완료</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);">골프비 + 식사비 세부 항목 및 카드 하단에 [1등~N등 최종 지불 합계 금액] 선명하게 강조</div>
                </div>
            </div>
            <div style="text-align:right;">
                <span class="badge badge-income" style="font-size:0.85rem;padding:4px 10px;font-weight:700;">v6.0.0 (등수별 합계 탑재)</span>
                <div style="font-size:0.8rem;color:#38bdf8;font-weight:700;margin-top:4px;">🕒 2026-07-22 15:10:00</div>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card emerald">
                <div class="card-icon">⛳</div>
                <div class="card-label">모임 회비 잔액</div>
                <div class="card-value">${Utils.formatVND(clubBal)}</div>
                <div class="card-sub">회비 입금 - 총 지출</div>
            </div>
            <div class="summary-card amber">
                <div class="card-icon">📊</div>
                <div class="card-label">저장된 산출 이력</div>
                <div class="card-value">${(calcHistories || []).length}건 보관</div>
                <div class="card-sub">날짜별 회비 산출 시트</div>
            </div>
            <div class="summary-card indigo">
                <div class="card-icon">🎮</div>
                <div class="card-label">최근 게임 기록</div>
                <div class="card-value">${games.length}회 기록</div>
                <div class="card-sub">스크린골프 & 모임</div>
            </div>
            <div class="summary-card rose">
                <div class="card-icon">👥</div>
                <div class="card-label">활동 모임 멤버</div>
                <div class="card-value">${members.length}명</div>
                <div class="card-sub">상시 & 출장 멤버</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="card-title">🏆 최근 게임 기록 & 순위</span>
                    <button class="btn btn-ghost btn-sm" onclick="Router.navigate('club')">더보기 ➔</button>
                </div>
                ${recentGames.length > 0 ? this.renderRecentGames(recentGames) : '<div class="empty-state"><div class="empty-icon">⛳</div><p class="empty-text">아직 게임 기록이 없습니다</p></div>'}
            </div>
            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="card-title">📊 최근 저장된 회비 산출 이력</span>
                    <button class="btn btn-emerald btn-sm" onclick="Router.navigate('club')">산출시트 이동</button>
                </div>
                ${calcHistories && calcHistories.length > 0 ? this.renderRecentCalcs(calcHistories.slice(0, 3)) : '<div class="empty-state"><div class="empty-icon">📊</div><p class="empty-text">저장된 산출 이력이 없습니다</p></div>'}
            </div>
            <div class="card full-width">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <span class="card-title">👥 활동 중인 모임 멤버</span>
                    <button class="btn btn-ghost btn-sm" onclick="Router.navigate('club')">멤버 관리 ➔</button>
                </div>
                ${this.renderActiveMembers(members)}
            </div>
        </div>`;
    },

    renderRecentGames(games) {
        let html = '<div style="display:flex;flex-direction:column;gap:12px">';
        games.forEach(g => {
            const parts = (g.club_game_participants || []).sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
            const partStr = parts.map(p => {
                const rankClass = p.ranking <= 3 && p.ranking > 0 ? `rank-${p.ranking}` : 'rank-other';
                return `<span class="ranking-badge ${rankClass}" title="${p.club_members?.name}">${p.ranking || '-'}</span> ${Utils.escapeHtml(p.club_members?.name || '?')}`;
            }).join('&nbsp;&nbsp;');
            html += `<div class="activity-item">
                <div class="activity-icon">⛳</div>
                <div class="activity-info">
                    <div class="activity-title">${Utils.formatDateKR(g.game_date)} ${Utils.escapeHtml(g.location || '')}</div>
                    <div class="activity-meta" style="margin-top:4px">${partStr || '참여자 없음'}</div>
                </div>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    renderRecentCalcs(histories) {
        let html = '<div style="display:flex;flex-direction:column;gap:12px">';
        histories.forEach(h => {
            html += `<div class="activity-item">
                <div class="activity-icon">📊</div>
                <div class="activity-info">
                    <div class="activity-title"><strong>[${Utils.formatDateKR(h.calc_date)}]</strong> ${Utils.escapeHtml(h.title || '스크린골프')} (${h.player_count}명)</div>
                    <div class="activity-meta" style="margin-top:4px;color:#10b981;font-weight:600;">
                        ${(h.rank_amounts || []).map((amt, idx) => `${idx+1}등:${Utils.formatVND(amt)}`).join(' | ')}
                    </div>
                </div>
                <div style="font-weight:700;color:#38bdf8;">${Utils.formatVND(h.total_cost)}</div>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    renderActiveMembers(members) {
        let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:14px;">';
        members.forEach(m => {
            const avatarText = m.nickname ? Utils.escapeHtml(m.nickname) : (m.name.length >= 3 ? m.name.slice(-2) : m.name);
            const typeBadge = m.member_type === 'regular'
                ? `<span style="background:rgba(16,185,129,0.18);color:#34d399;border:1px solid rgba(16,185,129,0.35);font-size:0.8rem;font-weight:700;padding:2px 8px;border-radius:6px;white-space:nowrap;">상시</span>`
                : `<span style="background:rgba(139,92,246,0.18);color:#c084fc;border:1px solid rgba(139,92,246,0.35);font-size:0.8rem;font-weight:700;padding:2px 8px;border-radius:6px;white-space:nowrap;">출장</span>`;
            
            html += `
                <div class="active-member-card" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95));border:1px solid rgba(99,102,241,0.28);border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,0.18);transition:all 0.2s ease;">
                    <div class="member-avatar" style="height:42px;min-width:50px;padding:0 14px;font-size:0.92rem;font-weight:700;border-radius:21px;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 12px rgba(99,102,241,0.35);color:#ffffff;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;">${avatarText}</div>
                    <div style="overflow:hidden;flex:1;">
                        <div style="font-weight:700;font-size:1.05rem;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(m.name)}</div>
                        <div style="display:flex;align-items:center;gap:6px;margin-top:5px;white-space:nowrap;">
                            ${typeBadge}
                            <span style="font-size:0.88rem;color:#cbd5e1;font-weight:500;white-space:nowrap;">• ${Utils.escapeHtml(m.company)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    renderRecentActivity(txList) {
        let html = '<ul class="activity-list">';
        txList.forEach(tx => {
            const icon = tx.type === 'income' ? '📥' : '📤';
            const colorClass = tx.type === 'income' ? 'text-emerald' : 'text-rose';
            const sign = tx.type === 'income' ? '+' : '-';
            html += `<li class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-info">
                    <div class="activity-title">${tx.personal_categories?.icon || ''} ${Utils.escapeHtml(tx.personal_categories?.name || '')} ${tx.memo ? '- ' + Utils.escapeHtml(tx.memo) : ''}</div>
                    <div class="activity-meta">${Utils.formatDateKR(tx.tx_date)}</div>
                </div>
                <div class="${colorClass}" style="font-weight:600;white-space:nowrap">${sign}${Utils.formatVND(tx.amount)}</div>
            </li>`;
        });
        html += '</ul>';
        return html;
    },

    async afterRender() {
        await this.renderMonthChart();
    },

    async renderMonthChart() {
        const canvas = document.getElementById('dash-month-chart');
        if (!canvas) return;

        const now = new Date();
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = d.toISOString().split('T')[0];
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
            labels.push(`${d.getMonth() + 1}월`);
            const s = await Store.getTransactionSummary(start, end);
            incomeData.push(s.income);
            expenseData.push(s.expense);
        }

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '수입', data: incomeData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
                    { label: '지출', data: expenseData, backgroundColor: 'rgba(244,63,94,0.7)', borderRadius: 6 }
                ]
            },
            options: {
                ...Utils.chartDefaults(),
                plugins: {
                    ...Utils.chartDefaults().plugins,
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.formatVND(ctx.raw)}` } }
                }
            }
        });
    }
};

Router.register('dashboard', DashboardPage);
