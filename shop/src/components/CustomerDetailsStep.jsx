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

    const inputClasses = (error) => `
        w-full py-3 bg-transparent border-b outline-none text-[15px] transition-colors
        placeholder:text-gray-300
        ${error ? 'border-red-500' : 'border-gray-200 focus:border-[#1a1a1a]'}
    `;

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            <div>
                <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Step 1</p>
                <h2 className="text-[28px] font-normal tracking-tight text-[#1a1a1a]">Contact Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        value={customerData.firstName}
                        onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
                        className={inputClasses(errors.firstName)}
                        placeholder="John"
                    />
                    {errors.firstName && (
                        <p className="text-red-500 text-[11px] mt-2">{errors.firstName}</p>
                    )}
                </div>

                <div>
                    <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        value={customerData.lastName}
                        onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
                        className={inputClasses(errors.lastName)}
                        placeholder="Doe"
                    />
                    {errors.lastName && (
                        <p className="text-red-500 text-[11px] mt-2">{errors.lastName}</p>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                    Email
                </label>
                <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                    className={inputClasses(errors.email)}
                    placeholder="john@example.com"
                />
                {errors.email && (
                    <p className="text-red-500 text-[11px] mt-2">{errors.email}</p>
                )}
            </div>

            <div>
                <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">
                    Phone
                </label>
                <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    className={inputClasses(errors.phone)}
                    placeholder="+45 12 34 56 78"
                />
                {errors.phone && (
                    <p className="text-red-500 text-[11px] mt-2">{errors.phone}</p>
                )}
            </div>

            <div className="pt-8">
                <button
                    type="submit"
                    className="w-full bg-[#1a1a1a] text-white py-5 text-[13px] font-bold tracking-widest uppercase hover:bg-black transition-colors"
                >
                    Continue to Shipping
                </button>
            </div>
        </form>
    );
};

export default CustomerDetailsStep;
