import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const SuccessPage = ({ setPage, saleId }) => {
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            console.log('SuccessPage mounted, saleId:', saleId);
            const localData = sessionStorage.getItem('lastOrder');

            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (!saleId || parsed.saleId === saleId) {
                        setOrderData(parsed);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error('Error parsing local order data:', err);
                }
            }

            // Fallback: Fetch from Firestore if no local data or saleId mismatch
            let targetId = saleId;
            if (!targetId && localData) {
                try {
                    targetId = JSON.parse(localData).saleId;
                } catch (e) {
                    console.error('Safe targetId extraction failed:', e);
                }
            }

            if (targetId) {
                try {
                    console.log('Fetching from Firestore:', targetId);
                    const docSnap = await getDoc(doc(db, 'sales', targetId));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setOrderData({
                            orderNumber: data.orderNumber || 'Pending...',
                            saleId: targetId,
                            paymentId: data.paymentId || 'Processing',
                            total: data.total_amount,
                            items: data.items,
                            customer: data.customer
                        });
                    } else {
                        setError(true);
                    }
                } catch (err) {
                    console.error('Firestore fetch error:', err);
                    setError(true);
                }
            } else {
                setError(true);
            }
            setLoading(false);
        };

        fetchOrder();
    }, [setPage, saleId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    if (error || (!orderData)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Lo sentimos, no pudimos cargar los detalles.</h1>
                <p className="text-black/60 mb-8">Tu pago fue procesado con éxito, pero no encontramos los datos del pedido en esta sesión.</p>
                <button
                    onClick={() => setPage('home')}
                    className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest"
                >
                    Volver a la Tienda
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f8f8] text-black py-32 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-20 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                        <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase leading-none">Order Confirmed</h1>
                            <p className="text-xl text-black/40 font-medium mt-2 tracking-tight">Your music is on the way.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
                    {/* Left: Order Details (3 columns) */}
                    <div className="lg:col-span-3 space-y-16">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Order Number</h2>
                                <p className="text-xl font-bold tracking-tight">{orderData?.orderNumber || 'Pending...'}</p>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Payment Method</h2>
                                <p className="text-xl font-bold tracking-tight uppercase">Credit Card</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mb-6">Shipping Information</h2>
                            <div className="bg-white p-8 border border-black/5 shadow-sm">
                                <div className="text-sm font-medium space-y-1">
                                    <p className="text-xl font-bold mb-4">
                                        {orderData?.customer?.firstName || ''} {orderData?.customer?.lastName || ''}
                                    </p>
                                    <div className="space-y-1 text-black/60">
                                        <p>{orderData?.customer?.email || 'N/A'}</p>
                                        <p className="pt-4">{orderData?.customer?.address || ''}</p>
                                        <p>{orderData?.customer?.postalCode || ''} {orderData?.customer?.city || ''}</p>
                                        <p className="uppercase tracking-widest text-[10px] font-bold mt-2">{orderData?.customer?.country || ''}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-l-2 border-orange-600 pl-8 py-2">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 mb-2">What's Next?</h2>
                            <p className="text-sm leading-relaxed font-medium text-black/70">
                                A confirmation email has been sent to <span className="text-black font-bold">{orderData?.customer?.email || 'your email'}</span>.
                                We typically process orders within 24 hours. You'll receive a tracking number as soon as your records ship.
                            </p>
                        </div>
                    </div>

                    {/* Right: Items Summary (2 columns) */}
                    <div className="lg:col-span-2">
                        <div className="bg-black text-white p-8 sticky top-32">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-10 border-b border-white/10 pb-4">Order Summary</h2>
                            <div className="space-y-8 mb-10">
                                {Array.isArray(orderData?.items) && orderData.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="w-16 h-16 bg-white/10 overflow-hidden flex-shrink-0">
                                            <img
                                                src={item?.cover_image || '/default-vinyl.png'}
                                                className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 transition-all duration-500"
                                                alt={item?.album}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate uppercase tracking-tight">{item?.album}</p>
                                            <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest">{item?.artist}</p>
                                            <div className="flex justify-between items-end mt-2">
                                                <p className="text-[9px] font-bold text-white/30 uppercase">Qty: {item?.quantity}</p>
                                                <p className="text-xs font-bold">DKK {item?.price}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/20 pt-8 space-y-4">
                                <div className="flex justify-between items-center text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span>DKK {orderData?.total || 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                    <span>Shipping</span>
                                    <span>Calculated later</span>
                                </div>
                                <div className="flex justify-between items-end pt-4 border-t border-white/10">
                                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Total Paid</h2>
                                    <p className="text-4xl font-bold tracking-tighter">DKK {orderData?.total || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-32 pt-12 border-t border-black/10">
                    <button
                        onClick={() => setPage('home')}
                        className="group flex items-center gap-4 text-xs font-bold uppercase tracking-[0.4em] hover:text-orange-600 transition-colors"
                    >
                        <svg className="w-4 h-4 transform group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to the Vault
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
