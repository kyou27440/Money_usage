/* ============================================
   STORE.JS — Supabase 데이터 접근 레이어 (DAL)
   모든 DB CRUD를 이 파일에서 관리
   ============================================ */
if (typeof supabase === 'undefined' || typeof supabase.from !== 'function') {
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY || SUPABASE_ANON_KEY);
}

const Store = {

    // ─── 개인 가계부: 카테고리 ───

    async getCategories(type = null) {
        let q = supabase.from('personal_categories').select('*').eq('is_active', true).order('sort_order');
        if (type) q = q.eq('type', type);
        const { data, error } = await q;
        if (error) { console.error('getCategories:', error); return []; }
        return data;
    },

    async addCategory(cat) {
        const { data, error } = await supabase.from('personal_categories').insert(cat).select().single();
        if (error) { console.error('addCategory:', error); return null; }
        return data;
    },

    async updateCategory(id, updates) {
        updates.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from('personal_categories').update(updates).eq('id', id).select().single();
        if (error) { console.error('updateCategory:', error); return null; }
        return data;
    },

    async deleteCategory(id) {
        const { error } = await supabase.from('personal_categories').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) { console.error('deleteCategory:', error); return false; }
        return true;
    },

    // ─── 개인 가계부: 거래 ───

    async getTransactions(filters = {}) {
        let q = supabase.from('personal_transactions').select('*, personal_categories(name, icon)').order('tx_date', { ascending: false }).order('created_at', { ascending: false });
        if (filters.startDate) q = q.gte('tx_date', filters.startDate);
        if (filters.endDate) q = q.lte('tx_date', filters.endDate);
        if (filters.type) q = q.eq('type', filters.type);
        if (filters.category_id) q = q.eq('category_id', filters.category_id);
        if (filters.limit) q = q.limit(filters.limit);
        const { data, error } = await q;
        if (error) { console.error('getTransactions:', error); return []; }
        return data;
    },

    async addTransaction(tx) {
        const { data, error } = await supabase.from('personal_transactions').insert(tx).select('*, personal_categories(name, icon)').single();
        if (error) { console.error('addTransaction:', error); return null; }
        return data;
    },

    async updateTransaction(id, updates) {
        updates.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from('personal_transactions').update(updates).eq('id', id).select('*, personal_categories(name, icon)').single();
        if (error) { console.error('updateTransaction:', error); return null; }
        return data;
    },

    async deleteTransaction(id) {
        const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
        if (error) { console.error('deleteTransaction:', error); return false; }
        return true;
    },

    async getTransactionSummary(startDate, endDate) {
        const { data, error } = await supabase.from('personal_transactions').select('type, amount').gte('tx_date', startDate).lte('tx_date', endDate);
        if (error) { console.error('getTransactionSummary:', error); return { income: 0, expense: 0, balance: 0 }; }
        let income = 0, expense = 0;
        (data || []).forEach(t => { if (t.type === 'income') income += Number(t.amount); else expense += Number(t.amount); });
        return { income, expense, balance: income - expense };
    },

    async getTotalBalance() {
        const { data, error } = await supabase.from('personal_transactions').select('type, amount');
        if (error) { console.error('getTotalBalance:', error); return 0; }
        let balance = 0;
        (data || []).forEach(t => { balance += t.type === 'income' ? Number(t.amount) : -Number(t.amount); });
        return balance;
    },

    // ─── 모임: 멤버 ───

    _formatMemberForSave(memberData) {
        const copy = { ...memberData };
        const nick = copy.nickname ? copy.nickname.trim() : '';
        let userMemo = copy.memo ? copy.memo.replace(/\[nick:[^\]]*\]/g, '').trim() : '';
        if (nick) {
            copy.memo = `[nick:${nick}] ${userMemo}`.trim();
        } else {
            copy.memo = userMemo;
        }
        return copy;
    },

    _parseMember(member) {
        if (!member) return member;
        let nick = member.nickname || '';
        let memo = member.memo || '';
        if (!nick && memo && memo.includes('[nick:')) {
            const match = memo.match(/\[nick:([^\]]+)\]/);
            if (match) {
                nick = match[1];
                memo = memo.replace(/\[nick:[^\]]*\]/g, '').trim();
            }
        }
        return { ...member, nickname: nick, memo: memo };
    },

    async getMembers(statusFilter = null) {
        let q = supabase.from('club_members').select('*').order('name');
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data, error } = await q;
        if (error) { console.error('getMembers:', error); return []; }
        return (data || []).map(m => this._parseMember(m));
    },

    async addMember(member) {
        const prepared = this._formatMemberForSave(member);
        let { data, error } = await supabase.from('club_members').insert(prepared).select().single();
        if (error && error.message && error.message.includes('nickname')) {
            const copy = { ...prepared };
            delete copy.nickname;
            const res = await supabase.from('club_members').insert(copy).select().single();
            data = res.data;
            error = res.error;
        }
        if (error) { console.error('addMember:', error); return null; }
        return this._parseMember(data);
    },

    async updateMember(id, updates) {
        updates.updated_at = new Date().toISOString();
        const prepared = this._formatMemberForSave(updates);
        let { data, error } = await supabase.from('club_members').update(prepared).eq('id', id).select().single();
        if (error && error.message && error.message.includes('nickname')) {
            const copy = { ...prepared };
            delete copy.nickname;
            const res = await supabase.from('club_members').update(copy).eq('id', id).select().single();
            data = res.data;
            error = res.error;
        }
        if (error) { console.error('updateMember:', error); return null; }
        return this._parseMember(data);
    },

    // ─── 모임: 게임 ───

    async getGames(filters = {}) {
        let q = supabase.from('club_games').select('*, club_game_participants(*, club_members(name))').order('game_date', { ascending: false });
        if (filters.startDate) q = q.gte('game_date', filters.startDate);
        if (filters.endDate) q = q.lte('game_date', filters.endDate);
        if (filters.limit) q = q.limit(filters.limit);
        const { data, error } = await q;
        if (error) { console.error('getGames:', error); return []; }
        return data;
    },

    async addGame(game, participants) {
        const { data: g, error: ge } = await supabase.from('club_games').insert(game).select().single();
        if (ge) { console.error('addGame:', ge); return null; }
        if (participants && participants.length > 0) {
            const parts = participants.map(p => ({ ...p, game_id: g.id }));
            const { error: pe } = await supabase.from('club_game_participants').insert(parts);
            if (pe) console.error('addGameParticipants:', pe);
        }
        return g;
    },

    async updateGame(id, game, participants) {
        const { data: g, error: ge } = await supabase.from('club_games').update(game).eq('id', id).select().single();
        if (ge) { console.error('updateGame:', ge); return null; }
        await supabase.from('club_game_participants').delete().eq('game_id', id);
        if (participants && participants.length > 0) {
            const parts = participants.map(p => ({ ...p, game_id: id }));
            const { error: pe } = await supabase.from('club_game_participants').insert(parts);
            if (pe) console.error('updateGameParticipants:', pe);
        }
        return g;
    },

    async deleteGame(id) {
        const { error } = await supabase.from('club_games').delete().eq('id', id);
        if (error) { console.error('deleteGame:', error); return false; }
        return true;
    },

    // ─── 모임: 회비 ───

    async getDues(filters = {}) {
        let q = supabase.from('club_dues').select('*, club_members(name)').order('dues_date', { ascending: false });
        if (filters.member_id) q = q.eq('member_id', filters.member_id);
        if (filters.startDate) q = q.gte('dues_date', filters.startDate);
        if (filters.endDate) q = q.lte('dues_date', filters.endDate);
        const { data, error } = await q;
        if (error) { console.error('getDues:', error); return []; }
        return data;
    },

    async addDues(dues) {
        const { data, error } = await supabase.from('club_dues').insert(dues).select('*, club_members(name)').single();
        if (error) { console.error('addDues:', error); return null; }
        return data;
    },

    async deleteDues(id) {
        const { error } = await supabase.from('club_dues').delete().eq('id', id);
        if (error) { console.error('deleteDues:', error); return false; }
        return true;
    },

    async getDuesBalance() {
        const { data, error } = await supabase.from('club_dues').select('member_id, type, amount, club_members(name, status)');
        if (error) { console.error('getDuesBalance:', error); return []; }
        const map = {};
        (data || []).forEach(d => {
            const mid = d.member_id;
            if (!map[mid]) map[mid] = { member_id: mid, name: d.club_members?.name || '?', status: d.club_members?.status, balance: 0 };
            map[mid].balance += d.type === 'deposit' ? Number(d.amount) : -Number(d.amount);
        });
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
    },

    async getClubTotalBalance() {
        const { data, error } = await supabase.from('club_dues').select('type, amount');
        if (error) return 0;
        let bal = 0;
        (data || []).forEach(d => { bal += d.type === 'deposit' ? Number(d.amount) : -Number(d.amount); });
        return bal;
    },

    // ─── 모임: 순위 추이 ───

    async getRankingTrend(limit = 10) {
        const { data, error } = await supabase.from('club_games').select('id, game_date, club_game_participants(member_id, ranking, club_members(name))').order('game_date', { ascending: true }).limit(limit);
        if (error) { console.error('getRankingTrend:', error); return []; }
        return data;
    },

    async getMemberStats() {
        const { data, error } = await supabase.from('club_game_participants').select('member_id, ranking, club_members(name, status)');
        if (error) { console.error('getMemberStats:', error); return []; }
        const map = {};
        (data || []).forEach(p => {
            const mid = p.member_id;
            if (!map[mid]) map[mid] = { name: p.club_members?.name, status: p.club_members?.status, games: 0, totalRank: 0, best: Infinity, worst: 0 };
            map[mid].games++;
            if (p.ranking) {
                map[mid].totalRank += p.ranking;
                map[mid].best = Math.min(map[mid].best, p.ranking);
                map[mid].worst = Math.max(map[mid].worst, p.ranking);
            }
        });
        return Object.entries(map).map(([id, s]) => ({
            member_id: Number(id), name: s.name, status: s.status, games: s.games,
            avgRank: s.games > 0 ? (s.totalRank / s.games).toFixed(1) : '-',
            best: s.best === Infinity ? '-' : s.best, worst: s.worst || '-'
        })).sort((a, b) => (parseFloat(a.avgRank) || 99) - (parseFloat(b.avgRank) || 99));
    },

    // ─── 환전 ───

    async getExchanges(filters = {}) {
        let q = supabase.from('exchange_transactions').select('*').order('tx_date', { ascending: false });
        if (filters.startDate) q = q.gte('tx_date', filters.startDate);
        if (filters.endDate) q = q.lte('tx_date', filters.endDate);
        if (filters.person_name) q = q.eq('person_name', filters.person_name);
        if (filters.limit) q = q.limit(filters.limit);
        const { data, error } = await q;
        if (error) { console.error('getExchanges:', error); return []; }
        return data;
    },

    async addExchange(ex) {
        const { data, error } = await supabase.from('exchange_transactions').insert(ex).select().single();
        if (error) { console.error('addExchange:', error); return null; }
        return data;
    },

    async deleteExchange(id) {
        const { error } = await supabase.from('exchange_transactions').delete().eq('id', id);
        if (error) { console.error('deleteExchange:', error); return false; }
        return true;
    },

    async getExchangeTotal() {
        const { data, error } = await supabase.from('exchange_transactions').select('tx_type, amount_vnd, amount_krw');
        if (error) return { vnd: 0, krw: 0 };
        let vnd = 0, krw = 0;
        (data || []).forEach(e => {
            if (e.tx_type === 'VND_TO_KRW') { vnd -= Number(e.amount_vnd); krw += Number(e.amount_krw); }
            else { vnd += Number(e.amount_vnd); krw -= Number(e.amount_krw); }
        });
        return { vnd, krw };
    },

    // ─── 설정 ───

    async getSetting(key) {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
        if (error) return null;
        return data?.value;
    },

    async setSetting(key, value) {
        const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
        if (error) { console.error('setSetting:', error); return false; }
        return true;
    },

    async getAllSettings() {
        const { data, error } = await supabase.from('app_settings').select('*');
        if (error) return {};
        const map = {};
        (data || []).forEach(s => { map[s.key] = s.value; });
        return map;
    },

    // ─── 모임: 회비 산출 시트 이력 관리 ───

    _getLocalCalcHistory() {
        try {
            const raw = localStorage.getItem('club_calc_history_v1');
            return raw ? JSON.parse(raw) : [];
        } catch(e) {
            return [];
        }
    },

    _saveLocalCalcHistory(list) {
        try {
            localStorage.setItem('club_calc_history_v1', JSON.stringify(list));
        } catch(e) {}
    },

    async saveCalcHistory(calcItem) {
        calcItem.created_at = new Date().toISOString();
        calcItem.id = calcItem.id || 'calc_' + Date.now();

        let localList = this._getLocalCalcHistory();
        localList = localList.filter(item => item.calc_date !== calcItem.calc_date);
        localList.unshift(calcItem);
        this._saveLocalCalcHistory(localList);

        try {
            const { data, error } = await supabase.from('club_calc_history').upsert(calcItem).select().single();
            if (!error && data) return data;
        } catch(e) {}

        return calcItem;
    },

    async getCalcHistoryList() {
        try {
            const { data, error } = await supabase.from('club_calc_history').select('*').order('calc_date', { ascending: false });
            if (!error && data && data.length > 0) return data;
        } catch(e) {}

        return this._getLocalCalcHistory();
    },

    async getCalcHistoryByDate(dateStr) {
        const list = await this.getCalcHistoryList();
        return list.find(item => item.calc_date === dateStr) || null;
    },

    async deleteCalcHistory(id) {
        let localList = this._getLocalCalcHistory();
        localList = localList.filter(item => item.id !== id);
        this._saveLocalCalcHistory(localList);

        try {
            await supabase.from('club_calc_history').delete().eq('id', id);
        } catch(e) {}
        return true;
    }
};
