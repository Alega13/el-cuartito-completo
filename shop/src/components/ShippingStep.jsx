import React, { useState, useEffect } from 'react';
import { calculateShipping } from '../services/api';

const ShippingStep = ({ cart, onShippingSelected, onBack, onMethodChange }) => {
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
    const [isPickup, setIsPickup] = useState(false);

    useEffect(() => {
        if (onMethodChange) {
            onMethodChange(selectedShipping);
        }
    }, [selectedShipping, onMethodChange]);

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

    const setLocalPickup = () => {
        setIsPickup(true);
        setShowRates(false);
        setAddress({ ...address, country: 'DK', street: 'Dybbølsgade 14', city: 'København V', postalCode: '1721' });
        setSelectedShipping({
            id: 'local_pickup',
            method: 'Local Pickup (Shop)',
            price: 0,
            estimatedDays: 'Today',
            description: 'Pickup at store (Dybbølsgade 14, 1721 København V)'
        });
    };

    const setShipToAddress = () => {
        setIsPickup(false);
        if (selectedShipping?.id === 'local_pickup') {
            setSelectedShipping(null);
        }
    };

    const inputClasses = "w-full py-3 bg-transparent border-b border-gray-200 outline-none text-[15px] focus:border-[#1a1a1a] transition-colors placeholder:text-gray-300";

    return (
        <div className="space-y-10">
            <div>
                <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Step 2</p>
                <h2 className="text-[28px] font-normal tracking-tight text-[#1a1a1a]">Delivery</h2>
            </div>

            {/* Delivery Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200 pb-2">
                <button
                    onClick={setLocalPickup}
                    className={`text-[15px] pb-2 relative transition-colors ${isPickup ? 'text-[#1a1a1a] font-medium' : 'text-gray-400 hover:text-[#1a1a1a]'}`}
                >
                    Local Pickup — Free
                    {isPickup && <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[#1a1a1a]"></div>}
                </button>
                <button
                    onClick={setShipToAddress}
                    className={`text-[15px] pb-2 relative transition-colors ${!isPickup ? 'text-[#1a1a1a] font-medium' : 'text-gray-400 hover:text-[#1a1a1a]'}`}
                >
                    Ship to Address
                    {!isPickup && <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[#1a1a1a]"></div>}
                </button>
            </div>

            {!isPickup && (
                <div className="space-y-8">
                    <div>
                        <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">Country</label>
                        <select
                            value={address.country}
                            onChange={(e) => {
                                setAddress({ ...address, country: e.target.value });
                                setShowRates(false);
                                setSelectedShipping(null);
                            }}
                            className={inputClasses}
                        >
                            {countries.map(c => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">Street Address</label>
                        <input
                            type="text"
                            value={address.street}
                            onChange={(e) => setAddress({ ...address, street: e.target.value })}
                            className={inputClasses}
                            placeholder="Street Name 123"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">Apartment / Floor (optional)</label>
                        <input
                            type="text"
                            value={address.apartment}
                            onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                            className={inputClasses}
                            placeholder="Apartment 4B"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">City</label>
                            <input
                                type="text"
                                value={address.city}
                                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                className={inputClasses}
                                placeholder="Copenhagen"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">Postal Code</label>
                            <input
                                type="text"
                                value={address.postalCode}
                                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                                className={inputClasses}
                                placeholder="1234"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={handleCalculateShipping}
                            disabled={isCalculating || !address.street || !address.city}
                            className="text-[13px] text-gray-400 hover:text-[#1a1a1a] transition-colors underline underline-offset-4 decoration-gray-300 disabled:opacity-50"
                        >
                            {isCalculating ? 'Calculating...' : 'Calculate Shipping Rates →'}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="text-red-500 text-[13px] mt-4">
                    {error}
                </div>
            )}

            {/* Shipping Methods */}
            {showRates && shippingRates.length > 0 && !isPickup && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Select Shipping Method</h3>

                    {shippingRates.map((rate) => (
                        <div
                            key={rate.id}
                            onClick={() => setSelectedShipping(rate)}
                            className={`
                                border border-gray-200 p-4 cursor-pointer transition-all flex items-center justify-between
                                ${selectedShipping?.id === rate.id ? 'border-[#1a1a1a] bg-gray-50' : 'hover:border-gray-400'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedShipping?.id === rate.id ? 'border-[#1a1a1a]' : 'border-gray-300'}`}>
                                    {selectedShipping?.id === rate.id && <div className="w-2 h-2 rounded-full bg-[#1a1a1a]"></div>}
                                </div>
                                <div>
                                    <span className="text-[15px] font-medium">{rate.method}</span>
                                    {rate.description && (
                                        <p className="text-[13px] text-gray-500 mt-0.5">{rate.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                {rate.isFree ? (
                                    <>
                                        <span className="text-[15px] font-medium text-green-600">FREE</span>
                                    </>
                                ) : (
                                    <span className="text-[15px] font-medium">{rate.price} DKK</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Navigation Button */}
            <div className="pt-8">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedShipping}
                    className="w-full py-5 text-[13px] font-bold tracking-widest uppercase transition-colors
                    bg-[#1a1a1a] text-white hover:bg-black disabled:bg-[#e5e5e5] disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    Continue to Payment
                </button>
                <div className="text-center mt-4">
                    <button
                        onClick={onBack}
                        className="text-[13px] text-gray-400 hover:text-[#1a1a1a] transition-colors"
                    >
                        ← Return to details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShippingStep;
