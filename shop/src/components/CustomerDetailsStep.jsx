import React, { useState } from 'react';

const CustomerDetailsStep = ({ initialData, onContinue }) => {
    const [customerData, setCustomerData] = useState(initialData || {
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};

        if (!customerData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }
        if (!customerData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }
        if (!customerData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(customerData.email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!customerData.phone.trim()) {
            newErrors.phone = 'Phone is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onContinue(customerData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Your Details</h2>
                <p className="text-gray-600">Enter your contact information</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        First Name *
                    </label>
                    <input
                        type="text"
                        value={customerData.firstName}
                        onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                        className={`
                            w-full px-4 py-3 border rounded-lg 
                            focus:ring-2 focus:ring-orange-500 focus:border-transparent
                            ${errors.firstName ? 'border-red-500' : 'border-gray-300'}
                        `}
                        placeholder="John"
                    />
                    {errors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Last Name *
                    </label>
                    <input
                        type="text"
                        value={customerData.lastName}
                        onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                        className={`
                            w-full px-4 py-3 border rounded-lg 
                            focus:ring-2 focus:ring-orange-500 focus:border-transparent
                            ${errors.lastName ? 'border-red-500' : 'border-gray-300'}
                        `}
                        placeholder="Doe"
                    />
                    {errors.lastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">
                    Email *
                </label>
                <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    className={`
                        w-full px-4 py-3 border rounded-lg 
                        focus:ring-2 focus:ring-orange-500 focus:border-transparent
                        ${errors.email ? 'border-red-500' : 'border-gray-300'}
                    `}
                    placeholder="john@example.com"
                />
                {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">
                    Phone *
                </label>
                <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    className={`
                        w-full px-4 py-3 border rounded-lg 
                        focus:ring-2 focus:ring-orange-500 focus:border-transparent
                        ${errors.phone ? 'border-red-500' : 'border-gray-300'}
                    `}
                    placeholder="+45 12 34 56 78"
                />
                {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
            </div>

            <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
                Continue to Shipping
            </button>
        </form>
    );
};

export default CustomerDetailsStep;
