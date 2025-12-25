import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { startCheckout, confirmCheckout } from '../services/api';
import defaultImage from '../assets/default-vinyl.png';

// Input component defined outside to prevent re-creation on each render
const InputField = ({ label, name, type = "text", width = "w-full", value, onChange, disabled }) => (
    <div className={`flex flex-col gap-2 ${width} group`}>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 group-focus-within:text-accent transition-colors">
            {label}
        </label>
        <div className="relative">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full block border-b border-black/10 py-3 text-sm font-medium outline-none focus:border-black transition-all bg-transparent rounded-none disabled:text-black/30 placeholder:opacity-0 focus:pl-1"
                placeholder={label}
                required
            />
            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all duration-300 group-focus-within:w-full" />
        </div>
    </div>
);

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('Stripe Key loaded:', stripeKey ? 'YES (starts with ' + stripeKey.substring(0, 7) + '...)' : 'NO');

const stripePromise = stripeKey && !stripeKey.includes('REPLACE_WITH_YOUR_KEY')
    ? loadStripe(stripeKey)
    : Promise.resolve(null);

const CheckoutForm = ({ clientSecret, saleId, total, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Diagnostics
    console.log('CheckoutForm status:', {
        hasStripe: !!stripe,
        hasElements: !!elements,
        hasClientSecret: !!clientSecret
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            console.error("Stripe.js has not loaded yet.");
            setMessage("Error: El sistema de pago no se ha inicializado. Por favor recarga la página.");
            return;
        }

        setIsProcessing(true);
        setMessage(null);

        // Save order data before redirect just in case
        onSuccess(saleId, "pending", true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/?page=success&saleId=${saleId}`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Payment succeeded - confirm with backend to update stock
            setMessage("Payment successful! Processing your order...");
            try {
                await confirmCheckout(saleId, paymentIntent.id);
                setTimeout(() => {
                    onSuccess(saleId, paymentIntent.id);
                }, 500);
            } catch (err) {
                console.error('Confirmation error:', err);
                // Even if confirmation fails, payment succeeded
                setTimeout(() => {
                    onSuccess(saleId, paymentIntent.id);
                }, 500);
            }
            setIsProcessing(false);
        } else {
            setMessage("Unexpected state.");
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mt-6 border-t border-black/10 pt-6">
            <h3 className="text-xl font-bold uppercase tracking-tight">Payment Details</h3>

            <div className="min-h-[100px] relative">
                <PaymentElement />
                {!stripe && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Conectando con Stripe...</span>
                        </div>
                    </div>
                )}
            </div>

            {message && (
                <div className="bg-red-50 border border-red-100 p-4 text-red-600 text-[10px] font-bold uppercase tracking-widest leading-loose">
                    {message}
                </div>
            )}
            <button
                disabled={isProcessing || !stripe || !elements}
                id="submit"
                className="w-full bg-accent text-white py-4 text-sm font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors disabled:bg-black/20 disabled:cursor-not-allowed mt-4"
            >
                {isProcessing ? "Processing..." : `Pay DKK ${total}`}
            </button>
        </form>
    );
};

const CheckoutPage = ({ setPage }) => {
    const { cartItems, subtotal, clearCart } = useCart();
    const [clientSecret, setClientSecret] = useState('');
    const [saleId, setSaleId] = useState(null);
    const [isFormSubmit, setIsFormSubmit] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        postalCode: '',
        country: 'Denmark'
    });

    const isFormValid = Object.values(formData).every(val => val.trim() !== '');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [isStartingCheckout, setIsStartingCheckout] = useState(false);

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        setIsStartingCheckout(true);
        try {
            console.log("Starting checkout process...");
            const items = cartItems.map(item => ({ recordId: item.id, quantity: item.quantity }));
            const data = await startCheckout(items, formData); // Pass customer data

            console.log("Response from startCheckout:", {
                saleId: data.saleId,
                hasClientSecret: !!data.clientSecret,
                clientSecretPrefix: data.clientSecret ? data.clientSecret.substring(0, 10) : 'none'
            });

            if (!data.clientSecret) {
                throw new Error("El servidor no devolvió el secreto de pago (client_secret).");
            }

            setClientSecret(data.clientSecret);
            setSaleId(data.saleId);
            setIsFormSubmit(true);
        } catch (error) {
            console.error("Failed to start checkout:", error);
            alert("Error al iniciar el pago: " + (error.message || "Por favor intente nuevamente."));
        } finally {
            setIsStartingCheckout(false);
        }
    };

    const handleSuccess = (saleId, paymentId, isPreliminary = false) => {
        const orderData = {
            orderNumber: `WEB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${saleId.slice(-5).toUpperCase()}`,
            saleId,
            paymentId,
            total: subtotal,
            items: cartItems,
            customer: formData
        };

        // Save to sessionStorage for success page
        sessionStorage.setItem('lastOrder', JSON.stringify(orderData));

        if (!isPreliminary) {
            clearCart();
            setPage('success');
        }
    };

    return (
        <div className="pt-32 pb-40 px-6 max-w-7xl mx-auto min-h-screen">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-12 uppercase">Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

                {/* Left Column: Order Summary */}
                <div className="order-2 lg:order-1 space-y-8">
                    <div className="border-t border-black">
                        {cartItems.map((item) => (
                            <div key={item.id} className="py-6 border-b border-black/10 flex items-start gap-6 group">
                                <div className="w-16 h-16 bg-black/5 flex-shrink-0">
                                    <img
                                        src={item.cover_image || defaultImage}
                                        onError={(e) => e.currentTarget.src = defaultImage}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                        alt={item.album}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-sm font-bold uppercase tracking-wide">{item.artist}</h3>
                                        <span className="text-sm font-bold">DKK {item.price * item.quantity}</span>
                                    </div>
                                    <p className="text-xs text-black/60 uppercase tracking-widest mb-2">{item.album}</p>
                                    <div className="text-[10px] font-bold text-black/40 border border-black/10 inline-block px-2 py-0.5 rounded-full">
                                        QTY: {item.quantity}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-end pt-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-black/40">Total including VAT</span>
                        <span className="text-3xl font-bold tracking-tighter">DKK {subtotal}</span>
                    </div>
                </div>

                {/* Right Column: details */}
                <div className="order-1 lg:order-2">
                    {!clientSecret ? (
                        <form onSubmit={handleInitialSubmit} className="space-y-12 sticky top-32">
                            <div className="space-y-6">
                                <h2 className="text-sm font-bold uppercase tracking-widest bg-black text-white inline-block px-2 py-1">Contact</h2>
                                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} disabled={isFormSubmit} />
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-sm font-bold uppercase tracking-widest bg-black text-white inline-block px-2 py-1">Shipping Address</h2>
                                <div className="flex gap-6">
                                    <InputField label="First Name" name="firstName" width="w-1/2" value={formData.firstName} onChange={handleInputChange} disabled={isFormSubmit} />
                                    <InputField label="Last Name" name="lastName" width="w-1/2" value={formData.lastName} onChange={handleInputChange} disabled={isFormSubmit} />
                                </div>
                                <InputField label="Address" name="address" value={formData.address} onChange={handleInputChange} disabled={isFormSubmit} />
                                <div className="flex gap-6">
                                    <InputField label="Postal Code" name="postalCode" width="w-1/3" value={formData.postalCode} onChange={handleInputChange} disabled={isFormSubmit} />
                                    <InputField label="City" name="city" width="w-2/3" value={formData.city} onChange={handleInputChange} disabled={isFormSubmit} />
                                </div>
                                <InputField label="Country" name="country" value={formData.country} onChange={handleInputChange} disabled={isFormSubmit} />
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={!isFormValid || isStartingCheckout}
                                    className="w-full bg-accent text-white py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 disabled:bg-black/20 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                                >
                                    {isStartingCheckout ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Initializing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Continue to Payment</span>
                                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {stripeKey && !stripeKey.includes('REPLACE_WITH_YOUR_KEY') ? (
                                <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
                                    <CheckoutForm clientSecret={clientSecret} saleId={saleId} total={subtotal} onSuccess={handleSuccess} />
                                </Elements>
                            ) : (
                                <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-red-700">
                                    <h3 className="font-bold mb-2">Error de Configuración</h3>
                                    <p className="text-sm">Falta la clave pública de Stripe (VITE_STRIPE_PUBLISHABLE_KEY). Por favor configure el archivo .env correctamente.</p>
                                    <button onClick={() => setClientSecret('')} className="mt-4 text-xs font-bold uppercase underline">Volver al formulario</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CheckoutPage;
