import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle, XCircle, Loader2, Package, Mail, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getSale, confirmLocalPayment } from '../services/api';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = loadStripe(stripeKey);

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    const [status, setStatus] = useState('loading'); // loading, succeeded, processing, failed
    const [message, setMessage] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const hasVerified = React.useRef(false);

    useEffect(() => {
        if (hasVerified.current) return;

        const verifyPayment = async () => {
            hasVerified.current = true;
            const clientSecret = searchParams.get('payment_intent_client_secret');
            const saleId = searchParams.get('saleId');

            if (!clientSecret) {
                setStatus('failed');
                setMessage('Payment information not found.');
                return;
            }

            try {
                const stripe = await stripePromise;
                const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

                setPaymentDetails(paymentIntent);

                if (paymentIntent.status === 'succeeded') {
                    setStatus('succeeded');
                    setMessage('Payment successful! Your order has been confirmed.');
                    // Clear cart on successful payment
                    clearCart();


                    // If we have a saleId, fetch the full order details
                    if (saleId) {
                        setIsLoadingOrder(true);
                        try {
                            // Always call confirmLocalPayment as fallback (idempotent on backend)
                            // This ensures order appears in admin even if webhook fails
                            await confirmLocalPayment(saleId, paymentIntent.id);

                            const sale = await getSale(saleId);
                            setOrderData(sale);
                        } catch (err) {
                            console.error('Error in post-payment flow:', err);
                        } finally {
                            setIsLoadingOrder(false);
                        }
                    }
                } else if (paymentIntent.status === 'processing') {
                    setStatus('processing');
                    setMessage('Your payment is being processed. We will notify you when complete.');
                } else if (paymentIntent.status === 'requires_payment_method') {
                    setStatus('failed');
                    setMessage('Payment failed. Please try another payment method.');
                } else {
                    setStatus('failed');
                    setMessage('Something went wrong with your payment.');
                }
            } catch (error) {
                console.error('Error verifying payment:', error);
                setStatus('failed');
                setMessage('Error verifying payment. Please contact support.');
            }
        };

        verifyPayment();
    }, [searchParams, clearCart]);

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center py-12 px-6">
            <div className="max-w-2xl w-full">
                {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-black/5">
                        <Loader2 className="w-12 h-12 text-black/20 animate-spin mb-6" />
                        <h1 className="text-xl font-bold text-gray-800 mb-2">Verificando pago...</h1>
                        <p className="text-gray-500 text-sm">Por favor espera un momento</p>
                    </div>
                )}

                {status === 'succeeded' && (
                    <div className="space-y-6">
                        {/* Header Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 text-center overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Payment Successful!</h1>
                            <p className="text-gray-500 mb-0">We have received your order and will prepare it soon.</p>
                        </div>

                        {/* Order Info Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                                    <Package size={14} /> Order Details
                                </h3>
                                {isLoadingOrder ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orderData?.orderNumber && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Nº de Orden:</span>
                                                <span className="font-bold text-sm tracking-tight">{orderData.orderNumber}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Total Pagado:</span>
                                            <span className="font-bold text-sm">DKK {((paymentDetails?.amount || 0) / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Fecha:</span>
                                            <span className="text-sm">{orderData?.date || new Date().toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
                                    <Mail size={14} /> Contact
                                </h3>
                                {isLoadingOrder ? (
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 mb-1 uppercase tracking-tighter">Email de confirmación</span>
                                            <span className="font-bold text-sm text-gray-800 truncate">{orderData?.customer?.email}</span>
                                        </div>
                                        <div className="flex flex-col pt-1">
                                            <span className="text-xs text-gray-400 mb-1 uppercase tracking-tighter">Cliente</span>
                                            <span className="text-sm text-gray-700">{orderData?.customer?.name}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Card */}
                        {orderData?.items && orderData.items.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                                <div className="px-6 py-4 border-b border-black/5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                                        Order Summary
                                    </h3>
                                </div>
                                <div className="divide-y divide-black/5">
                                    {orderData.items.map((item, idx) => (
                                        <div key={idx} className="p-6 flex items-center gap-4">
                                            <div className="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0 flex items-center justify-center border border-black/5 overflow-hidden">
                                                {item.cover_image ? (
                                                    <img src={item.cover_image} alt={item.album} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-gray-900 truncate">{item.album}</h4>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">{item.artist}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold">DKK {item.priceAtSale || item.unitPrice}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Qty: {item.qty || item.quantity}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-50/50 p-6 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Subtotal:</span>
                                        <span className="font-medium">DKK {(orderData.items_total || orderData.items.reduce((acc, curr) => acc + (curr.priceAtSale || curr.unitPrice) * (curr.qty || curr.quantity), 0)).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Shipping:</span>
                                        <span className="font-medium">DKK {(orderData.shipping_cost || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-black/5">
                                        <span className="font-black uppercase tracking-widest text-[10px] text-gray-400">Total</span>
                                        <span className="text-xl font-black tracking-tighter text-gray-900 leading-none">DKK {(orderData.total_amount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-black/90 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-black/10"
                            >
                                Back to Store
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="text-center pt-6">
                            <p className="text-[10px] font-bold text-black/30 uppercase tracking-[0.2em]">
                                El Cuartito Records &copy; {new Date().getFullYear()} &bull; Copenhagen
                            </p>
                        </div>
                    </div>
                )}

                {/* Failed/Processing States (Simplified for now, similar to success but different colors) */}
                {(status === 'failed' || status === 'processing') && (
                    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-12 text-center">
                        <div className="flex justify-center mb-6">
                            <div className={`w-16 h-16 ${status === 'failed' ? 'bg-red-50' : 'bg-blue-50'} rounded-full flex items-center justify-center`}>
                                {status === 'failed' ? <XCircle className="w-10 h-10 text-red-600" /> : <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />}
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            {status === 'failed' ? 'Payment Failed' : 'Processing Payment...'}
                        </h1>
                        <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                            {message}
                        </p>
                        <div className="space-y-3">
                            {status === 'failed' && (
                                <button
                                    onClick={() => navigate('/checkout')}
                                    className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-black/90 transition-all"
                                >
                                    Try Again
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/')}
                                className="w-full text-black/60 py-4 font-bold text-xs uppercase tracking-widest hover:text-black transition-all"
                            >
                                Back to Store
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;
