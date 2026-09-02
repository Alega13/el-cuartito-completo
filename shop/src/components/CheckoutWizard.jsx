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
                onSuccess(saleId, paymentIntent.id, false, clientSecret);
            }, 500);
            setIsProcessing(false);
        } else {
            setMessage("Unexpected state.");
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            <div>
                <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Step 3</p>
                <h2 className="text-[28px] font-normal tracking-tight text-[#1a1a1a]">Payment</h2>
            </div>

            {/* Shipping Summary block */}
            <div className="border-t border-b border-gray-200 py-6">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Deliver to</span>
                    <button type="button" onClick={onBack} className="text-[11px] text-[#1a1a1a] hover:text-gray-500 uppercase tracking-widest">Edit</button>
                </div>
                <p className="text-[15px] text-[#1a1a1a]">
                    {shippingData?.address?.street}, {shippingData?.address?.city} {shippingData?.address?.postalCode}
                </p>
                <p className="text-[13px] text-gray-500 mt-1">
                    {shippingData?.shippingMethod?.method} 
                    {shippingData?.shippingMethod?.id !== 'local_pickup' && ` — ${shippingData?.shippingMethod?.estimatedDays}${typeof shippingData?.shippingMethod?.estimatedDays === 'number' ? ' days' : ''}`}
                </p>
            </div>

            <div className="min-h-[200px]">
                <PaymentElement />
            </div>

            {message && (
                <div className="text-red-500 text-[13px] mt-4">
                    {message}
                </div>
            )}

            <div className="pt-8">
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="w-full py-5 text-[13px] font-bold tracking-widest uppercase transition-colors
                    bg-[#1a1a1a] text-white hover:bg-black disabled:bg-[#e5e5e5] disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Complete Purchase'}
                </button>
                <div className="text-center mt-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-[13px] text-gray-400 hover:text-[#1a1a1a] transition-colors"
                    >
                        ← Return to shipping
                    </button>
                </div>
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
    const [temporaryShippingMethod, setTemporaryShippingMethod] = useState(null);
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [isCouponValid, setIsCouponValid] = useState(false);

    const [addressData, setAddressData] = useState({
        street: '',
        city: '',
        postalCode: '',
        country: 'Denmark'
    });

    const steps = ['DETAILS', 'SHIPPING', 'PAYMENT'];

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

            // Start checkout with shipping method and coupon if valid
            const result = await startCheckout(
                items, 
                fullCustomerData, 
                data.shippingMethod, 
                isCouponValid ? couponCode : null
            );

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
        <div className="min-h-screen font-sans text-[#1a1a1a]">
            {/* Header */}
            <div className="text-center text-[10px] tracking-widest text-gray-400 uppercase pt-12 pb-2">
                EL CUARTITO RECORDS
            </div>

            <StepIndicator currentStep={currentStep} steps={steps} />

            <div className="flex flex-col md:flex-row max-w-6xl mx-auto px-4 sm:px-8 pb-32">
                {/* Left: Step Content */}
                <div className="flex-1 md:pr-16 lg:pr-24">
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
                            onMethodChange={setTemporaryShippingMethod}
                        />
                    )}

                    {currentStep === 3 && clientSecret && (
                        <Elements stripe={stripePromise} options={{ 
                            clientSecret,
                            appearance: {
                                theme: 'flat',
                                variables: {
                                    colorPrimary: '#1a1a1a',
                                    colorBackground: '#f3f3f3',
                                    colorText: '#1a1a1a',
                                    colorDanger: '#df1b41',
                                    fontFamily: 'system-ui, sans-serif',
                                    spacingUnit: '4px',
                                    borderRadius: '0px',
                                },
                                rules: {
                                    '.Input': {
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        borderBottom: '1px solid #e5e7eb',
                                        boxShadow: 'none',
                                        backgroundColor: 'transparent'
                                    },
                                    '.Input:focus': {
                                        borderBottomColor: '#1a1a1a',
                                        boxShadow: 'none',
                                    }
                                }
                            }
                        }}>
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
                <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-gray-200 mt-16 md:mt-0 pt-8 md:pt-0 md:pl-12 lg:pl-16">
                    <OrderSummary
                        cart={cart}
                        shippingCost={(shippingData?.shippingMethod?.price ?? temporaryShippingMethod?.price) || 0}
                        showShipping={currentStep >= 2 && (!!shippingData || !!temporaryShippingMethod)}
                        customerEmail={customerData?.email}
                        couponCode={couponCode}
                        setCouponCode={setCouponCode}
                        discountPercentage={discountPercentage}
                        setDiscountPercentage={setDiscountPercentage}
                        isCouponValid={isCouponValid}
                        setIsCouponValid={setIsCouponValid}
                    />
                </div>
            </div>
        </div>
    );
};

export default CheckoutWizard;
