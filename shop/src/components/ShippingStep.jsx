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
        { code: 'PT', name: 'Portugal' },
        { code: 'IE', name: 'Ireland' },
        { code: 'GR', name: 'Greece' },
        { code: 'CZ', name: 'Czech Republic' },
        { code: 'HU', name: 'Hungary' },
        { code: 'RO', name: 'Romania' },
        { code: 'BG', name: 'Bulgaria' },
        { code: 'HR', name: 'Croatia' },
        { code: 'SK', name: 'Slovakia' },
        { code: 'SI', name: 'Slovenia' },
        { code: 'LT', name: 'Lithuania' },
        { code: 'LV', name: 'Latvia' },
        { code: 'EE', name: 'Estonia' },
        { code: 'LU', name: 'Luxembourg' },
        { code: 'CY', name: 'Cyprus' },
        { code: 'MT', name: 'Malta' },
    ];

    const handleCalculateShipping = async () => {
        if (!address.country) {
            setError('Please select a country');
            return;
        }

        setIsCalculating(true);
        setError('');

        try {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            const result = await calculateShipping(
                address.country,
                address.postalCode,
                address.city,
                cartTotal,
                totalItems
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
                <h2 className="text-2xl font-bold mb-2">Shipping Method</h2>
                <p className="text-gray-600">Choose how you want to receive your order</p>
            </div>

            {/* Pickup Option */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => {
                        setShowRates(false);
                        setAddress({ ...address, country: 'DK', street: 'Dybbølsgade 14', city: 'København V', postalCode: '1721' });
                        setSelectedShipping({
                            id: 'local_pickup',
                            method: 'Local Pickup (Shop)',
                            price: 0,
                            estimatedDays: 'Today',
                            description: 'Pickup at store (Dybbølsgade 14, 1721 København V)'
                        });
                    }}

                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedShipping?.id === 'local_pickup' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedShipping?.id === 'local_pickup' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <span className="font-bold">Local Pickup</span>
                    <span className="text-xs text-green-600 font-bold uppercase">0 DKK</span>
                </button>

                <button
                    onClick={() => {
                        if (selectedShipping?.id === 'local_pickup') {
                            setSelectedShipping(null);
                        }
                    }}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedShipping?.id !== 'local_pickup' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedShipping?.id !== 'local_pickup' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                    <span className="font-bold">Shipping</span>
                    <span className="text-xs text-slate-400 uppercase">Prices vary</span>
                </button>
            </div>

            {selectedShipping?.id !== 'local_pickup' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-bold mb-2">Shipping Address</h2>

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
                                    placeholder="Street Name 123"
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
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Postal Code *</label>
                                    <input
                                        type="text"
                                        value={address.postalCode}
                                        onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="1234"
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
                                                Estimated delivery: {rate.estimatedDays}{typeof rate.estimatedDays === 'number' ? ' days' : ''}
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
