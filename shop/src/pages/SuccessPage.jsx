import React, { useEffect, useState } from 'react';

const SuccessPage = ({ setPage }) => {
    const [orderData, setOrderData] = useState(null);

    useEffect(() => {
        const data = sessionStorage.getItem('lastOrder');
        if (data) {
            setOrderData(JSON.parse(data));
            // Keep data for now so it doesn't disappear on refresh
            // sessionStorage.removeItem('lastOrder');
        } else {
            // No order data, redirect to home
            setPage('home');
        }
    }, [setPage]);

    if (!orderData) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Success Icon */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 border-4 border-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Pedido Confirmado!</h1>
                    <p className="text-gray-600">Gracias por tu compra</p>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                        <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-1">Número de Orden</h2>
                        <p className="text-2xl font-mono font-bold text-orange-600">{orderData.orderNumber}</p>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6">
                        <h3 className="text-sm text-gray-500 uppercase tracking-wide mb-3">Información de Envío</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="font-semibold text-gray-900">{orderData.customer.firstName} {orderData.customer.lastName}</p>
                            <p className="text-gray-600 text-sm mt-1">{orderData.customer.email}</p>
                            <p className="text-gray-600 text-sm mt-2">{orderData.customer.address}</p>
                            <p className="text-gray-600 text-sm">{orderData.customer.postalCode} {orderData.customer.city}</p>
                            <p className="text-gray-600 text-sm">{orderData.customer.country}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-6">
                        <h3 className="text-sm text-gray-500 uppercase tracking-wide mb-3">Productos</h3>
                        <div className="space-y-3">
                            {orderData.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                                    <img
                                        src={item.cover || '/default-vinyl.png'}
                                        alt={item.album}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{item.album}</p>
                                        <p className="text-sm text-gray-600">{item.artist}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">DKK {item.price.toFixed(2)}</p>
                                        {item.quantity > 1 && (
                                            <p className="text-xs text-gray-500">x{item.quantity}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900">Total</span>
                            <span className="text-2xl font-bold text-gray-900">DKK {orderData.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">📧 Próximos Pasos</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Recibirás un email de confirmación en {orderData.customer.email}</li>
                        <li>• Prepararemos tu pedido en 1-2 días hábiles</li>
                        <li>• Te notificaremos cuando tu pedido sea enviado</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={() => setPage('home')}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        Volver a la Tienda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
