import React from 'react';
import { useCart } from '../context/CartContext';
import CheckoutWizard from '../components/CheckoutWizard';

const CheckoutPage = ({ setPage, setSaleId }) => {
    const { cart } = useCart();

    // Handle successful payment
    const handleSuccess = (saleId, paymentId, skipPreSave = false) => {
        // Save saleId for success page
        if (setSaleId) {
            setSaleId(saleId);
        }

        // Navigate to success page
        if (!skipPreSave && setPage) {
            setPage('success');
        }
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                    <button
                        onClick={() => setPage && setPage('home')}
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
            <CheckoutWizard cart={cart} onSuccess={handleSuccess} />
        </div>
    );
};

export default CheckoutPage;
