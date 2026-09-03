import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useSelections } from '../context/SelectionsContext';
import ProductCard from '../components/ProductCard';
import WishlistTab from '../components/WishlistTab';

const isLocal = window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

const AccountPage = () => {
    const { currentUser, loading } = useAuth();
    const { selectedRecords } = useSelections();
    const [activeTab, setActiveTab] = useState('ORDER HISTORY');

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    // 1. Auth Protection Redirection
    useEffect(() => {
        if (!loading && !currentUser) {
            navigate('/login');
        }
    }, [currentUser, loading, navigate]);

    // 2. Fetch Order History
    useEffect(() => {
        if (!currentUser) return;

        const fetchUserOrders = async () => {
            setOrdersLoading(true);
            setError('');

            const tryFetch = async (baseUrl) => {
                const response = await fetch(`${baseUrl}/api/orders/${currentUser.uid}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            };

            try {
                let data;
                try {
                    data = await tryFetch(API_URL);
                } catch (localErr) {
                    // Fallback to production if local fails
                    data = await tryFetch('https://el-cuartito-shop.up.railway.app');
                }
                
                if (data.success && Array.isArray(data.orders)) {
                    setOrders(data.orders);
                } else {
                    setOrders([]);
                }
            } catch (err) {
                console.error("Error fetching order history:", err);
                setOrders([]);
            } finally {
                setOrdersLoading(false);
            }
        };

        fetchUserOrders();
    }, [currentUser]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    // Date formatting helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        } catch {
            return 'N/A';
        }
    };

    // Vinyl titles helper
    const getVinylTitles = (order) => {
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            return order.items.map(i => i.album || i.title || i.name || 'VINYL RECORD').join(' + ');
        }
        return order.album || order.title || 'VINYL RECORD';
    };

    // Strict Monospace Loading Screen
    if (loading) {
        return (
            <div className="min-h-screen bg-white text-black flex items-center justify-center font-mono text-sm md:text-base font-bold uppercase tracking-widest">
                LOADING...
            </div>
        );
    }

    if (!currentUser) return null;

    // Display Name/Email Header
    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'USER';

    return (
        <div className="min-h-screen w-full bg-white text-black font-sans pt-20 md:pt-28">
            {/* Asymmetric 2-Column CSS Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] min-h-[calc(100vh-7rem)] border-t border-black">
                
                {/* LEFT COLUMN: Fixed Menu */}
                <div className="border-b md:border-b-0 md:border-r border-black p-6 md:p-8 flex flex-col justify-between bg-white rounded-none">
                    <div>
                        {/* User Name in Large Uppercase */}
                        <div className="border-b-2 border-black pb-4 mb-6 text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-black/50 block mb-1">
                                ACCOUNT
                            </span>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black leading-tight break-words">
                                {userName}
                            </h2>
                            <span className="text-[10px] font-mono font-bold text-black/60 truncate block mt-1">
                                {currentUser.email}
                            </span>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex flex-col border border-black rounded-none divide-y divide-black">
                            <button
                                onClick={() => setActiveTab('ORDER HISTORY')}
                                className={`w-full text-left font-black uppercase text-xs md:text-sm tracking-widest p-4 transition-none rounded-none ${
                                    activeTab === 'ORDER HISTORY' 
                                        ? 'bg-black text-white' 
                                        : 'bg-white text-black hover:bg-black/5'
                                }`}
                            >
                                ORDER HISTORY
                            </button>

                            <button
                                onClick={() => setActiveTab('WISHLIST')}
                                className={`w-full text-left font-black uppercase text-xs md:text-sm tracking-widest p-4 transition-none rounded-none ${
                                    activeTab === 'WISHLIST' 
                                        ? 'bg-black text-white' 
                                        : 'bg-white text-black hover:bg-black/5'
                                }`}
                            >
                                WISHLIST
                            </button>

                            <button
                                onClick={handleSignOut}
                                className="w-full text-left font-black uppercase text-xs md:text-sm tracking-widest p-4 transition-none bg-white text-black hover:bg-black hover:text-white rounded-none"
                            >
                                LOGOUT
                            </button>
                        </nav>
                    </div>

                    <div className="pt-8 text-left">
                        <Link
                            to="/"
                            className="text-[11px] font-bold uppercase tracking-widest text-black/60 hover:text-black transition-none"
                        >
                            ← BACK TO SHOP
                        </Link>
                    </div>
                </div>

                {/* RIGHT COLUMN: Render Area */}
                <div className="p-6 md:p-12 bg-white text-left rounded-none">
                    {/* TAB 1: ORDER HISTORY */}
                    {activeTab === 'ORDER HISTORY' && (
                        <div>
                            <div className="border-b-2 border-black pb-4 mb-8">
                                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-black">
                                    ORDER HISTORY
                                </h1>
                                <p className="text-xs font-mono font-bold uppercase tracking-widest text-black/60 mt-1">
                                    PURCHASES ASSOCIATED WITH YOUR ACCOUNT
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 border border-black bg-red-500/10 text-red-700 text-xs font-bold uppercase tracking-wider rounded-none">
                                    ⚠️ {error}
                                </div>
                            )}

                            {ordersLoading ? (
                                <div className="border border-black p-12 text-center text-xs font-mono font-black uppercase tracking-widest rounded-none">
                                    LOADING ORDERS...
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="border border-black p-12 text-center flex flex-col items-center justify-center space-y-4 rounded-none">
                                    <p className="text-sm font-black uppercase tracking-widest text-black/60">
                                        NO PREVIOUS ORDERS FOUND.
                                    </p>
                                    <Link
                                        to="/"
                                        className="border border-black bg-black text-white text-xs font-black uppercase tracking-widest px-6 py-3 transition-none rounded-none"
                                    >
                                        BROWSE CATALOG
                                    </Link>
                                </div>
                            ) : (
                                <div className="w-full border-2 border-black bg-white rounded-none">
                                    {/* CSS Grid Table Header */}
                                    <div className="grid grid-cols-12 font-black uppercase text-xs tracking-widest border-b-2 border-black bg-black text-white p-4 rounded-none">
                                        <div className="col-span-3 text-left">FECHA</div>
                                        <div className="col-span-5 text-left">TÍTULO DEL VINILO</div>
                                        <div className="col-span-2 text-left">ESTADO</div>
                                        <div className="col-span-2 text-right">TOTAL</div>
                                    </div>

                                    {/* CSS Grid Table Rows */}
                                    <div className="divide-y divide-black bg-white">
                                        {orders.map((order, idx) => {
                                            const orderDate = formatDate(order.created_at || order.createdAt || order.timestamp);
                                            const vinylTitle = getVinylTitles(order);
                                            const status = (order.status || order.fulfillmentStatus || 'COMPLETED').toUpperCase();
                                            const total = order.totalAmount || order.price || 0;

                                            return (
                                                <div 
                                                    key={order.id || idx}
                                                    className="grid grid-cols-12 text-xs md:text-sm font-bold uppercase tracking-wider p-4 items-center text-left bg-white transition-none"
                                                >
                                                    <div className="col-span-3 font-mono text-black/80">
                                                        {orderDate}
                                                    </div>
                                                    <div className="col-span-5 font-black text-black truncate pr-2">
                                                        {vinylTitle}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`inline-block px-2 py-1 text-[10px] font-black border border-black rounded-none ${
                                                            status === 'COMPLETED' || status === 'PAID' ? 'bg-black text-white' : 'bg-white text-black'
                                                        }`}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 text-right font-mono font-black text-black">
                                                        {total} DKK
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: WISHLIST */}
                    {activeTab === 'WISHLIST' && (
                        <div>
                            <div className="border-b-2 border-black pb-4 mb-8">
                                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-black">
                                    SAVED WISHLIST
                                </h1>
                                <p className="text-xs font-mono font-bold uppercase tracking-widest text-black/60 mt-1">
                                    YOUR SAVED VINYL ITEMS FROM FIRESTORE
                                </p>
                            </div>

                            <WishlistTab userId={currentUser.uid} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
