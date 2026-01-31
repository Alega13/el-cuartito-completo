import React from 'react';

const OrderSummary = ({ cart, shippingCost = 0, showShipping = false }) => {
    const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = itemsTotal + shippingCost;

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

            {/* Totals */}
            <div className="space-y-2 border-t border-gray-300 pt-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{itemsTotal} DKK</span>
                </div>

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
                    <span>{total} DKK</span>
                </div>

                {!showShipping && (
                    <p className="text-xs text-gray-500 italic">+ Shipping (calculated in next step)</p>
                )}
            </div>
        </div>
    );
};

export default OrderSummary;
