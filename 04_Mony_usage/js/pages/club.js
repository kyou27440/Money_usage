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
            <button class="tab-btn" data-tab="calculator">🧮 회비 산출 시트</button>
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

    async switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabName);
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
            case 'calculator': await this.renderCalculator(container); break;
        }
    },

    gamesMap: {},

    // ─── 게임 기록 탭 ───
    async renderGames(container) {
        const games = await Store.getGames({ limit: 20 });
        const calcHistories = await Store.getCalcHistoryList();
        const calcMap = {};
        (calcHistories || []).forEach(c => calcMap[c.calc_date] = c);

        this.gamesMap = {};
        games.forEach(g => this.gamesMap[g.id] = g);

        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">게임 기록</span>
                <button class="btn btn-primary" id="btn-add-game">+ 게임 추가</button>
            </div>
            ${games.length === 0 ? '<div class="empty-state"><div class="empty-icon">⛳</div><p class="empty-text">아직 게임 기록이 없습니다</p></div>' : `
            <div class="games-vertical-list" style="display:flex;flex-direction:column;gap:14px;">
                ${games.map(g => {
                    const calc = calcMap[g.game_date];
                    const parts = (g.club_game_participants || []).sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
                    const hasUnranked = parts.some(p => !p.ranking);

                    return `
                    <div class="game-vertical-card" style="padding:16px;background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95));border:1px solid rgba(99,102,241,0.28);border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.18);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span style="font-weight:700;font-size:1.05rem;color:#f8fafc;">📅 ${Utils.formatDateKR(g.game_date)}</span>
                                <span style="font-size:0.88rem;color:#38bdf8;font-weight:500;">📍 ${Utils.escapeHtml(g.location)}</span>
                                ${calc ? `<span class="badge badge-income" style="font-size:0.75rem;padding:2px 8px;">📊 산출금 연동</span>` : ''}
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button class="btn ${hasUnranked ? 'btn-emerald' : 'btn-ghost'} btn-sm" onclick="ClubPage.openGameModal(${g.id})">
                                    ${hasUnranked ? '🏆 순위 입력' : '✏️ 수정'}
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="ClubPage.deleteGame(${g.id})" title="삭제">🗑️</button>
                            </div>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:8px;padding:12px;background:rgba(15,23,42,0.6);border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
                            ${parts.map(p => {
                                const rc = p.ranking <= 3 && p.ranking > 0 ? `rank-${p.ranking}` : 'rank-other';
                                let feeStr = '';
                                if (calc && p.ranking && calc.rank_amounts && calc.rank_amounts[p.ranking - 1] !== undefined) {
                                    feeStr = `<span style="margin-left:auto;font-size:0.88rem;color:#10b981;font-weight:700;">지불 회비: ${Utils.formatVND(calc.rank_amounts[p.ranking - 1])}</span>`;
                                }
                                return `
                                <div style="display:flex;align-items:center;gap:10px;font-size:0.92rem;">
                                    <span class="ranking-badge ${rc}" style="font-weight:700;">${p.ranking || '-'}</span>
                                    <span style="font-weight:600;color:#f8fafc;">${Utils.escapeHtml(p.club_members?.name || '?')}</span>
                                    ${feeStr}
                                </div>
                                `;
                            }).join('')}
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.88rem;color:var(--text-muted);">
                            <span>총 게임 비용: <strong style="color:#38bdf8;">${calc ? Utils.formatVND(calc.total_cost) : Utils.formatVND(g.total_cost)}</strong></span>
                            ${g.memo ? `<span>메모: ${Utils.escapeHtml(g.memo)}</span>` : ''}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            `}`;

        document.getElementById('btn-add-game').addEventListener('click', () => this.openGameModal());
    },

    async openGameModal(gameId = null) {
        const editGame = gameId ? this.gamesMap[gameId] : null;
        const members = await Store.getMembers('active');

        // 기존 참여자 맵 생성 (member_id -> ranking)
        const partMap = {};
        if (editGame && editGame.club_game_participants) {
            editGame.club_game_participants.forEach(p => {
                partMap[p.member_id] = p.ranking;
            });
        }

        const memberChecks = members.map(m => {
            const isChecked = editGame ? (partMap[m.id] !== undefined) : false;
            const rankVal = editGame && partMap[m.id] !== undefined && partMap[m.id] !== null ? partMap[m.id] : '';

            return `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
                    <input type="checkbox" id="gm-${m.id}" value="${m.id}" class="game-member-check" ${isChecked ? 'checked' : ''}>
                    <label for="gm-${m.id}" style="flex:1;cursor:pointer;font-weight:600;">
                        ${Utils.escapeHtml(m.name)} 
                        <span class="badge badge-${m.member_type}" style="margin-left:4px">${m.member_type === 'regular' ? '상시' : '출장'}</span>
                    </label>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <span style="font-size:0.8rem;color:var(--text-muted);">순위:</span>
                        <input type="number" id="gr-${m.id}" placeholder="나중에 입력 가능" min="1" max="10" value="${rankVal}" style="width:110px;text-align:center;" class="game-rank-input">
                    </div>
                </div>
            `;
        }).join('');

        const defaultDate = editGame ? editGame.game_date : Utils.today();

        Modal.open(editGame ? '🏆 게임 기록 & 순위 수정' : '⛳ 게임 기록 입력 (1차: 참석자 등록)', `
            <div class="form-grid">
                <div class="form-group">
                    <label>게임 날짜</label>
                    <input type="date" id="game-date" value="${defaultDate}">
                </div>
                <div class="form-group">
                    <label>장소</label>
                    <input type="text" id="game-location" value="${editGame ? Utils.escapeHtml(editGame.location) : '스크린골프장'}">
                </div>
                <div class="form-group">
                    <label>총 비용 (VND)</label>
                    <input type="text" id="game-cost" value="${editGame ? Utils.formatVND(editGame.total_cost).replace('₫','').trim() : ''}" placeholder="예: 800000" inputmode="numeric">
                </div>
            </div>
            <div id="game-modal-calc-info"></div>
            <div class="form-group mt-md">
                <label>👥 참석자 선택 및 순위 입력 <span style="font-size:0.8rem;color:#38bdf8;font-weight:normal;">(💡 1차로 참석자만 체크하고 저장 후, 나중에 순위를 넣으셔도 됩니다!)</span></label>
                <div style="max-height:280px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:8px 12px;margin-top:6px;background:var(--bg-secondary);">
                    ${members.length > 0 ? memberChecks : '<p class="text-muted">먼저 멤버를 추가해주세요</p>'}
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모</label>
                <input type="text" id="game-memo" value="${editGame ? Utils.escapeHtml(editGame.memo || '') : ''}" placeholder="메모 (선택)">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-game">${editGame ? '수정 완료' : '저장'}</button>
        `);

        const checkAndRenderCalcNotice = async () => {
            const dateVal = document.getElementById('game-date').value;
            const calcInfoElem = document.getElementById('game-modal-calc-info');
            if (!dateVal || !calcInfoElem) return;

            const calc = await Store.getCalcHistoryByDate(dateVal);
            if (calc) {
                const rankSummary = (calc.rank_amounts || []).map((amt, idx) => `[${idx + 1}등: ${Utils.formatVND(amt)}]`).join('  ');
                calcInfoElem.innerHTML = `
                    <div style="padding:10px 14px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);border-radius:8px;margin-top:10px;">
                        <div style="font-weight:700;color:#10b981;display:flex;align-items:center;gap:6px;">
                            📊 [${calc.calc_date}] 회비 산출 시트 연동됨 (총 비용: ${Utils.formatVND(calc.total_cost)})
                        </div>
                        <div style="font-size:0.83rem;color:var(--text-primary);margin-top:4px;">
                            💡 <strong>등수별 회비 지불금:</strong> ${rankSummary}
                        </div>
                    </div>
                `;
            } else {
                calcInfoElem.innerHTML = `
                    <div style="padding:8px 12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;margin-top:10px;font-size:0.82rem;color:#f59e0b;">
                        ⚠️ 해당 날짜(${dateVal})로 저장된 회비 산출 시트가 없습니다. [회비 산출 시트] 탭에서 [💾 이 날짜로 저장] 하시면 게임 기록에 지불 금액이 연동됩니다!
                    </div>
                `;
            }
        };

        checkAndRenderCalcNotice();
        document.getElementById('game-date').addEventListener('change', checkAndRenderCalcNotice);

        document.getElementById('btn-save-game').addEventListener('click', async () => {
            const gameDate = document.getElementById('game-date').value;
            const calc = await Store.getCalcHistoryByDate(gameDate);

            const game = {
                game_date: gameDate,
                location: document.getElementById('game-location').value.trim() || '스크린골프장',
                total_cost: calc ? calc.total_cost : Utils.parseAmount(document.getElementById('game-cost').value),
                memo: document.getElementById('game-memo').value.trim()
            };
            if (!game.game_date) { Utils.toast('날짜를 입력해주세요', 'error'); return; }

            const participants = [];
            document.querySelectorAll('.game-member-check:checked').forEach(cb => {
                const mid = Number(cb.value);
                const rankVal = document.getElementById(`gr-${mid}`).value.trim();
                const rank = rankVal !== '' ? Number(rankVal) : null;
                participants.push({ member_id: mid, ranking: rank });
            });

            if (participants.length === 0) { Utils.toast('참여자를 선택해주세요', 'error'); return; }

            let result;
            if (editGame) {
                result = await Store.updateGame(editGame.id, game, participants);
            } else {
                result = await Store.addGame(game, participants);
            }

            if (result) {
                Utils.toast(editGame ? '게임 기록 및 순위가 수정되었습니다!' : '게임 기록이 저장되었습니다!', 'success');
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

    membersMap: {},

    // ─── 멤버 관리 탭 ───
    async renderMembers(container) {
        const members = await Store.getMembers();
        this.membersMap = {};
        members.forEach(m => this.membersMap[m.id] = m);

        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">모임 멤버</span>
                <button class="btn btn-primary" id="btn-add-member">+ 멤버 추가</button>
            </div>
            <div class="club-members-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:16px;">
                ${members.map(m => {
                    const avatarText = m.nickname ? Utils.escapeHtml(m.nickname) : (m.name.length >= 3 ? m.name.slice(-2) : m.name);
                    const typeBadge = m.member_type === 'regular'
                        ? `<span style="background:rgba(16,185,129,0.18);color:#34d399;border:1px solid rgba(16,185,129,0.35);font-size:0.82rem;font-weight:700;padding:2px 8px;border-radius:6px;white-space:nowrap;">상시</span>`
                        : `<span style="background:rgba(139,92,246,0.18);color:#c084fc;border:1px solid rgba(139,92,246,0.35);font-size:0.82rem;font-weight:700;padding:2px 8px;border-radius:6px;white-space:nowrap;">출장</span>`;
                    const statusBadge = m.status === 'active'
                        ? `<span style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.78rem;padding:2px 6px;border-radius:6px;white-space:nowrap;">활동중</span>`
                        : (m.status === 'inactive' ? `<span style="background:rgba(148,163,184,0.15);color:#94a3b8;font-size:0.78rem;padding:2px 6px;border-radius:6px;white-space:nowrap;">비활동</span>` : `<span style="background:rgba(244,63,94,0.15);color:#f43f5e;font-size:0.78rem;padding:2px 6px;border-radius:6px;white-space:nowrap;">퇴사</span>`);

                    return `
                    <div class="member-card" style="padding:16px;background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95));border:1px solid rgba(99,102,241,0.28);border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                            <div class="member-avatar" style="height:44px;min-width:52px;padding:0 14px;font-size:0.95rem;font-weight:700;border-radius:22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 12px rgba(99,102,241,0.35);color:#ffffff;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;">${avatarText}</div>
                            <div style="overflow:hidden;flex:1;">
                                <div style="font-weight:700;font-size:1.08rem;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(m.name)}</div>
                                <div style="display:flex;align-items:center;gap:6px;margin-top:4px;white-space:nowrap;">
                                    ${typeBadge}
                                    ${statusBadge}
                                </div>
                            </div>
                        </div>
                        <div style="font-size:0.88rem;color:#cbd5e1;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:6px 10px;background:rgba(15,23,42,0.6);border-radius:8px;border:1px solid rgba(255,255,255,0.05);margin-bottom:12px;">
                            소속: <strong>${Utils.escapeHtml(m.company)}</strong> • 합류: ${Utils.formatDate(m.join_date)}
                        </div>
                        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
                            <button class="btn btn-ghost btn-sm" onclick="ClubPage.openMemberModal(${m.id})">✏️ 아이디/수정</button>
                            ${m.status === 'active' ? `<button class="btn btn-ghost btn-sm" onclick="ClubPage.updateMemberStatus(${m.id},'inactive')">비활동</button>` : ''}
                            ${m.status === 'inactive' ? `<button class="btn btn-success btn-sm" onclick="ClubPage.updateMemberStatus(${m.id},'active')">복귀</button>` : ''}
                            ${m.status !== 'departed' ? `<button class="btn btn-danger btn-sm" onclick="ClubPage.updateMemberStatus(${m.id},'departed')">퇴사</button>` : ''}
                        </div>
                    </div>
                `}).join('') || '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><p class="empty-text">멤버가 없습니다</p></div>'}
            </div>`;

        document.getElementById('btn-add-member').addEventListener('click', () => this.openMemberModal());
    },

    async openMemberModal(memberId = null) {
        const editMember = memberId ? this.membersMap[memberId] : null;

        Modal.open(editMember ? '👥 멤버 정보 & 아이디 수정' : '👥 멤버 추가', `
            <div class="form-grid">
                <div class="form-group">
                    <label>이름 (풀네임)</label>
                    <input type="text" id="mem-name" value="${editMember ? Utils.escapeHtml(editMember.name) : ''}" placeholder="예: 김상국">
                </div>
                <div class="form-group">
                    <label>아이디 / 닉네임 <span style="font-size:0.78rem;color:#38bdf8;">(아바타 동그라미에 표시)</span></label>
                    <input type="text" id="mem-nickname" value="${editMember ? Utils.escapeHtml(editMember.nickname || '') : ''}" placeholder="예: 상국, SK (미입력시 '상국'으로 자동 표시)">
                </div>
                <div class="form-group">
                    <label>소속</label>
                    <input type="text" id="mem-company" value="${editMember ? Utils.escapeHtml(editMember.company) : '현지'}" placeholder="현지/본사">
                </div>
                <div class="form-group">
                    <label>유형</label>
                    <select id="mem-type">
                        <option value="regular" ${editMember && editMember.member_type === 'regular' ? 'selected' : ''}>상시 멤버</option>
                        <option value="temporary" ${editMember && editMember.member_type === 'temporary' ? 'selected' : ''}>단기 출장자</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>합류일</label>
                    <input type="date" id="mem-join" value="${editMember ? editMember.join_date : Utils.today()}">
                </div>
            </div>
            <div class="form-group mt-md">
                <label>메모</label>
                <input type="text" id="mem-memo" value="${editMember ? Utils.escapeHtml(editMember.memo || '') : ''}" placeholder="메모 (선택)">
            </div>
        `, `
            <button class="btn btn-ghost" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" id="btn-save-mem">${editMember ? '수정 완료' : '저장'}</button>
        `);

        document.getElementById('btn-save-mem').addEventListener('click', async () => {
            const data = {
                name: document.getElementById('mem-name').value.trim(),
                nickname: document.getElementById('mem-nickname').value.trim(),
                company: document.getElementById('mem-company').value.trim() || '현지',
                member_type: document.getElementById('mem-type').value,
                join_date: document.getElementById('mem-join').value,
                memo: document.getElementById('mem-memo').value.trim()
            };
            if (!data.name || !data.join_date) { Utils.toast('이름과 합류일을 입력해주세요', 'error'); return; }

            let result;
            if (editMember) {
                result = await Store.updateMember(editMember.id, data);
            } else {
                result = await Store.addMember(data);
            }

            if (result) { 
                Utils.toast(editMember ? '멤버 정보 및 아이디가 수정되었습니다' : '멤버가 추가되었습니다', 'success'); 
                Modal.close(); 
                this.renderTab(); 
            }
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

            <div class="dues-vertical-list" style="display:flex;flex-direction:column;gap:10px;">
                ${dues.length > 0 ? dues.map(d => `
                    <div class="dues-vertical-item" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95));border:1px solid rgba(99,102,241,0.25);border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.15);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:1.4rem;">${d.type === 'deposit' ? '📥' : '📤'}</span>
                            <div>
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <strong style="font-size:0.95rem;color:#f8fafc;">${Utils.escapeHtml(d.club_members?.name || '?')}</strong>
                                    <span class="badge badge-${d.type === 'deposit' ? 'income' : 'expense'}" style="font-size:0.75rem;">${d.type === 'deposit' ? '입금' : '사용'}</span>
                                </div>
                                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
                                    ${Utils.formatDateKR(d.dues_date)} ${d.memo ? '• ' + Utils.escapeHtml(d.memo) : ''}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span class="${d.type === 'deposit' ? 'text-emerald' : 'text-rose'}" style="font-weight:700;font-size:1.05rem;">
                                ${d.type === 'deposit' ? '+' : '-'}${Utils.formatVND(d.amount)}
                            </span>
                            <button class="btn btn-danger btn-sm" onclick="ClubPage.deleteDues(${d.id})" title="삭제">🗑️</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state"><div class="empty-icon">💵</div><p class="empty-text">회비 내역이 없습니다</p></div>'}
            </div>`;

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
            <div class="section-header"><span class="section-title">🏆 멤버별 성적 & 랭킹 통계</span></div>
            ${stats.length > 0 ? `
            <div class="ranking-vertical-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:14px;margin-bottom:20px;">
                ${stats.map((s, idx) => {
                    const medal = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : ''));
                    return `
                    <div class="ranking-vertical-card" style="padding:16px;background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95));border:1px solid rgba(99,102,241,0.28);border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.18);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <span style="font-weight:700;font-size:1.08rem;color:#f8fafc;">${medal}${Utils.escapeHtml(s.name)}</span>
                            <span class="badge badge-income" style="font-size:0.8rem;font-weight:700;">🎮 ${s.games}회 참여</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px;background:rgba(15,23,42,0.6);border-radius:10px;text-align:center;font-size:0.82rem;">
                            <div>
                                <div style="color:var(--text-muted);">평균순위</div>
                                <div style="font-weight:700;color:#38bdf8;font-size:1rem;margin-top:2px;">${s.avgRank}등</div>
                            </div>
                            <div>
                                <div style="color:var(--text-muted);">최고순위</div>
                                <div style="font-weight:700;color:#34d399;font-size:1rem;margin-top:2px;">${s.best}등</div>
                            </div>
                            <div>
                                <div style="color:var(--text-muted);">최저순위</div>
                                <div style="font-weight:700;color:#f43f5e;font-size:1rem;margin-top:2px;">${s.worst}등</div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>` : '<div class="empty-state"><div class="empty-icon">🏆</div><p class="empty-text">게임 기록이 없습니다</p></div>'}

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
    },

    // ─── 회비 산출 시트 탭 ───
    calcState: {
        count: 5,
        golfMode: 'per_person', // 'per_person' 또는 'total'
        golfVal: 550000,
        mealVal: 2120000,
        ratios: [10, 15, 20, 25, 30]
    },

    getDefaultRatios(count) {
        const presets = {
            3: [20, 30, 50],
            4: [10, 20, 30, 40],
            5: [10, 15, 20, 25, 30],
            6: [5, 10, 15, 20, 23, 27],
            7: [5, 8, 11, 14, 17, 21, 24],
            8: [4, 7, 9, 11, 13, 16, 19, 21]
        };
        if (presets[count]) return [...presets[count]];
        // 기본 그라데이션 자동 생성
        const base = Math.floor(100 / count);
        const res = new Array(count).fill(base);
        let rem = 100 - (base * count);
        for (let i = count - 1; i >= 0 && rem > 0; i--, rem--) {
            res[i]++;
        }
        return res;
    },

    async renderCalculator(container) {
        container.innerHTML = `
            <div class="calc-sheet-container">
                <!-- 날짜 및 이력 저장 컨트롤 카드 -->
                <div class="card mb-lg" style="background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95)); border: 1px solid rgba(99,102,241,0.35); box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <span class="card-title" style="color:#38bdf8;font-size:1.05rem;">📅 회비 산출 시트 이력 관리 & 게임 일정 연동</span>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-emerald btn-sm" id="btn-save-calc">💾 이 날짜로 산출 내역 저장</button>
                            <button class="btn btn-ghost btn-sm" id="btn-history-calc">📜 저장 이력 보기</button>
                        </div>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 200px 1fr; gap:16px;">
                        <div class="form-group">
                            <label>산출 날짜 지정</label>
                            <input type="date" id="calc-date" value="${this.calcState.date || Utils.today()}" class="calc-input-field" style="border-color:#38bdf8;font-weight:700;">
                        </div>
                        <div class="form-group">
                            <label>모임/게임 타이틀 (메모)</label>
                            <input type="text" id="calc-memo" value="${Utils.escapeHtml(this.calcState.memo || '스크린골프 및 식사 모임')}" placeholder="예: 07/22 4인 스크린" class="calc-input-field">
                        </div>
                    </div>
                </div>

                <!-- 헤더 및 입력 설정 -->
                <div class="card mb-lg">
                    <div class="card-header">
                        <span class="card-title">⛳ 스크린 & 식사비 회비 산출 설정</span>
                        <div class="preset-badge-group">
                            <button class="btn btn-sm btn-ghost" id="btn-preset-default">⚡ 기본 차등배분형</button>
                            <button class="btn btn-sm btn-ghost" id="btn-preset-equal">⚖️ 1/N 균등배분</button>
                        </div>
                    </div>
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                        <div class="form-group">
                            <label>참여 인원수</label>
                            <select id="calc-count" class="calc-input-field">
                                ${[3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${this.calcState.count === n ? 'selected' : ''}>${n}명</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>골프비 입력 방식</label>
                            <select id="calc-golf-mode" class="calc-input-field">
                                <option value="per_person" ${this.calcState.golfMode === 'per_person' ? 'selected' : ''}>1인당 스크린 비용</option>
                                <option value="total" ${this.calcState.golfMode === 'total' ? 'selected' : ''}>총 스크린 비용</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label id="lbl-golf-val">${this.calcState.golfMode === 'per_person' ? '1인당 골프비 (VND)' : '총 골프비 (VND)'}</label>
                            <input type="text" id="calc-golf-val" value="${Utils.formatVND(this.calcState.golfVal).replace('₫','').trim()}" inputmode="numeric" class="calc-input-field">
                        </div>
                        <div class="form-group">
                            <label>식사비 총액 MAX (VND)</label>
                            <input type="text" id="calc-meal-val" value="${Utils.formatVND(this.calcState.mealVal).replace('₫','').trim()}" inputmode="numeric" class="calc-input-field">
                        </div>
                    </div>
                </div>

                <!-- 등수별 회비 산출 시트 (엑셀 스타일) -->
                <div class="card mb-lg">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="card-title">📊 등수별 회비 산출 시트</span>
                        <div id="ratio-sum-status"></div>
                    </div>
                    <div class="table-wrapper">
                        <table class="calc-sheet-table" id="calc-table">
                            <!-- 동적 렌더링 -->
                        </table>
                    </div>
                </div>

                <!-- 산뜻하고 깔끔한 등수별 정산 요약 카드 시트 -->
                <div class="card">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="card-title">✨ 최종 등수별 회비 납부 정산 시트</span>
                        <button class="btn btn-emerald btn-sm" id="btn-copy-notice">📋 단톡방 공지 문구 복사</button>
                    </div>
                    <div id="notice-preview-visual" class="fresh-summary-sheet">
                        <!-- 동적 시트 렌더링 -->
                    </div>
                    <textarea id="notice-raw-text" style="display:none;"></textarea>
                </div>
            </div>
        `;

        this.bindCalcEvents();
        this.updateCalcTable();
    },

    bindCalcEvents() {
        const countSelect = document.getElementById('calc-count');
        const golfModeSelect = document.getElementById('calc-golf-mode');
        const golfValInput = document.getElementById('calc-golf-val');
        const mealValInput = document.getElementById('calc-meal-val');

        const dateInput = document.getElementById('calc-date');
        const memoInput = document.getElementById('calc-memo');

        if (dateInput) dateInput.addEventListener('change', (e) => this.calcState.date = e.target.value);
        if (memoInput) memoInput.addEventListener('input', (e) => this.calcState.memo = e.target.value);

        countSelect.addEventListener('change', (e) => {
            const count = Number(e.target.value);
            this.calcState.count = count;
            this.calcState.ratios = this.getDefaultRatios(count);
            this.updateCalcTable();
        });

        golfModeSelect.addEventListener('change', (e) => {
            this.calcState.golfMode = e.target.value;
            document.getElementById('lbl-golf-val').textContent = 
                this.calcState.golfMode === 'per_person' ? '1인당 골프비 (VND)' : '총 골프비 (VND)';
            this.updateCalcTable();
        });

        golfValInput.addEventListener('input', () => {
            this.calcState.golfVal = Utils.parseAmount(golfValInput.value);
            this.updateCalcTable();
        });

        mealValInput.addEventListener('input', () => {
            this.calcState.mealVal = Utils.parseAmount(mealValInput.value);
            this.updateCalcTable();
        });

        document.getElementById('btn-preset-default').addEventListener('click', () => {
            this.calcState.ratios = this.getDefaultRatios(this.calcState.count);
            this.updateCalcTable();
            Utils.toast('기본 차등 배분 비율이 적용되었습니다', 'info');
        });

        document.getElementById('btn-preset-equal').addEventListener('click', () => {
            const count = this.calcState.count;
            const avg = Number((100 / count).toFixed(1));
            const ratios = new Array(count).fill(avg);
            const diff = 100 - (avg * count);
            if (diff !== 0) ratios[count - 1] = Number((ratios[count - 1] + diff).toFixed(1));
            this.calcState.ratios = ratios;
            this.updateCalcTable();
            Utils.toast('1/N 균등 배분 비율이 적용되었습니다', 'info');
        });

        document.getElementById('btn-save-calc').addEventListener('click', async () => {
            const calcDate = document.getElementById('calc-date').value;
            const calcMemo = document.getElementById('calc-memo').value.trim() || '스크린골프 모임';
            if (!calcDate) { Utils.toast('날짜를 선택해주세요', 'error'); return; }

            const { count, golfMode, golfVal, mealVal, ratios } = this.calcState;
            const golfTotal = golfMode === 'per_person' ? golfVal * count : golfVal;
            const mealTotal = mealVal;
            const grandTotal = golfTotal + mealTotal;

            const rankAmounts = [];
            for (let i = 0; i < count; i++) {
                const r = (ratios[i] || 0) / 100;
                const gAmt = Math.round(golfTotal * r);
                const mAmt = Math.round(mealTotal * r);
                rankAmounts.push(gAmt + mAmt);
            }

            const item = {
                calc_date: calcDate,
                title: calcMemo,
                player_count: count,
                golf_mode: golfMode,
                golf_val: golfVal,
                meal_val: mealVal,
                total_cost: grandTotal,
                ratios: ratios,
                rank_amounts: rankAmounts
            };

            await Store.saveCalcHistory(item);
            Utils.toast(`[${calcDate}] 회비 산출 내역이 성공적으로 저장되었습니다!`, 'success');
        });

        document.getElementById('btn-history-calc').addEventListener('click', async () => {
            this.openCalcHistoryModal();
        });

        document.getElementById('btn-copy-notice').addEventListener('click', () => {
            const rawElem = document.getElementById('notice-raw-text');
            const text = rawElem ? rawElem.value : '';
            navigator.clipboard.writeText(text).then(() => {
                Utils.toast('공지 문구가 클립보드에 복사되었습니다! 단톡방에 붙여넣으세요.', 'success');
            }).catch(() => {
                Utils.toast('복사 중 오류가 발생했습니다.', 'error');
            });
        });
    },

    async openCalcHistoryModal() {
        const histories = await Store.getCalcHistoryList();
        
        const cards = (histories || []).map(h => `
            <div style="padding:12px 14px;background:rgba(30,41,59,0.9);border:1px solid rgba(99,102,241,0.25);border-radius:12px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div>
                        <strong style="color:#f8fafc;font-size:0.95rem;">📅 ${Utils.formatDateKR(h.calc_date)}</strong>
                        <span style="font-size:0.82rem;color:var(--text-muted);margin-left:6px;">(${h.player_count}명 / ${Utils.escapeHtml(h.title || '스크린골프')})</span>
                    </div>
                    <div style="font-weight:700;color:#38bdf8;font-size:0.95rem;">
                        ${Utils.formatVND(h.total_cost)}
                    </div>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);background:rgba(15,23,42,0.6);padding:6px 10px;border-radius:8px;margin-bottom:8px;">
                    ${(h.rank_amounts || []).map((amt, idx) => `<strong>${idx+1}등:</strong> ${Utils.formatVND(amt)}`).join(' &nbsp;|&nbsp; ')}
                </div>
                <div style="display:flex;justify-content:flex-end;gap:6px;">
                    <button class="btn btn-emerald btn-sm" onclick="ClubPage.applyCalcHistory('${h.calc_date}')">불러오기</button>
                    <button class="btn btn-danger btn-sm" onclick="ClubPage.deleteCalcHistory('${h.id}')" title="삭제">🗑️ 삭제</button>
                </div>
            </div>
        `).join('');

        Modal.open('📜 저장된 회비 산출 이력', `
            <div style="max-height:65vh;overflow-y:auto;">
                ${cards || '<div class="text-muted" style="text-align:center;padding:20px;">저장된 산출 이력이 없습니다</div>'}
            </div>
        `, `<button class="btn btn-ghost" onclick="Modal.close()">닫기</button>`);
    },

    async applyCalcHistory(calcDate) {
        const h = await Store.getCalcHistoryByDate(calcDate);
        if (!h) return;
        this.calcState.count = h.player_count;
        this.calcState.golfMode = h.golf_mode;
        this.calcState.golfVal = h.golf_val;
        this.calcState.mealVal = h.meal_val;
        this.calcState.ratios = h.ratios;
        this.calcState.date = h.calc_date;
        this.calcState.memo = h.title;
        Modal.close();
        this.renderTab();
        Utils.toast(`[${calcDate}] 산출 내역을 불러왔습니다!`, 'success');
    },

    async deleteCalcHistory(id) {
        const ok = await Modal.confirm('이력 삭제', '이 회비 산출 이력을 삭제하시겠습니까?');
        if (ok) {
            await Store.deleteCalcHistory(id);
            Utils.toast('삭제되었습니다', 'success');
            this.openCalcHistoryModal();
        }
    },

    updateCalcTable(options = {}) {
        const { count, golfMode, golfVal, mealVal, ratios } = this.calcState;

        // 골프 총액 계산
        const golfTotal = golfMode === 'per_person' ? golfVal * count : golfVal;
        const mealTotal = mealVal;
        const ttlGrandTotal = golfTotal + mealTotal;

        // 비율 합계 검증
        const ratioSum = ratios.reduce((sum, r) => sum + (Number(r) || 0), 0);
        const ratioSumFixed = Number(ratioSum.toFixed(1));
        const statusElem = document.getElementById('ratio-sum-status');
        if (statusElem) {
            if (Math.abs(ratioSumFixed - 100) < 0.1) {
                statusElem.innerHTML = `<span class="badge badge-income">✅ 배분 비율 합계: 100%</span>`;
            } else {
                statusElem.innerHTML = `<span class="badge badge-expense">⚠️ 합계: ${ratioSumFixed}% (100%로 맞추어 주세요)</span>`;
            }
        }

        // 등수별 금액 계산
        const golfPerRank = [];
        const mealPerRank = [];
        const ttlPerRank = [];

        for (let i = 0; i < count; i++) {
            const r = (ratios[i] || 0) / 100;
            const gAmt = Math.round(golfTotal * r);
            const mAmt = Math.round(mealTotal * r);
            const tAmt = gAmt + mAmt;

            golfPerRank.push(gAmt);
            mealPerRank.push(mAmt);
            ttlPerRank.push(tAmt);
        }

        // DOM 갱신 (keepDOM이 false이거나 없으면 전체 HTML 생성, true이면 숫치 셀만 업데이트하여 입력 포커스 유지)
        if (!options.keepDOM) {
            let cardsHtml = `
                <div class="calc-rank-vertical-list" style="display:flex;flex-direction:column;gap:10px;">
                    ${Array.from({ length: count }, (_, i) => {
                        const medal = i === 0 ? '🥇 ' : (i === 1 ? '🥈 ' : (i === 2 ? '🥉 ' : ''));
                        return `
                        <div class="calc-rank-card" style="padding:12px 14px;background:linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));border:1px solid rgba(99,102,241,0.35);border-radius:14px;box-shadow:0 3px 10px rgba(0,0,0,0.2);">
                            <!-- 상단: 등수 및 비율 변경 -->
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="font-weight:800;font-size:1.05rem;color:#f8fafc;">${medal}${i + 1}등</span>
                                    <span style="font-size:0.8rem;color:#38bdf8;font-weight:600;">(배분 비율: ${ratios[i] || 0}%)</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <span style="font-size:0.78rem;color:var(--text-muted);">비율 변경:</span>
                                    <div class="ratio-input-wrapper" style="width:64px;padding:2px 4px;min-width:64px;">
                                        <input type="text" 
                                               inputmode="decimal" 
                                               pattern="[0-9.]*"
                                               class="ratio-input" 
                                               data-rank="${i}" 
                                               value="${ratios[i] || 0}" 
                                               style="width:36px!important;min-width:36px!important;font-size:0.92rem!important;"
                                               autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                                        <span class="percent-sign" style="font-size:0.8rem;">%</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 세부 항목: 골프비 & 식사비 -->
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.83rem;color:var(--text-muted);margin-bottom:8px;padding:0 2px;">
                                <span>⛳ 골프비: <strong class="calc-g-val-${i}" style="color:#38bdf8;font-weight:700;">${Utils.formatVND(golfPerRank[i])}</strong></span>
                                <span>🍜 식사비: <strong class="calc-m-val-${i}" style="color:#c084fc;font-weight:700;">${Utils.formatVND(mealPerRank[i])}</strong></span>
                            </div>

                            <!-- 🔥 등수별 최종 지불 합계 금액 하이라이트 바 🔥 -->
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.25));border:1px solid rgba(16,185,129,0.4);border-radius:10px;">
                                <span style="font-weight:700;font-size:0.88rem;color:#34d399;">💰 ${i + 1}등 최종 지불 합계:</span>
                                <span class="calc-t-val-${i}" style="font-weight:900;font-size:1.1rem;color:#ffffff;text-shadow:0 1px 4px rgba(0,0,0,0.4);">${Utils.formatVND(ttlPerRank[i])}</span>
                            </div>
                        </div>
                        `;
                    }).join('')}

                    <!-- 전체 총액 합계 콤팩트 카드 -->
                    <div style="padding:12px 14px;background:linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.2));border:1px solid rgba(99,102,241,0.4);border-radius:14px;margin-top:4px;">
                        <div style="font-weight:800;font-size:0.98rem;color:#f8fafc;margin-bottom:8px;">📊 전체 총액 (Total)</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.84rem;">
                            <div>비율 합계: <strong class="cell-total-ratio" style="color:#38bdf8;">${ratioSumFixed}%</strong></div>
                            <div>총 골프비: <strong class="calc-g-ttl" style="color:#38bdf8;">${Utils.formatVND(golfTotal)}</strong></div>
                            <div>총 식사비: <strong class="calc-m-ttl" style="color:#c084fc;">${Utils.formatVND(mealTotal)}</strong></div>
                            <div>총 회비: <strong class="calc-t-ttl" style="color:#34d399;font-size:1.02rem;font-weight:800;">${Utils.formatVND(ttlGrandTotal)}</strong></div>
                        </div>
                    </div>
                </div>
            `;

            const tableElem = document.getElementById('calc-table');
            if (tableElem) tableElem.innerHTML = cardsHtml;

            // 비율 input 이벤트 바인딩 (input & change 반응)
            document.querySelectorAll('.ratio-input').forEach(input => {
                const handleRatioChange = (e) => {
                    const idx = Number(e.target.dataset.rank);
                    const cleanStr = e.target.value.replace(/[^0-9.]/g, '');
                    const val = parseFloat(cleanStr);
                    this.calcState.ratios[idx] = isNaN(val) ? 0 : val;
                    this.updateCalcTable({ keepDOM: true });
                };
                input.addEventListener('input', handleRatioChange);
                input.addEventListener('change', handleRatioChange);
            });
        } else {
            // keepDOM 모드: 기존 input을 유지하며 계산 셀만 업데이트
            const tableElem = document.getElementById('calc-table');
            if (tableElem) {
                for (let i = 0; i < count; i++) {
                    const gCell = tableElem.querySelector(`.calc-g-val-${i}`);
                    if (gCell) gCell.textContent = Utils.formatVND(golfPerRank[i]);

                    const mCell = tableElem.querySelector(`.calc-m-val-${i}`);
                    if (mCell) mCell.textContent = Utils.formatVND(mealPerRank[i]);

                    const tCell = tableElem.querySelector(`.calc-t-val-${i}`);
                    if (tCell) tCell.textContent = Utils.formatVND(ttlPerRank[i]);
                }
                const gTtlCell = tableElem.querySelector('.calc-g-ttl');
                if (gTtlCell) gTtlCell.textContent = Utils.formatVND(golfTotal);

                const mTtlCell = tableElem.querySelector('.calc-m-ttl');
                if (mTtlCell) mTtlCell.textContent = Utils.formatVND(mealTotal);

                const tTtlCell = tableElem.querySelector('.calc-t-ttl');
                if (tTtlCell) tTtlCell.textContent = Utils.formatVND(ttlGrandTotal);

                const ratioTotalCell = tableElem.querySelector('.cell-total-ratio');
                if (ratioTotalCell) ratioTotalCell.textContent = `${ratioSumFixed}%`;
            }
        }

        // 🎨 산뜻하고 깔끔한 비주얼 카드 시트 생성
        const visualElem = document.getElementById('notice-preview-visual');
        const rawElem = document.getElementById('notice-raw-text');

        if (visualElem) {
            const medalClasses = ['rank-gold', 'rank-silver', 'rank-bronze'];
            const medalIcons = ['🥇', '🥈', '🥉'];

            const rankCardsHtml = ttlPerRank.map((amt, idx) => {
                const rankClass = medalClasses[idx] || 'rank-normal';
                const medalIcon = medalIcons[idx] || `${idx + 1}등`;

                return `
                    <div class="rank-fee-card ${rankClass}">
                        <div class="rank-fee-header">
                            <span class="rank-fee-badge">${medalIcon}</span>
                            <span class="rank-fee-ratio">${ratios[idx]}% 배분</span>
                        </div>
                        <div class="rank-fee-amount">${Utils.formatVND(amt)}</div>
                        <div class="rank-fee-sub">골프 ${Utils.formatVND(golfPerRank[idx])} + 식사 ${Utils.formatVND(mealPerRank[idx])}</div>
                    </div>
                `;
            }).join('');

            visualElem.innerHTML = `
                <!-- 요약 배너 -->
                <div class="fresh-summary-banner">
                    <div class="banner-item">
                        <span class="banner-label">👥 참석 인원</span>
                        <span class="banner-value">${count}명</span>
                    </div>
                    <div class="banner-item">
                        <span class="banner-label">⛳ 골프비 총액</span>
                        <span class="banner-value">${Utils.formatVND(golfTotal)}</span>
                    </div>
                    <div class="banner-item">
                        <span class="banner-label">🍜 식사비 MAX</span>
                        <span class="banner-value">${Utils.formatVND(mealTotal)}</span>
                    </div>
                    <div class="banner-item highlight">
                        <span class="banner-label">💵 총 정산 예상 비용</span>
                        <span class="banner-value text-emerald">${Utils.formatVND(ttlGrandTotal)}</span>
                    </div>
                </div>

                <!-- 등수별 정산 카드 그리드 -->
                <div class="rank-fee-grid">
                    ${rankCardsHtml}
                </div>
            `;
        }

        // 카톡 단톡방 전용 예쁜 텍스트 시트 (표 형태) 생성
        if (rawElem) {
            const medalIcons = ['🥇', '🥈', '🥉'];
            const rankLines = ttlPerRank.map((amt, idx) => {
                const icon = medalIcons[idx] || '▫️';
                const rankName = `${icon} ${idx + 1}등`.padEnd(5, ' ');
                const ratioStr = `${ratios[idx]}%`.padStart(4, ' ');
                const amtStr = Utils.formatVND(amt).padStart(13, ' ');
                return `│ ${rankName} │ ${ratioStr} │ ${amtStr} │`;
            }).join('\n');

            rawElem.value = 
`⛳ [회사 모임 회비 정산 시트]
===================================
👥 참석 인원: ${count}명
⛳ 스크린 골프: ${Utils.formatVND(golfTotal)} ${golfMode === 'per_person' ? `(1인당 ${Utils.formatVND(golfVal)})` : ''}
🍜 식사비 (MAX): ${Utils.formatVND(mealTotal)}
💵 총 정산 비용: ${Utils.formatVND(ttlGrandTotal)}
-----------------------------------
┌   순위   ┬  비율  ┬    납부 금액 (VND)    ┐
├──────────┼────────┼───────────────────┤
${rankLines}
└──────────┴────────┴───────────────────┘
※ 게임 종료 후 최종 순위에 따라 입금해 주세요! 🙏`;
        }
    }
};

Router.register('club', ClubPage);
