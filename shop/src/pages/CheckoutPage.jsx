import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { startCheckout, confirmCheckout } from '../services/api';
import defaultImage from '../assets/default-vinyl.png';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ clientSecret, saleId, total, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin, // Not used if redirect: 'if_required'
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            try {
                await confirmCheckout(saleId, paymentIntent.id);
                onSuccess();
            } catch (err) {
                setMessage("Payment succeeded but order confirmation failed. Please contact support.");
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
            <PaymentElement />
            {message && <div className="text-red-500 text-xs font-bold uppercase tracking-widest">{message}</div>}
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

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        try {
            const items = cartItems.map(item => ({ recordId: item.id, quantity: item.quantity }));
            const data = await startCheckout(items, formData); // Pass customer data
            setClientSecret(data.clientSecret);
            setSaleId(data.saleId);
            setIsFormSubmit(true);
        } catch (error) {
            console.error("Failed to start checkout", error);
            alert("Failed to initialize checkout. Please try again.");
        }
    };

    const handleSuccess = () => {
        clearCart();
        alert("Order Confirmed! Thank you.");
        setPage('home');
    };

    // Helper for inputs
    const InputField = ({ label, name, type = "text", width = "w-full" }) => (
        <div className={`flex flex-col gap-1 ${width}`}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40">{label}</label>
            <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleInputChange}
                disabled={isFormSubmit}
                className="border-b border-black/20 py-2 text-sm font-medium outline-none focus:border-black transition-colors bg-transparent rounded-none disabled:text-black/30"
                placeholder={label}
            />
        </div>
    );

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
                                <InputField label="Email Address" name="email" type="email" />
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-sm font-bold uppercase tracking-widest bg-black text-white inline-block px-2 py-1">Shipping Address</h2>
                                <div className="flex gap-6">
                                    <InputField label="First Name" name="firstName" width="w-1/2" />
                                    <InputField label="Last Name" name="lastName" width="w-1/2" />
                                </div>
                                <InputField label="Address" name="address" />
                                <div className="flex gap-6">
                                    <InputField label="Postal Code" name="postalCode" width="w-1/3" />
                                    <InputField label="City" name="city" width="w-2/3" />
                                </div>
                                <InputField label="Country" name="country" />
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className="w-full bg-accent text-white py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors disabled:bg-black/20 disabled:cursor-not-allowed"
                                >
                                    Continue to Payment
                                </button>
                            </div>
                        </form>
                    ) : (
                        <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
                            <CheckoutForm clientSecret={clientSecret} saleId={saleId} total={subtotal} onSuccess={handleSuccess} />
                        </Elements>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CheckoutPage;
