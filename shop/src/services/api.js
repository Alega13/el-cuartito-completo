import axios from 'axios';

const API_URL = 'https://el-cuartito-shop.up.railway.app';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getOnlineRecords = async () => {
    try {
        const response = await api.get('/firebase/records/products');
        return response.data;
    } catch (error) {
        console.error("Error fetching records:", error);
        throw error;
    }
};

export const createSale = async (items, totalAmount, channel = 'online') => {
    try {
        const response = await api.post('/firebase/sales/sale', { items, totalAmount, channel });
        return response.data;
    } catch (error) {
        console.error("Error creating sale:", error);
        throw error;
    }
};

export const reserveStock = async (productId, qty) => {
    try {
        const response = await api.post('/firebase/sales/reserve', { productId, qty });
        return response.data;
    } catch (error) {
        console.error("Error reserving stock:", error);
        throw error;
    }
};

export const releaseStock = async (productId, qty) => {
    try {
        const response = await api.post('/firebase/sales/release', { productId, qty });
        return response.data;
    } catch (error) {
        console.error("Error releasing stock:", error);
        throw error;
    }
};

export const startCheckout = async (items) => {
    try {
        const response = await api.post('/checkout/start', { items });
        return response.data;
    } catch (error) {
        console.error("Error starting checkout:", error);
        throw error;
    }
};

export const confirmCheckout = async (saleId, paymentId) => {
    try {
        const response = await api.post('/checkout/confirm', { saleId, paymentId });
        return response.data;
    } catch (error) {
        console.error("Error confirming checkout:", error);
        throw error;
    }
};

export default api;

