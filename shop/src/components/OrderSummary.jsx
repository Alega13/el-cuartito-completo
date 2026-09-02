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
                setCouponMessage({ text: `Discount of ${result.discount_percentage}% applied`, type: 'success' });
            }
        } catch (error) {
            if (setCouponCode) setCouponCode('');
            if (setDiscountPercentage) setDiscountPercentage(0);
            if (setIsCouponValid) setIsCouponValid(false);
            const msg = error.response?.data?.error || 'Invalid code';
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
        <div className="w-full">
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-8">Order Summary</h3>

            {/* Cart Items */}
            <div className="space-y-6 mb-8">
                {cart.map((item, index) => (
                    <div key={index} className="flex gap-4">
                        <img
                            src={item.cover_image || item.coverImage || '/default-vinyl.png'}
                            alt={item.album}
                            className="w-16 h-16 object-cover bg-gray-100"
                        />
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="font-medium text-[15px] truncate text-[#1a1a1a]">{item.album}</p>
                            <p className="text-[13px] text-gray-400 truncate mt-0.5">{item.artist}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="font-medium text-[15px] text-[#1a1a1a]">{(item.price * item.quantity).toFixed(2)} DKK</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-b border-gray-200 mb-8"></div>

            {/* Discount Section */}
            {customerEmail && (
                <div className="mb-8">
                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-gray-400 mb-4">Discount Code</h3>
                    {isCouponValid ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-medium text-[15px] text-[#1a1a1a]">{couponCode}</span>
                                <p className="text-[13px] text-gray-500">-{discountPercentage}% applied</p>
                            </div>
                            <button 
                                onClick={handleRemoveCoupon}
                                className="text-[13px] text-gray-400 hover:text-[#1a1a1a] transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex border-b border-gray-200 pb-2">
                                <input 
                                    type="text" 
                                    placeholder="ENTER CODE" 
                                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-300 uppercase tracking-wide"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                                    disabled={isValidating}
                                />
                                <button 
                                    onClick={handleApplyCoupon}
                                    disabled={isValidating || !inputValue.trim()}
                                    className="text-[13px] text-gray-300 hover:text-[#1a1a1a] transition-colors disabled:opacity-50 ml-4"
                                >
                                    Apply
                                </button>
                            </div>
                            {couponMessage.text && (
                                <p className={`text-[11px] ${couponMessage.type === 'error' ? 'text-red-500' : 'text-[#1a1a1a]'}`}>
                                    {couponMessage.text}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Totals */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[15px] text-gray-500">Subtotal</span>
                    <span className="font-medium text-[15px] text-[#1a1a1a]">{itemsTotal.toFixed(2)} DKK</span>
                </div>

                {isCouponValid && (
                    <div className="flex justify-between items-center text-gray-500">
                        <span className="text-[15px]">Discount</span>
                        <span className="font-medium text-[15px]">- {discountAmount.toFixed(2)} DKK</span>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <span className="text-[15px] text-gray-500">Shipping</span>
                    <span className={`text-[13px] ${showShipping ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
                        {showShipping ? (
                            shippingCost === 0 ? <span className="font-bold text-orange-500 text-[15px]">FREE</span> : <span className="font-medium text-[15px]">{shippingCost.toFixed(2)} DKK</span>
                        ) : (
                            'Calculated next step'
                        )}
                    </span>
                </div>

                <div className="pt-6 mt-6 border-t border-[#1a1a1a] flex justify-between items-center">
                    <span className="font-medium text-[15px] text-[#1a1a1a]">Total</span>
                    <span className="font-medium text-[15px] text-[#1a1a1a]">{finalTotal.toFixed(2)} DKK</span>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;
