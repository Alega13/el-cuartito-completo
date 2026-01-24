import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CheckoutWizard from '../components/CheckoutWizard';

const CheckoutPage = () => {
    const { cartItems } = useCart();
    const navigate = useNavigate();

    // Handle successful payment
    const handleSuccess = (saleId, paymentId, skipPreSave = false, clientSecret = null) => {
        // When payment succeeds without Stripe redirect (if_required mode)
        // we need to manually navigate to the success page with the client secret and saleId
        if (!skipPreSave && paymentId && paymentId !== "pending" && clientSecret) {
            // Payment completed successfully, redirect to success page
            navigate(`/checkout/success?payment_intent_client_secret=${clientSecret}&saleId=${saleId}`);
        }
    };

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <CheckoutWizard cart={cartItems} onSuccess={handleSuccess} />
        </div>
    );
};

export default CheckoutPage;
