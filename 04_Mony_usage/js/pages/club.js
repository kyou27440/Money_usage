/* ============================================
   CLUB.JS — 회사 모임 관리 페이지
   ============================================ */

const ClubPage = {
    currentTab: 'games',

    async render() {
        return `
        <div class="tabs">
            <button class="tab-btn active" data-tab="games">🎮 게임 기록</button>
            <button class="tab-btn" data-tab="members">👥 멤버 관리</button>
            <button class="tab-btn" data-tab="dues">💵 회비 관리</button>
            <button class="tab-btn" data-tab="ranking">🏆 순위/성적</button>
        </div>
        <div id="club-tab-content"></div>`;
    },

    async afterRender() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.renderTab();
            });
        });
        await this.renderTab();
    },

    async renderTab() {
        const container = document.getElementById('club-tab-content');
        container.innerHTML = '<div class="text-center text-muted" style="padding:40px">⏳ 로딩 중...</div>';
        switch (this.currentTab) {
            case 'games': await this.renderGames(container); break;
            case 'members': await this.renderMembers(container); break;
            case 'dues': await this.renderDues(container); break;
            case 'ranking': await this.renderRanking(container); break;
        }
    },

    // ─── 게임 기록 탭 ───
    async renderGames(container) {
        const games = await Store.getGames({ limit: 20 });
        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">게임 기록</span>
                <button class="btn btn-primary" id="btn-add-game">+ 게임 추가</button>
            </div>
            ${games.length === 0 ? '<div class="empty-state"><div class="empty-icon">⛳</div><p class="empty-text">아직 게임 기록이 없습니다</p></div>' : `
            <div class="table-wrapper"><table>
                <thead><tr><th>날짜</th><th>장소</th><th>참여자 & 순위</th><th>비용</th><th>삭제</th></tr></thead>
                <tbody>${games.map(g => {
                    const parts = (g.club_game_participants || []).sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
                    const partStr = parts.map(p => {
                        const rc = p.ranking <= 3 ? `rank-${p.ranking}` : 'rank-other';
                        return `<span class="ranking-badge ${rc}">${p.ranking || '-'}</span> ${Utils.escapeHtml(p.club_members?.name || '?')}`;
                    }).join('&nbsp;&nbsp;');
                    return `<tr>
                        <td>${Utils.formatDateKR(g.game_date)}</td>
                        <td>${Utils.escapeHtml(g.location)}</td>
                        <td>${partStr || '-'}</td>
                        <td style="text-align:right">${Utils.formatVND(g.total_cost)}</td>
                        <td><button class="btn btn-icon btn-sm" onclick="ClubPage.deleteGame(${g.id})">🗑️</button></td>
                    </tr>`;
                }).join('')}</tbody>
            </table></div>`}`;

        document.getElementById('btn-add-game').addEventListener('click', () => this.openGameModal());
    },

    async openGameModal() {
        const members = await Store.getMembers('active');
        const memberChecks = members.map(m => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                <input type="checkbox" id="gm-${m.id}" value="${m.id}" class="game-member-check">
                <label for="gm-${m.id}" style="flex:1">${Utils.escapeHtml(m.name)} <span class="badge badge-${m.member_type}" style="margin-left:4px">${m.member_type === 'regular' ? '상시' : '출장'}</span></label>
                <input type="number" id="gr-${m.id}" placeholder="순위" min="1" max="8" style="width:70px" class="game-rank-input">
            </div>
        `).join('');

        Modal.open('게임 기록 입력', `
            <div class="form-grid">
                <div class="form-group">
                    <label>게임 날짜</label>
                    <input type="date" id="game-date" value="${Utils.today()}">
                </div>
                <div class="form-group">
                    <label>장소</label>
                    <input type="text" id="game-location" value="스크린골프장">
                </div>
                <div class="form-group">
                    <label>총 비용 (VND)</label>
                    <input type="text" id="game-cost" placeholder="예: 800000" inputmode="numeric">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>참여자 & 순위 (체크 후 순위 입력)</label>
                <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:8px;margin-top:4px">
                    ${members.length > 0 ? memberChecks : '<p class="text-muted">먼저 멤버를 추가해주세요</p>'}
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모</label>
                <input type="text" id="game-memo" placeholder="메모 (선택)">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-game">저장</button>
        `);

        document.getElementById('btn-save-game').addEventListener('click', async () => {
            const game = {
                game_date: document.getElementById('game-date').value,
                location: document.getElementById('game-location').value.trim() || '스크린골프장',
                total_cost: Utils.parseAmount(document.getElementById('game-cost').value),
                memo: document.getElementById('game-memo').value.trim()
            };
            if (!game.game_date) { Utils.toast('날짜를 입력해주세요', 'error'); return; }
            const participants = [];
            document.querySelectorAll('.game-member-check:checked').forEach(cb => {
                const mid = Number(cb.value);
                const rank = Number(document.getElementById(`gr-${mid}`).value) || null;
                participants.push({ member_id: mid, ranking: rank });
            });
            if (participants.length === 0) { Utils.toast('참여자를 선택해주세요', 'error'); return; }
            const result = await Store.addGame(game, participants);
            if (result) {
                Utils.toast('게임이 기록되었습니다', 'success');
                Modal.close();
                this.renderTab();
            }
        });
    },

    async deleteGame(id) {
        const ok = await Modal.confirm('게임 삭제', '이 게임 기록을 삭제하시겠습니까?');
        if (ok) {
            await Store.deleteGame(id);
            Utils.toast('삭제되었습니다', 'success');
            this.renderTab();
        }
    },

    // ─── 멤버 관리 탭 ───
    async renderMembers(container) {
        const members = await Store.getMembers();
        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">모임 멤버</span>
                <button class="btn btn-primary" id="btn-add-member">+ 멤버 추가</button>
            </div>
            <div class="club-members-grid">
                ${members.map(m => `
                    <div class="member-card">
                        <div class="member-avatar">${m.name.charAt(0)}</div>
                        <div class="member-name">${Utils.escapeHtml(m.name)}</div>
                        <div class="member-meta">
                            <span class="badge badge-${m.member_type}">${m.member_type === 'regular' ? '상시' : '출장'}</span>
                            <span class="badge badge-${m.status}" style="margin-left:4px">${m.status === 'active' ? '활동중' : m.status === 'inactive' ? '비활동' : '퇴사'}</span>
                        </div>
                        <div class="member-meta mt-sm">${Utils.escapeHtml(m.company)} • ${Utils.formatDate(m.join_date)}</div>
                        <div style="margin-top:8px;display:flex;gap:4px;justify-content:center">
                            ${m.status === 'active' ? `<button class="btn btn-ghost btn-sm" onclick="ClubPage.updateMemberStatus(${m.id},'inactive')">비활동</button>` : ''}
                            ${m.status === 'inactive' ? `<button class="btn btn-success btn-sm" onclick="ClubPage.updateMemberStatus(${m.id},'active')">복귀</button>` : ''}
                            ${m.status !== 'departed' ? `<button class="btn btn-danger btn-sm" onclick="ClubPage.updateMemberStatus(${m.id},'departed')">퇴사</button>` : ''}
                        </div>
                    </div>
                `).join('') || '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><p class="empty-text">멤버가 없습니다</p></div>'}
            </div>`;

        document.getElementById('btn-add-member').addEventListener('click', () => this.openMemberModal());
    },

    async openMemberModal() {
        Modal.open('멤버 추가', `
            <div class="form-grid">
                <div class="form-group"><label>이름</label><input type="text" id="mem-name" placeholder="이름"></div>
                <div class="form-group"><label>소속</label><input type="text" id="mem-company" value="현지" placeholder="현지/본사"></div>
                <div class="form-group">
                    <label>유형</label>
                    <select id="mem-type"><option value="regular">상시 멤버</option><option value="temporary">단기 출장자</option></select>
                </div>
                <div class="form-group"><label>합류일</label><input type="date" id="mem-join" value="${Utils.today()}"></div>
            </div>
            <div class="form-group mt-md"><label>메모</label><input type="text" id="mem-memo" placeholder="메모 (선택)"></div>
        `, `<button class="btn btn-ghost" onclick="Modal.close()">취소</button><button class="btn btn-primary" id="btn-save-mem">저장</button>`);

        document.getElementById('btn-save-mem').addEventListener('click', async () => {
            const data = {
                name: document.getElementById('mem-name').value.trim(),
                company: document.getElementById('mem-company').value.trim() || '현지',
                member_type: document.getElementById('mem-type').value,
                join_date: document.getElementById('mem-join').value,
                memo: document.getElementById('mem-memo').value.trim()
            };
            if (!data.name || !data.join_date) { Utils.toast('이름과 합류일을 입력해주세요', 'error'); return; }
            const result = await Store.addMember(data);
            if (result) { Utils.toast('멤버가 추가되었습니다', 'success'); Modal.close(); this.renderTab(); }
        });
    },

    async updateMemberStatus(id, status) {
        const labels = { inactive: '비활동', active: '활동', departed: '퇴사' };
        const ok = await Modal.confirm('상태 변경', `이 멤버를 "${labels[status]}" 상태로 변경하시겠습니까?`);
        if (ok) {
            const updates = { status };
            if (status === 'departed') updates.leave_date = Utils.today();
            await Store.updateMember(id, updates);
            Utils.toast('상태가 변경되었습니다', 'success');
            this.renderTab();
        }
    },

    // ─── 회비 관리 탭 ───
    async renderDues(container) {
        const [balances, dues] = await Promise.all([Store.getDuesBalance(), Store.getDues({})]);
        const totalBal = balances.reduce((s, b) => s + b.balance, 0);

        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">회비 현황 (총 잔액: <span class="${totalBal >= 0 ? 'text-emerald' : 'text-rose'}">${Utils.formatVND(totalBal)}</span>)</span>
                <button class="btn btn-primary" id="btn-add-dues">+ 회비 입출금</button>
            </div>
            ${balances.length > 0 ? `<div class="summary-grid mb-lg">${balances.filter(b => b.status === 'active').map(b => `
                <div class="summary-card ${b.balance >= 0 ? 'emerald' : 'rose'}">
                    <div class="card-label">${Utils.escapeHtml(b.name)}</div>
                    <div class="card-value">${Utils.formatVND(b.balance)}</div>
                </div>
            `).join('')}</div>` : ''}
            <div class="table-wrapper"><table>
                <thead><tr><th>날짜</th><th>멤버</th><th>구분</th><th style="text-align:right">금액</th><th>메모</th><th>삭제</th></tr></thead>
                <tbody>${dues.length > 0 ? dues.map(d => `
                    <tr>
                        <td>${Utils.formatDateKR(d.dues_date)}</td>
                        <td>${Utils.escapeHtml(d.club_members?.name || '?')}</td>
                        <td><span class="badge badge-${d.type === 'deposit' ? 'income' : 'expense'}">${d.type === 'deposit' ? '입금' : '사용'}</span></td>
                        <td style="text-align:right;font-weight:600" class="${d.type === 'deposit' ? 'text-emerald' : 'text-rose'}">${d.type === 'deposit' ? '+' : '-'}${Utils.formatVND(d.amount)}</td>
                        <td class="text-secondary">${Utils.escapeHtml(d.memo)}</td>
                        <td><button class="btn btn-icon btn-sm" onclick="ClubPage.deleteDues(${d.id})">🗑️</button></td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">회비 내역이 없습니다</td></tr>'}</tbody>
            </table></div>`;

        document.getElementById('btn-add-dues').addEventListener('click', () => this.openDuesModal());
    },

    async openDuesModal() {
        const members = await Store.getMembers('active');
        Modal.open('회비 입출금', `
            <div class="form-grid">
                <div class="form-group"><label>날짜</label><input type="date" id="dues-date" value="${Utils.today()}"></div>
                <div class="form-group">
                    <label>멤버</label>
                    <select id="dues-member">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select>
                </div>
                <div class="form-group">
                    <label>구분</label>
                    <select id="dues-type"><option value="deposit">입금 (회비 납부)</option><option value="withdrawal">출금 (사용)</option></select>
                </div>
                <div class="form-group"><label>금액 (VND)</label><input type="text" id="dues-amount" placeholder="예: 200000" inputmode="numeric"></div>
            </div>
            <div class="form-group mt-md"><label>메모</label><input type="text" id="dues-memo" placeholder="메모 (선택)"></div>
        `, `<button class="btn btn-ghost" onclick="Modal.close()">취소</button><button class="btn btn-primary" id="btn-save-dues">저장</button>`);

        document.getElementById('btn-save-dues').addEventListener('click', async () => {
            const data = {
                dues_date: document.getElementById('dues-date').value,
                member_id: Number(document.getElementById('dues-member').value),
                type: document.getElementById('dues-type').value,
                amount: Utils.parseAmount(document.getElementById('dues-amount').value),
                memo: document.getElementById('dues-memo').value.trim()
            };
            if (!data.dues_date || !data.amount || data.amount <= 0) { Utils.toast('날짜와 금액을 입력해주세요', 'error'); return; }
            const result = await Store.addDues(data);
            if (result) { Utils.toast('회비가 기록되었습니다', 'success'); Modal.close(); this.renderTab(); }
        });
    },

    async deleteDues(id) {
        const ok = await Modal.confirm('회비 삭제', '이 회비 내역을 삭제하시겠습니까?');
        if (ok) { await Store.deleteDues(id); Utils.toast('삭제되었습니다', 'success'); this.renderTab(); }
    },

    // ─── 순위/성적 탭 ───
    async renderRanking(container) {
        const [stats, trend] = await Promise.all([Store.getMemberStats(), Store.getRankingTrend(10)]);

        container.innerHTML = `
            <div class="section-header"><span class="section-title">멤버별 성적 통계</span></div>
            ${stats.length > 0 ? `<div class="table-wrapper mb-lg"><table>
                <thead><tr><th>멤버</th><th>참여 수</th><th>평균 순위</th><th>최고</th><th>최저</th></tr></thead>
                <tbody>${stats.map(s => `
                    <tr>
                        <td><strong>${Utils.escapeHtml(s.name)}</strong></td>
                        <td>${s.games}회</td>
                        <td style="font-weight:600;color:var(--accent-indigo)">${s.avgRank}</td>
                        <td class="text-emerald">${s.best}등</td>
                        <td class="text-rose">${s.worst}등</td>
                    </tr>
                `).join('')}</tbody>
            </table></div>` : '<div class="empty-state"><div class="empty-icon">🏆</div><p class="empty-text">게임 기록이 없습니다</p></div>'}

            <div class="card">
                <div class="card-header"><span class="card-title">📈 등수 변동 추이</span></div>
                <div class="chart-container" style="height:300px"><canvas id="ranking-trend-chart"></canvas></div>
            </div>`;

        if (trend.length > 0) this.drawRankingChart(trend);
    },

    drawRankingChart(trendData) {
        const canvas = document.getElementById('ranking-trend-chart');
        if (!canvas) return;

        const labels = trendData.map(g => Utils.formatDateKR(g.game_date));
        const memberMap = {};
        trendData.forEach(g => {
            (g.club_game_participants || []).forEach(p => {
                const name = p.club_members?.name || '?';
                if (!memberMap[name]) memberMap[name] = new Array(trendData.length).fill(null);
                const idx = trendData.indexOf(g);
                memberMap[name][idx] = p.ranking;
            });
        });

        const datasets = Object.entries(memberMap).map(([name, data], i) => ({
            label: name, data, borderColor: Utils.chartColors[i % Utils.chartColors.length],
            backgroundColor: Utils.chartColors[i % Utils.chartColors.length] + '33',
            tension: 0.3, fill: false, spanGaps: true, pointRadius: 5
        }));

        new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                ...Utils.chartDefaults(),
                scales: {
                    ...Utils.chartDefaults().scales,
                    y: { ...Utils.chartDefaults().scales.y, reverse: true, min: 1, ticks: { ...Utils.chartDefaults().scales.y.ticks, stepSize: 1 } }
                }
            }
        });
    }
};

Router.register('club', ClubPage);
