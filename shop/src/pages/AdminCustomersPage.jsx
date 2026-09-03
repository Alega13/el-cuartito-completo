import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

const isLocal = window.location.hostname === 'localhost';
const API_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:3001' : 'https://el-cuartito-shop.up.railway.app');

const AdminCustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Drop email state
    const [products, setProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [sendToAllMails, setSendToAllMails] = useState(true);
    const [subject, setSubject] = useState('New This Week — El Cuartito Records');
    const [intro, setIntro] = useState('Fresh drops just landed at El Cuartito Records. Here\'s what\'s new this week.');
    const [sendingDrop, setSendingDrop] = useState(false);
    const [dropStatus, setDropStatus] = useState('');

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            setError(null);

            const tryFetch = async (baseUrl) => {
                const res = await fetch(`${baseUrl}/admin/api/customers`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            };

            try {
                let data;
                try {
                    data = await tryFetch(API_URL);
                } catch (localErr) {
                    data = await tryFetch('https://el-cuartito-shop.up.railway.app');
                }
                setCustomers(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching customers:", err);
                setError("Failed to load customer database.");
            } finally {
                setLoading(false);
            }
        };

        const fetchProducts = async () => {
            try {
                const res = await fetch(`${API_URL}/records/online`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.records)) {
                        const sortedRecords = [...data.records].sort((a, b) => {
                            const dateA = a.created_at || a.createdAt || a.timestamp || a.sku || '';
                            const dateB = b.created_at || b.createdAt || b.timestamp || b.sku || '';
                            return dateA > dateB ? -1 : (dateA < dateB ? 1 : 0);
                        });
                        setProducts(sortedRecords);
                    }
                }
            } catch (e) {
                console.warn("Could not load products for selection:", e);
            }
        };

        fetchCustomers();
        fetchProducts();
    }, []);

    const toggleProductSelection = (productId) => {
        setSelectedProductIds(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const handleSendDrop = async (e) => {
        e.preventDefault();
        if (selectedProductIds.length === 0) {
            alert('Please select at least one vinyl for the drop.');
            return;
        }

        setSendingDrop(true);
        setDropStatus('');

        const targetEmails = sendToAllMails ? [] : customers.map(c => c.email);

        const trySendDrop = async (baseUrl) => {
            const res = await fetch(`${baseUrl}/api/newsletter/send-drop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productIds: selectedProductIds,
                    subject,
                    intro,
                    sendToAll: sendToAllMails,
                    targetEmails
                })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        };

        try {
            let resData;
            try {
                resData = await trySendDrop(API_URL);
            } catch (err) {
                resData = await trySendDrop('https://el-cuartito-shop.up.railway.app');
            }

            if (resData.success) {
                setDropStatus(`🚀 Drop sent successfully to ${resData.sentCount || 0} customers!`);
                setSelectedProductIds([]);
            } else {
                setDropStatus(`❌ Failed to send drop: ${resData.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Error sending drop:", err);
            setDropStatus(`❌ Error sending drop: ${err.message}`);
        } finally {
            setSendingDrop(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-[#F2610E] selection:text-white">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 md:px-12 pt-32 pb-24 rounded-none">
                {/* Header Title (Brutalismo Utilitario) */}
                <h1 className="text-4xl font-black uppercase tracking-tight mb-8 text-left">
                    CUSTOMER DATABASE
                </h1>

                {/* Section 1: Customer Raw Table */}
                <div className="w-full mb-16 rounded-none">
                    {loading ? (
                        <div className="p-8 border border-black text-left font-mono text-sm uppercase">
                            LOADING CUSTOMER DATA...
                        </div>
                    ) : error ? (
                        <div className="p-8 border border-black text-left font-mono text-sm uppercase text-red-600">
                            {error}
                        </div>
                    ) : (
                        <table className="w-full border border-black border-collapse rounded-none">
                            <thead>
                                <tr className="bg-black text-white">
                                    <th className="bg-black text-white uppercase text-xs p-4 border border-black text-left font-mono">ID</th>
                                    <th className="bg-black text-white uppercase text-xs p-4 border border-black text-left font-mono">EMAIL</th>
                                    <th className="bg-black text-white uppercase text-xs p-4 border border-black text-left font-mono">JOIN DATE</th>
                                    <th className="bg-black text-white uppercase text-xs p-4 border border-black text-left font-mono">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-sm font-mono p-4 border border-black text-left">
                                            NO CUSTOMERS FOUND IN DATABASE
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((cust) => (
                                        <tr key={cust.id || cust.email} className="hover:bg-slate-50">
                                            <td className="text-sm font-mono p-4 border border-black text-left">{cust.id}</td>
                                            <td className="text-sm font-mono p-4 border border-black text-left">{cust.email}</td>
                                            <td className="text-sm font-mono p-4 border border-black text-left">{cust.joinDate}</td>
                                            <td className="text-sm font-mono p-4 border border-black text-left">
                                                <span className={`px-2 py-1 text-xs font-bold ${cust.status === 'ACTIVE' ? 'bg-black text-white' : 'bg-slate-200 text-black'}`}>
                                                    {cust.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Section 2: Weekly Drop Broadcast Controls */}
                <div className="w-full border border-black p-6 md:p-8 rounded-none bg-white">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
                        SEND WEEKLY DROP TO CUSTOMERS
                    </h2>

                    <form onSubmit={handleSendDrop} className="space-y-6">
                        {/* Checkbox: Send to all emails */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="sendToAll"
                                checked={sendToAllMails}
                                onChange={(e) => setSendToAllMails(e.target.checked)}
                                className="w-5 h-5 border border-black accent-black cursor-pointer rounded-none"
                            />
                            <label htmlFor="sendToAll" className="text-sm font-mono font-bold uppercase cursor-pointer">
                                SEND TO ALL MAILS ({customers.length} CUSTOMERS)
                            </label>
                        </div>

                        {/* Subject Input */}
                        <div>
                            <label className="block text-xs font-mono font-bold uppercase mb-2">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full border border-black p-3 text-sm font-mono outline-none rounded-none focus:bg-slate-50"
                            />
                        </div>

                        {/* Intro Text Input */}
                        <div>
                            <label className="block text-xs font-mono font-bold uppercase mb-2">Intro Message</label>
                            <textarea
                                value={intro}
                                onChange={(e) => setIntro(e.target.value)}
                                rows="3"
                                className="w-full border border-black p-3 text-sm font-mono outline-none rounded-none focus:bg-slate-50"
                            />
                        </div>

                        {/* Product Picker */}
                        <div>
                            <label className="block text-xs font-mono font-bold uppercase mb-2">
                                SELECT VINYLS FOR THE DROP ({selectedProductIds.length} SELECTED)
                            </label>
                            <div className="border border-black max-h-64 overflow-y-auto divide-y divide-black rounded-none">
                                {products.length === 0 ? (
                                    <div className="p-4 text-xs font-mono text-slate-500">Loading catalog for selection...</div>
                                ) : (
                                    products.slice(0, 40).map((prod) => {
                                        const isSelected = selectedProductIds.includes(prod.id);
                                        return (
                                            <div
                                                key={prod.id}
                                                onClick={() => toggleProductSelection(prod.id)}
                                                className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-black text-white' : 'hover:bg-slate-100'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="w-4 h-4 accent-white rounded-none pointer-events-none"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-bold uppercase block">{prod.title}</span>
                                                        <span className={`text-[10px] uppercase font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                                            {prod.artist} · DKK {prod.price}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Send Button */}
                        <button
                            type="submit"
                            disabled={sendingDrop || selectedProductIds.length === 0}
                            className="w-full bg-black text-white text-sm font-mono font-bold uppercase py-4 border border-black hover:bg-white hover:text-black transition-colors rounded-none disabled:opacity-50"
                        >
                            {sendingDrop ? 'SENDING DROP EMAIL...' : 'BROADCAST WEEKLY DROP'}
                        </button>

                        {dropStatus && (
                            <div className="p-4 border border-black font-mono text-xs uppercase bg-slate-50">
                                {dropStatus}
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AdminCustomersPage;
