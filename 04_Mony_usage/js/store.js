/* ============================================
   STORE.JS — Supabase 데이터 접근 레이어 (DAL)
   모든 DB CRUD를 이 파일에서 관리
   ============================================ */
if (typeof supabase === 'undefined' || !supabase || typeof supabase.from !== 'function') {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch(e) {}
}

const Store = {
    // ── Safe Query Helper ──
    from(tableName) {
        if (typeof supabase === 'undefined' || !supabase || typeof supabase.from !== 'function') {
            try {
                if (window.supabase && window.supabase.createClient) {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                }
            } catch(e) {}
        }
        if (!supabase || typeof supabase.from !== 'function') {
            const dummy = {
                select: () => dummy,
                eq: () => dummy,
                gte: () => dummy,
                lte: () => dummy,
                order: () => dummy,
                limit: () => dummy,
                single: () => Promise.resolve({ data: null, error: null }),
                insert: () => dummy,
                update: () => dummy,
                delete: () => dummy,
                upsert: () => Promise.resolve({ error: null }),
                then: (resolve) => resolve({ data: [], error: null })
            };
            return dummy;
        }
        return supabase.from(tableName);
    },

    // ─── 개인 가계부: 카테고리 ───

    async getCategories(type = null) {
        let q = this.from('personal_categories').select('*').eq('is_active', true).order('sort_order');
        if (type) q = q.eq('type', type);
        const { data, error } = await q;
        if (error) { console.error('getCategories:', error); return []; }
        return data || [];
    },

    async addCategory(cat) {
        const { data, error } = await this.from('personal_categories').insert(cat).select().single();
        if (error) { console.error('addCategory:', error); return null; }
        return data;
    },

    async updateCategory(id, updates) {
        updates.updated_at = new Date().toISOString();
        const { data, error } = await this.from('personal_categories').update(updates).eq('id', id).select().single();
        if (error) { console.error('updateCategory:', error); return null; }
        return data;
    },

    async deleteCategory(id) {
        const { error } = await this.from('personal_categories').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) { console.error('deleteCategory:', error); return false; }
        return true;
    },

    // ─── 개인 가계부: 거래 ───

    async getTransactions(filters = {}) {
        let q = this.from('personal_transactions').select('*, personal_categories(name, icon)').order('tx_date', { ascending: false }).order('created_at', { ascending: false });
        if (filters.startDate) q = q.gte('tx_date', filters.startDate);
        if (filters.endDate) q = q.lte('tx_date', filters.endDate);
        if (filters.type) q = q.eq('type', filters.type);
        if (filters.category_id) q = q.eq('category_id', filters.category_id);
        if (filters.limit) q = q.limit(filters.limit);
        const { data, error } = await q;
        if (error) { console.error('getTransactions:', error); return []; }
        return data || [];
    },

    async addTransaction(tx) {
        const { data, error } = await this.from('personal_transactions').insert(tx).select('*, personal_categories(name, icon)').single();
        if (error) { console.error('addTransaction:', error); return null; }
        return data;
    },

    async updateTransaction(id, updates) {
        updates.updated_at = new Date().toISOString();
        const { data, error } = await this.from('personal_transactions').update(updates).eq('id', id).select('*, personal_categories(name, icon)').single();
        if (error) { console.error('updateTransaction:', error); return null; }
        return data;
    },

    async deleteTransaction(id) {
        const { error } = await this.from('personal_transactions').delete().eq('id', id);
        if (error) { console.error('deleteTransaction:', error); return false; }
        return true;
    },

    async getTransactionSummary(startDate, endDate) {
        const { data, error } = await this.from('personal_transactions').select('type, amount').gte('tx_date', startDate).lte('tx_date', endDate);
        if (error) { console.error('getTransactionSummary:', error); return { income: 0, expense: 0, balance: 0 }; }
        let income = 0, expense = 0;
        (data || []).forEach(t => { if (t.type === 'income') income += Number(t.amount); else expense += Number(t.amount); });
        return { income, expense, balance: income - expense };
    },

    async getTotalBalance() {
        const { data, error } = await this.from('personal_transactions').select('type, amount');
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

    _getLocalMembers() {
        try {
            const raw = localStorage.getItem('club_local_members_v1');
            return raw ? JSON.parse(raw) : [];
        } catch(e) { return []; }
    },

    _saveLocalMembers(list) {
        try {
            localStorage.setItem('club_local_members_v1', JSON.stringify(list));
        } catch(e) {}
    },

    async getMembers(statusFilter = null) {
        let dbList = [];
        try {
            let q = this.from('club_members').select('*').order('name');
            if (statusFilter) q = q.eq('status', statusFilter);
            const { data, error } = await q;
            if (!error && data && data.length > 0) dbList = data;
        } catch(e) {}

        const localList = this._getLocalMembers();
        const combinedMap = {};
        dbList.forEach(m => combinedMap[m.id] = m);
        localList.forEach(m => {
            if (statusFilter && m.status !== statusFilter) return;
            combinedMap[m.id] = m;
        });

        const finalList = Object.values(combinedMap);
        return finalList.map(m => this._parseMember(m));
    },

    async addMember(member) {
        member.status = member.status || 'active';
        member.created_at = member.created_at || new Date().toISOString();
        const prepared = this._formatMemberForSave(member);

        let dbMember = null;
        try {
            let { data, error } = await this.from('club_members').insert(prepared).select().single();
            if (error && error.message && error.message.includes('nickname')) {
                const copy = { ...prepared };
                delete copy.nickname;
                const res = await this.from('club_members').insert(copy).select().single();
                data = res.data;
            }
            if (data) dbMember = data;
        } catch(e) {}

        const savedMember = dbMember || { ...prepared, id: Date.now() };

        const localList = this._getLocalMembers();
        const existingIdx = localList.findIndex(m => String(m.id) === String(savedMember.id) || m.name === savedMember.name);
        if (existingIdx >= 0) {
            localList[existingIdx] = savedMember;
        } else {
            localList.push(savedMember);
        }
        this._saveLocalMembers(localList);

        return this._parseMember(savedMember);
    },

    async updateMember(id, updates) {
        updates.updated_at = new Date().toISOString();
        const prepared = this._formatMemberForSave(updates);

        let dbMember = null;
        try {
            let { data, error } = await this.from('club_members').update(prepared).eq('id', id).select().single();
            if (error && error.message && error.message.includes('nickname')) {
                const copy = { ...prepared };
                delete copy.nickname;
                const res = await this.from('club_members').update(copy).eq('id', id).select().single();
                data = res.data;
            }
            if (data) dbMember = data;
        } catch(e) {}

        const localList = this._getLocalMembers();
        let updatedItem = dbMember || { ...prepared, id: id };
        const existingIdx = localList.findIndex(m => String(m.id) === String(id));
        if (existingIdx >= 0) {
            updatedItem = { ...localList[existingIdx], ...prepared };
            localList[existingIdx] = updatedItem;
        } else {
            localList.push(updatedItem);
        }
        this._saveLocalMembers(localList);

        return this._parseMember(updatedItem);
    },

    // ─── 모임: 게임 ───

    _getLocalGames() {
        try {
            const raw = localStorage.getItem('club_local_games_v1');
            return raw ? JSON.parse(raw) : [];
        } catch(e) { return []; }
    },

    _saveLocalGames(list) {
        try {
            localStorage.setItem('club_local_games_v1', JSON.stringify(list));
        } catch(e) {}
    },

    async getGames(filters = {}) {
        let dbList = [];
        try {
            let q = this.from('club_games').select('*, club_game_participants(*, club_members(name))').order('game_date', { ascending: false });
            if (filters.startDate) q = q.gte('game_date', filters.startDate);
            if (filters.endDate) q = q.lte('game_date', filters.endDate);
            if (filters.limit) q = q.limit(filters.limit);
            const { data, error } = await q;
            if (!error && data && data.length > 0) dbList = data;
        } catch(e) {}

        const localList = this._getLocalGames();
        const combinedMap = {};
        dbList.forEach(g => combinedMap[g.id] = g);
        localList.forEach(g => combinedMap[g.id] = g);

        let list = Object.values(combinedMap).sort((a, b) => new Date(b.game_date) - new Date(a.game_date));
        if (filters.limit) list = list.slice(0, filters.limit);
        return list;
    },

    async addGame(game, participants) {
        let dbGame = null;
        try {
            const { data: g, error: ge } = await this.from('club_games').insert(game).select().single();
            if (!ge && g) {
                dbGame = g;
                if (participants && participants.length > 0) {
                    const parts = participants.map(p => ({ ...p, game_id: g.id }));
                    await this.from('club_game_participants').insert(parts);
                }
            }
        } catch(e) {}

        const members = await this.getMembers();
        const memMap = {};
        members.forEach(m => memMap[m.id] = m);

        const preparedParts = (participants || []).map(p => ({
            ...p,
            club_members: { name: memMap[p.member_id] ? memMap[p.member_id].name : '?' }
        }));

        const savedGame = dbGame ? { ...dbGame, club_game_participants: preparedParts } : { ...game, id: Date.now(), club_game_participants: preparedParts };

        const localList = this._getLocalGames();
        localList.unshift(savedGame);
        this._saveLocalGames(localList);

        return savedGame;
    },

    async updateGame(id, game, participants) {
        try {
            await this.from('club_games').update(game).eq('id', id);
            await this.from('club_game_participants').delete().eq('game_id', id);
            if (participants && participants.length > 0) {
                const parts = participants.map(p => ({ ...p, game_id: id }));
                await this.from('club_game_participants').insert(parts);
            }
        } catch(e) {}

        const members = await this.getMembers();
        const memMap = {};
        members.forEach(m => memMap[m.id] = m);

        const preparedParts = (participants || []).map(p => ({
            ...p,
            club_members: { name: memMap[p.member_id] ? memMap[p.member_id].name : '?' }
        }));

        const localList = this._getLocalGames();
        let updatedGame = { ...game, id: id, club_game_participants: preparedParts };
        const idx = localList.findIndex(g => String(g.id) === String(id));
        if (idx >= 0) {
            localList[idx] = updatedGame;
        } else {
            localList.unshift(updatedGame);
        }
        this._saveLocalGames(localList);

        return updatedGame;
    },

    async deleteGame(id) {
        try {
            await this.from('club_games').delete().eq('id', id);
        } catch(e) {}
        let localList = this._getLocalGames();
        localList = localList.filter(g => String(g.id) !== String(id));
        this._saveLocalGames(localList);
        return true;
    },

    // ─── 모임: 회비 ───

    _getLocalDues() {
        try {
            const raw = localStorage.getItem('club_local_dues_v1');
            return raw ? JSON.parse(raw) : [];
        } catch(e) { return []; }
    },

    _saveLocalDues(list) {
        try {
            localStorage.setItem('club_local_dues_v1', JSON.stringify(list));
        } catch(e) {}
    },

    async getDues(filters = {}) {
        let dbList = [];
        try {
            let q = this.from('club_dues').select('*, club_members(name)').order('dues_date', { ascending: false });
            if (filters.member_id) q = q.eq('member_id', filters.member_id);
            if (filters.startDate) q = q.gte('dues_date', filters.startDate);
            if (filters.endDate) q = q.lte('dues_date', filters.endDate);
            const { data, error } = await q;
            if (!error && data && data.length > 0) dbList = data;
        } catch(e) {}

        const localList = this._getLocalDues();
        const combinedMap = {};
        dbList.forEach(d => combinedMap[d.id] = d);
        localList.forEach(d => {
            if (filters.member_id && String(d.member_id) !== String(filters.member_id)) return;
            combinedMap[d.id] = d;
        });

        return Object.values(combinedMap).sort((a, b) => new Date(b.dues_date) - new Date(a.dues_date));
    },

    async addDues(dues) {
        let dbDues = null;
        try {
            const { data, error } = await this.from('club_dues').insert(dues).select('*, club_members(name)').single();
            if (!error && data) dbDues = data;
        } catch(e) {}

        const members = await this.getMembers();
        const memObj = members.find(m => String(m.id) === String(dues.member_id));
        const savedDues = dbDues || { ...dues, id: Date.now(), club_members: { name: memObj ? memObj.name : '기타' } };

        const localList = this._getLocalDues();
        localList.unshift(savedDues);
        this._saveLocalDues(localList);

        return savedDues;
    },

    async deleteDues(id) {
        try {
            await this.from('club_dues').delete().eq('id', id);
        } catch(e) {}
        let localList = this._getLocalDues();
        localList = localList.filter(d => String(d.id) !== String(id));
        this._saveLocalDues(localList);
        return true;
    },

    async getDuesBalance() {
        const { data, error } = await this.from('club_dues').select('member_id, type, amount, club_members(name, status)');
        if (error) { console.error('getDuesBalance:', error); return []; }
        const map = {};
        (data || []).forEach(d => {
            const mid = d.member_id;
            if (!map[mid]) map[mid] = { member_id: mid, name: d.club_members?.name || '?', status: d.club_members?.status, balance: 0 };
            if (d.type === 'deposit') {
                map[mid].balance += Number(d.amount);
            }
        });
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
    },

    async getClubTotalBalance() {
        const { data, error } = await this.from('club_dues').select('type, amount');
        if (error) return 0;
        let bal = 0;
        (data || []).forEach(d => { bal += d.type === 'deposit' ? Number(d.amount) : -Number(d.amount); });
        return bal;
    },

    // ─── 모임: 순위 추이 ───

    async getRankingTrend(limit = 10) {
        try {
            const { data, error } = await this.from('club_games').select('id, game_date, club_game_participants(member_id, ranking, club_members(name))').order('game_date', { ascending: true }).limit(limit);
            if (error) { console.error('getRankingTrend:', error); return []; }
            return data || [];
        } catch(e) {
            console.error('getRankingTrend exception:', e);
            return [];
        }
    },

    async getMemberStats() {
        try {
            const { data, error } = await this.from('club_game_participants').select('member_id, ranking, club_members(name, status)');
            if (error) { console.error('getMemberStats:', error); return []; }
            const map = {};
            (data || []).forEach(p => {
                const mid = p.member_id;
                if (!map[mid]) map[mid] = { name: p.club_members?.name || '?', status: p.club_members?.status, games: 0, totalRank: 0, best: Infinity, worst: 0 };
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
        } catch(e) {
            console.error('getMemberStats exception:', e);
            return [];
        }
    },

    // ─── 환전 ───

    async getExchanges(filters = {}) {
        let q = this.from('exchange_transactions').select('*').order('tx_date', { ascending: false });
        if (filters.startDate) q = q.gte('tx_date', filters.startDate);
        if (filters.endDate) q = q.lte('tx_date', filters.endDate);
        if (filters.person_name) q = q.eq('person_name', filters.person_name);
        if (filters.limit) q = q.limit(filters.limit);
        const { data, error } = await q;
        if (error) { console.error('getExchanges:', error); return []; }
        return data || [];
    },

    async addExchange(ex) {
        const { data, error } = await this.from('exchange_transactions').insert(ex).select().single();
        if (error) { console.error('addExchange:', error); return null; }
        return data;
    },

    async deleteExchange(id) {
        const { error } = await this.from('exchange_transactions').delete().eq('id', id);
        if (error) { console.error('deleteExchange:', error); return false; }
        return true;
    },

    async getExchangeTotal() {
        const { data, error } = await this.from('exchange_transactions').select('tx_type, amount_vnd, amount_krw');
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
        const { data, error } = await this.from('app_settings').select('value').eq('key', key).single();
        if (error) return null;
        return data?.value;
    },

    async setSetting(key, value) {
        const { error } = await this.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
        if (error) { console.error('setSetting:', error); return false; }
        return true;
    },

    async getAllSettings() {
        const { data, error } = await this.from('app_settings').select('*');
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
            const { data, error } = await this.from('club_calc_history').upsert(calcItem).select().single();
            if (!error && data) return data;
        } catch(e) {}

        return calcItem;
    },

    async getCalcHistoryList() {
        try {
            const { data, error } = await this.from('club_calc_history').select('*').order('calc_date', { ascending: false });
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
            await this.from('club_calc_history').delete().eq('id', id);
        } catch(e) {}
        return true;
    }
};
