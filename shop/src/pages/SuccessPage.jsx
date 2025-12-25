import React, { useEffect, useState } from 'react';

const SuccessPage = ({ setPage }) => {
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        console.log('SuccessPage mounted');
        const data = sessionStorage.getItem('lastOrder');
        console.log('Order data from session:', data);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                setOrderData(parsed);
                // We keep it for now to help debug if the user refreshes
            } catch (err) {
                console.error('Error parsing order data:', err);
                setError(true);
            }
        } else {
            console.warn('No order data found in session');
            // Give it a second before redirecting to home
            const timer = setTimeout(() => {
                if (!sessionStorage.getItem('lastOrder')) {
                    setPage('home');
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [setPage]);

    if (error || (!orderData && !sessionStorage.getItem('lastOrder'))) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h1>
                <p className="text-black/60 mb-8">We couldn't find your order details, but don't worry—your payment was successful.</p>
                <button
                    onClick={() => setPage('home')}
                    className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest"
                >
                    Back to Store
                </button>
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black py-32 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">Order Confirmed</h1>
                    </div>
                    <p className="text-lg text-black/60 font-medium">Thank you for your purchase. We've received your order and are getting it ready.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-black pt-12">
                    {/* Left: Order Details */}
                    <div className="space-y-12">
                        <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-4">Order Number</h2>
                            <p className="text-2xl font-bold tracking-tight">{orderData.orderNumber}</p>
                        </div>

                        <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-4">Shipping Address</h2>
                            <div className="text-sm font-medium space-y-1">
                                <p className="text-lg">{orderData.customer.firstName} {orderData.customer.lastName}</p>
                                <p className="text-black/60">{orderData.customer.email}</p>
                                <p className="text-black/60 pt-2">{orderData.customer.address}</p>
                                <p className="text-black/60">{orderData.customer.postalCode} {orderData.customer.city}</p>
                                <p className="text-black/60">{orderData.customer.country}</p>
                            </div>
                        </div>

                        <div className="bg-black/5 p-6 rounded-lg">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-2">Next Steps</h2>
                            <p className="text-xs leading-relaxed font-medium">
                                You will receive a confirmation email shortly. We ship most orders within 24-48 hours.
                                You'll receive another update once your records are on their way.
                            </p>
                        </div>
                    </div>

                    {/* Right: Items Summary */}
                    <div className="bg-black/5 p-8 rounded-2xl">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 mb-8">Summary</h2>
                        <div className="space-y-6 mb-8">
                            {orderData.items.map((item, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="w-16 h-16 bg-white rounded overflow-hidden flex-shrink-0">
                                        <img src={item.cover_image || '/default-vinyl.png'} className="w-full h-full object-cover grayscale" alt={item.album} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate uppercase">{item.album}</p>
                                        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{item.artist}</p>
                                        <p className="text-[10px] font-bold mt-1 uppercase tracking-widest">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold whitespace-nowrap">DKK {item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-black/10 pt-6 flex justify-between items-end">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">Total Paid</h2>
                            <p className="text-3xl font-bold tracking-tighter">DKK {orderData.total}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-20">
                    <button
                        onClick={() => setPage('home')}
                        className="bg-black text-white px-12 py-5 rounded-none text-xs font-bold uppercase tracking-[0.3em] hover:bg-accent transition-colors w-full md:w-auto"
                    >
                        Back to Catalogue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
