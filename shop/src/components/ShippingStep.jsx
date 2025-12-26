import React, { useState, useEffect } from 'react';
import { calculateShipping } from '../services/api';

const ShippingStep = ({ cart, onShippingSelected, onBack }) => {
    const [address, setAddress] = useState({
        street: '',
        apartment: '',
        city: '',
        postalCode: '',
        country: 'DK' // Default to Denmark
    });

    const [shippingRates, setShippingRates] = useState([]);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState('');
    const [showRates, setShowRates] = useState(false);

    // Calculate cart total
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Countries list
    const countries = [
        { code: 'DK', name: 'Denmark' },
        { code: 'NO', name: 'Norway' },
        { code: 'SE', name: 'Sweden' },
        { code: 'FI', name: 'Finland' },
        { code: 'DE', name: 'Germany' },
        { code: 'NL', name: 'Netherlands' },
        { code: 'BE', name: 'Belgium' },
        { code: 'FR', name: 'France' },
        { code: 'ES', name: 'Spain' },
        { code: 'IT', name: 'Italy' },
        { code: 'AT', name: 'Austria' },
        { code: 'PL', name: 'Poland' },
    ];

    const handleCalculateShipping = async () => {
        if (!address.country) {
            setError('Please select a country');
            return;
        }

        setIsCalculating(true);
        setError('');

        try {
            const result = await calculateShipping(
                address.country,
                address.postalCode,
                address.city,
                cartTotal
            );

            setShippingRates(result.rates || []);
            setShowRates(true);

            // Auto-select first option
            if (result.rates && result.rates.length > 0) {
                setSelectedShipping(result.rates[0]);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to calculate shipping. Please try again.');
            setShowRates(false);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSubmit = () => {
        if (!selectedShipping) {
            setError('Please select a shipping method');
            return;
        }

        onShippingSelected({
            address,
            shippingMethod: selectedShipping
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Shipping Address</h2>
                <p className="text-gray-600">Enter your delivery address</p>
            </div>

            {/* Address Form */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Country *</label>
                    <select
                        value={address.country}
                        onChange={(e) => {
                            setAddress({ ...address, country: e.target.value });
                            setShowRates(false);
                            setSelectedShipping(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        {countries.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Street Address *</label>
                    <input
                        type="text"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Larsbjørnsstraede 9"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Apartment, room, etc. (optional)</label>
                    <input
                        type="text"
                        value={address.apartment}
                        onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Apartment 4B"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">City *</label>
                        <input
                            type="text"
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="København"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Postal Code *</label>
                        <input
                            type="text"
                            value={address.postalCode}
                            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="1454"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCalculateShipping}
                    disabled={isCalculating || !address.street || !address.city}
                    className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isCalculating ? 'Calculating...' : 'Calculate Shipping'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Shipping Methods */}
            {showRates && shippingRates.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Select Shipping Method</h3>

                    {shippingRates.map((rate) => (
                        <div
                            key={rate.id}
                            onClick={() => setSelectedShipping(rate)}
                            className={`
                                border-2 rounded-lg p-4 cursor-pointer transition-all
                                ${selectedShipping?.id === rate.id
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-orange-300'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={selectedShipping?.id === rate.id}
                                            onChange={() => setSelectedShipping(rate)}
                                            className="text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="font-semibold">{rate.method}</span>
                                    </div>
                                    {rate.description && (
                                        <p className="text-sm text-gray-600 ml-6 mt-1">{rate.description}</p>
                                    )}
                                    <p className="text-sm text-gray-500 ml-6 mt-1">
                                        Estimated delivery: {rate.estimatedDays} days
                                    </p>
                                </div>
                                <div className="text-right">
                                    {rate.isFree ? (
                                        <>
                                            <span className="text-lg font-bold text-green-600">FREE</span>
                                            <p className="text-xs text-gray-500 line-through">{rate.originalPrice} DKK</p>
                                        </>
                                    ) : (
                                        <span className="text-lg font-bold">{rate.price} DKK</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!selectedShipping}
                    className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    Continue to Payment
                </button>
            </div>
        </div>
    );
};

export default ShippingStep;
