import { auth } from '../config/firebase';

const isLocal = window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

// fetch against the backend with the logged-in customer's Firebase ID token
const authFetch = async (path, options = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const token = await user.getIdToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}), Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
};

const uid = () => auth.currentUser?.uid;

export const getWishlist = () => authFetch(`/api/wishlist/${uid()}`);
export const addToWishlist = (productId) => authFetch(`/api/wishlist/${uid()}`, { method: 'POST', body: JSON.stringify({ productId }) });
export const removeFromWishlist = (productId) => authFetch(`/api/wishlist/${uid()}/${productId}`, { method: 'DELETE' });
export const getMyOrders = () => authFetch(`/api/orders/${uid()}`);
export const saveProfile = (data = {}) => authFetch(`/api/account/${uid()}/profile`, { method: 'POST', body: JSON.stringify(data) });
