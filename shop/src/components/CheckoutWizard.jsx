import React, { useState } from 'react';
import StepIndicator from '../components/StepIndicator';
import CustomerDetailsStep from '../components/CustomerDetailsStep';
import ShippingStep from '../components/ShippingStep';
import OrderSummary from '../components/OrderSummary';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { startCheckout } from '../services/api';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey && !stripeKey.includes('REPLACE_WITH_YOUR_KEY')
    ? loadStripe(stripeKey)
    : Promise.resolve(null);

// Payment Step Component
const PaymentStep = ({ clientSecret, saleId, onSuccess, onBack, shippingData }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            setMessage("Payment system not ready. Please reload.");
            return;
        }


        setIsProcessing(true);
        setMessage(null);

        // Save order data before redirect
        onSuccess(saleId, "pending", true);

        const returnUrl = `${window.location.origin}/checkout/success?saleId=${saleId}`;
        console.log('🔥 STRIPE RETURN URL:', returnUrl);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: returnUrl,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setMessage("Payment successful! Your order is being processed...");
            setTimeout(() => {
                // Pass clientSecret so the success page can verify the payment
                onSuccess(saleId, paymentIntent.id, false, clientSecret);
            }, 500);
            setIsProcessing(false);
        } else {
            setMessage("Unexpected state.");
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Payment</h2>
                <p className="text-gray-600">Complete your purchase</p>
            </div>

            {/* Shipping Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Shipping to:</h3>
                <p className="text-sm">
                    {shippingData?.address?.street}, {shippingData?.address?.city} {shippingData?.address?.postalCode}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                    {shippingData?.shippingMethod?.method} - {shippingData?.shippingMethod?.estimatedDays}{typeof shippingData?.shippingMethod?.estimatedDays === 'number' ? ' days' : ''}
                </p>
            </div>

            {/* Local Pickup Notice */}
            {shippingData?.shippingMethod?.id === 'local_pickup' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                        📧 You will receive an email when your order is ready for pickup.
                    </p>
                </div>
            )}


            <div className="min-h-[200px]">
                <PaymentElement />
            </div>

            {message && (
                <div className={`
                    p-4 rounded-lg
                    ${message.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                `}>
                    {message}
                </div>
            )}

            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isProcessing}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isProcessing ? 'Processing...' : 'Pay Now'}
                </button>
            </div>
        </form>
    );
};

// Main CheckoutWizard Component
const CheckoutWizard = ({ cart, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [customerData, setCustomerData] = useState(null);
    const [shippingData, setShippingData] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    const [saleId, setSaleId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [addressData, setAddressData] = useState({
        street: '',
        city: '',
        postalCode: '',
        country: 'Denmark'
    });

    const steps = ['DETALLES', 'ENVÍO', 'PAGO'];

    // Safety check: handle undefined or empty cart
    if (!cart || cart.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                    <p className="text-gray-600">Add some items before checking out</p>
                </div>
            </div>
        );
    }

    // Step 1: Customer details submitted
    const handleCustomerDetailsSubmit = (data) => {
        setCustomerData(data);
        setCurrentStep(2);
    };

    // Step 2: Shipping method selected
    const handleShippingSelected = async (data) => {
        setShippingData(data);
        setIsLoading(true);

        try {
            // Prepare items for checkout
            const items = cart.map(item => ({
                recordId: item.id,
                quantity: item.quantity
            }));

            // Combine customer data with shipping address
            const fullCustomerData = {
                ...customerData,
                address: data.address.street,
                apartment: data.address.apartment,
                city: data.address.city,
                postalCode: data.address.postalCode,
                country: data.address.country
            };

            // Start checkout with shipping method
            const result = await startCheckout(items, fullCustomerData, data.shippingMethod);

            setClientSecret(result.clientSecret);
            setSaleId(result.saleId);
            setCurrentStep(3);
        } catch (error) {
            console.error('Checkout error:', error);
            const message = error.response?.data?.error || error.response?.data?.message || 'Failed to initialize payment. Please try again.';
            alert(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Preparing payment...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-8">

            <StepIndicator currentStep={currentStep} steps={steps} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left: Step Content */}
                <div className="lg:col-span-2">
                    {currentStep === 1 && (
                        <CustomerDetailsStep
                            initialData={customerData}
                            onContinue={handleCustomerDetailsSubmit}
                        />
                    )}

                    {currentStep === 2 && (
                        <ShippingStep
                            cart={cart}
                            onShippingSelected={handleShippingSelected}
                            onBack={() => setCurrentStep(1)}
                        />
                    )}

                    {currentStep === 3 && clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <PaymentStep
                                clientSecret={clientSecret}
                                saleId={saleId}
                                onSuccess={onSuccess}
                                onBack={() => setCurrentStep(2)}
                                shippingData={shippingData}
                            />
                        </Elements>
                    )}
                </div>

                {/* Right: Order Summary */}
                <div className="lg:col-span-1">
                    <OrderSummary
                        cart={cart}
                        shippingCost={shippingData?.shippingMethod?.price || 0}
                        showShipping={currentStep >= 2 && !!shippingData}
                    />
                </div>
            </div>
        </div>
    );
};

export default CheckoutWizard;
