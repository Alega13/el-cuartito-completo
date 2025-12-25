const API_URL = 'https://el-cuartito-shop.up.railway.app';

async function handleResponse(res) {
    if (!res.ok) {
        let errorMessage = 'Error en la petición';
        try {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }
    if (res.status === 204) return null;
    return await res.json();
}

const api = {
    _token: null,

    setToken(token) {
        this._token = token;
    },

    async _fetch(url, options = {}) {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this._token}`
        };
        return fetch(url, { ...options, headers });
    },

    // --- INVENTORY ---
    async getInventory() {
        const res = await this._fetch(`${API_URL}/records`);
        return handleResponse(res);
    },

    async createRecord(data) {
        const res = await this._fetch(`${API_URL}/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async updateRecord(id, data) {
        const res = await this._fetch(`${API_URL}/records/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async deleteRecord(id) {
        const res = await this._fetch(`${API_URL}/records/${id}`, { method: 'DELETE' });
        return handleResponse(res);
    },

    // --- SALES ---
    async getSales() {
        const res = await this._fetch(`${API_URL}/sales`);
        const sales = await handleResponse(res);
        return sales.map(s => ({
            ...s,
            total: s.total_amount || 0,
            date: s.timestamp && s.timestamp._seconds
                ? new Date(s.timestamp._seconds * 1000).toISOString()
                : (s.timestamp || new Date().toISOString())
        }));
    },

    async createSale(data) {
        const res = await this._fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async updateFulfillmentStatus(id, status) {
        const res = await this._fetch(`${API_URL}/sales/${id}/fulfillment`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return handleResponse(res);
    },

    // --- EXPENSES ---
    async getExpenses() {
        const res = await this._fetch(`${API_URL}/expenses`);
        return handleResponse(res);
    },

    async createExpense(data) {
        const res = await this._fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async updateExpense(id, data) {
        const res = await this._fetch(`${API_URL}/expenses/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async deleteExpense(id) {
        const res = await this._fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
        return handleResponse(res);
    },

    // --- EVENTS ---
    async getEvents() {
        const res = await this._fetch(`${API_URL}/events`);
        return handleResponse(res);
    },

    async createEvent(data) {
        const res = await this._fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async deleteEvent(id) {
        const res = await this._fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
        return handleResponse(res);
    },

    // --- CONSIGNORS ---
    async getConsignors() {
        const res = await this._fetch(`${API_URL}/consignors`);
        return handleResponse(res);
    },

    async createConsignor(data) {
        const res = await this._fetch(`${API_URL}/consignors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    async deleteConsignor(id) {
        const res = await this._fetch(`${API_URL}/consignors/${id}`, { method: 'DELETE' });
        return handleResponse(res);
    }
};

export default api;

