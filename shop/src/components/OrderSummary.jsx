import React, { useState } from 'react';
import { validateCoupon } from '../services/api';

const OrderSummary = ({ 
    cart, 
    shippingCost = 0, 
    showShipping = false,
    customerEmail, // used to enable coupon validation
    couponCode,
    setCouponCode,
    discountPercentage,
    setDiscountPercentage,
    isCouponValid,
    setIsCouponValid
}) => {
    const [inputValue, setInputValue] = useState(couponCode || '');
    const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
    const [isValidating, setIsValidating] = useState(false);

    const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = isCouponValid ? (itemsTotal * discountPercentage) / 100 : 0;
    let finalTotal = itemsTotal - discountAmount + shippingCost;
    if (finalTotal < 0) finalTotal = 0;

    const handleApplyCoupon = async () => {
        if (!inputValue.trim()) return;
        setIsValidating(true);
        setCouponMessage({ text: '', type: '' });
        
        try {
            const result = await validateCoupon(inputValue, customerEmail);
            if (result.valid) {
                if (setCouponCode) setCouponCode(result.code);
                if (setDiscountPercentage) setDiscountPercentage(result.discount_percentage);
                if (setIsCouponValid) setIsCouponValid(true);
                setCouponMessage({ text: `¡Cupón de ${result.discount_percentage}% aplicado!`, type: 'success' });
            }
        } catch (error) {
            if (setCouponCode) setCouponCode('');
            if (setDiscountPercentage) setDiscountPercentage(0);
            if (setIsCouponValid) setIsCouponValid(false);
            const msg = error.response?.data?.error || 'Error al validar cupón';
            setCouponMessage({ text: msg, type: 'error' });
        } finally {
            setIsValidating(false);
        }
    };
    
    const handleRemoveCoupon = () => {
        if (setCouponCode) setCouponCode('');
        if (setDiscountPercentage) setDiscountPercentage(0);
        if (setIsCouponValid) setIsCouponValid(false);
        setInputValue('');
        setCouponMessage({ text: '', type: '' });
    };

    return (
        <div className="bg-gray-50 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>

            {/* Cart Items */}
            <div className="space-y-3 mb-4">
                {cart.map((item, index) => (
                    <div key={index} className="flex gap-3 pb-3 border-b border-gray-200">
                        <img
                            src={item.cover_image || item.coverImage || '/default-vinyl.png'}
                            alt={item.album}
                            className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{item.artist}</p>
                            <p className="text-xs text-gray-600">{item.album}</p>
                            <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold">{item.price * item.quantity} DKK</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Discount Section (Only show if we have customer email) */}
            {customerEmail && (
                <div className="py-4 border-b border-gray-300">
                    <p className="text-sm font-semibold mb-2">Discount Coupon</p>
                    {isCouponValid ? (
                        <div className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
                            <div>
                                <span className="font-bold text-green-700">{couponCode}</span>
                                <p className="text-xs text-green-600">-{discountPercentage}% applied</p>
                            </div>
                            <button 
                                onClick={handleRemoveCoupon}
                                className="text-red-500 text-xs hover:underline"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter code" 
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm uppercase"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                                    disabled={isValidating}
                                />
                                <button 
                                    onClick={handleApplyCoupon}
                                    disabled={isValidating || !inputValue.trim()}
                                    className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {isValidating ? '...' : 'Apply'}
                                </button>
                            </div>
                            {couponMessage.text && (
                                <p className={`text-xs ${couponMessage.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                    {couponMessage.text}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Totals */}
            <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{itemsTotal} DKK</span>
                </div>

                {isCouponValid && (
                    <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({discountPercentage}%):</span>
                        <span className="font-medium">- {discountAmount.toFixed(2)} DKK</span>
                    </div>
                )}

                {showShipping && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">
                            {shippingCost === 0 ? (
                                <span className="text-green-600 font-bold">FREE</span>
                            ) : (
                                `${shippingCost} DKK`
                            )}
                        </span>
                    </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                    <span>Total:</span>
                    <div className="text-right">
                        {isCouponValid && (
                            <span className="text-sm line-through text-gray-400 mr-2 font-normal">
                                {(itemsTotal + shippingCost).toFixed(2)} DKK
                            </span>
                        )}
                        <span>{finalTotal.toFixed(2)} DKK</span>
                    </div>
                </div>

                {!showShipping && (
                    <p className="text-xs text-gray-500 italic">+ Shipping (calculated in next step)</p>
                )}
            </div>
        </div>
    );
};

export default OrderSummary;
