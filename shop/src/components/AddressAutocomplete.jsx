import React, { useEffect, useRef, useState } from 'react';

const AddressAutocomplete = ({ value, onChange, onPlaceSelected, placeholder = "Address" }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');

    // Sync external value changes
    useEffect(() => {
        if (value !== undefined) {
            setInputValue(value);
        }
    }, [value]);

    useEffect(() => {
        // Check if Google Maps script is already loaded
        if (window.google && window.google.maps && window.google.maps.places) {
            setScriptLoaded(true);
            return;
        }

        // Load Google Maps script
        const script = document.createElement('script');
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

        if (!apiKey) {
            console.error('Google Places API key not found');
            return;
        }

        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => console.error('Failed to load Google Maps script');
        document.head.appendChild(script);

        return () => {
            // Cleanup script on unmount
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !inputRef.current || autocompleteRef.current) return;

        try {
            // Initialize Google Places Autocomplete
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ['address'],
                fields: ['address_components', 'formatted_address', 'geometry']
            });

            // Listen for place selection
            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current.getPlace();

                if (!place.address_components) {
                    console.log('No address details for:', place.name);
                    return;
                }

                // Extract address components
                const addressComponents = {};
                place.address_components.forEach(component => {
                    const type = component.types[0];
                    addressComponents[type] = component.long_name;
                });

                // Create structured address object
                const addressData = {
                    fullAddress: place.formatted_address,
                    street: `${addressComponents.street_number || ''} ${addressComponents.route || ''}`.trim(),
                    city: addressComponents.locality || addressComponents.postal_town || '',
                    state: addressComponents.administrative_area_level_1 || '',
                    postalCode: addressComponents.postal_code || '',
                    country: addressComponents.country || ''
                };

                // Update local input value
                setInputValue(addressData.fullAddress);

                // Call parent callback with structured data
                if (onPlaceSelected) {
                    onPlaceSelected(addressData);
                }
            });
        } catch (error) {
            console.error('Error initializing Google Places Autocomplete:', error);
        }
    }, [scriptLoaded, onPlaceSelected]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            autoComplete="off"
        />
    );
};

export default AddressAutocomplete;
