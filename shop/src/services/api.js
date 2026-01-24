import axios from 'axios';

const isLocal = window.location.hostname === 'localhost';
const API_URL = isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app';

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

export const calculateShipping = async (country, postalCode, city, orderTotal, itemCount) => {
    try {
        const response = await api.post('/shipping/calculate', {
            country,
            postalCode,
            city,
            orderTotal,
            itemCount
        });
        return response.data;
    } catch (error) {
        console.error("Error calculating shipping:", error);
        throw error;
    }
};

export const startCheckout = async (items, customerData, shippingMethod) => {
    try {
        const response = await api.post('/checkout/start', {
            items,
            customerData,
            shippingMethod
        });
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

export const getSale = async (saleId) => {
    try {
        const response = await api.get(`/sales/public/${saleId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching sale:", error);
        throw error;
    }
};

export const confirmLocalPayment = async (saleId, paymentIntentId) => {
    try {
        const response = await api.post(`/sales/public/${saleId}/confirm-local`, { paymentIntentId });
        return response.data;
    } catch (error) {
        console.error("Error confirming local payment:", error);
        throw error;
    }
};

export default api;

