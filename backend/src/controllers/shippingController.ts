import { Request, Response } from 'express';

// Shipping rate configuration
interface ShippingRate {
    id: string;
    method: string;
    price: number;
    estimatedDays: string;
    description?: string;
}

interface ShippingZone {
    countries: string[];
    rates: ShippingRate[];
}

// Define shipping zones and rates
const SHIPPING_ZONES: ShippingZone[] = [
    {
        // Denmark - Local shipping
        countries: ['DK', 'Denmark'],
        rates: [
            {
                id: 'dk_parcel_shop',
                method: 'Parcel Shop (DAO/GLS)',
                price: 45,
                estimatedDays: '2-3',
                description: 'Recoger en punto de recogida cercano'
            },
            {
                id: 'dk_home_delivery',
                method: 'Home Delivery',
                price: 89,
                estimatedDays: '1-2',
                description: 'Entrega a domicilio'
            }
        ]
    },
    {
        // Nordic countries (Norway, Sweden, Finland)
        countries: ['NO', 'SE', 'FI', 'Norway', 'Sweden', 'Finland'],
        rates: [
            {
                id: 'nordic_standard',
                method: 'Nordic Standard',
                price: 75,
                estimatedDays: '3-5',
                description: 'Envío estándar a países nórdicos'
            }
        ]
    },
    {
        // European Union
        countries: [
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'EE', 'FR', 'DE', 'GR',
            'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
            'RO', 'SK', 'SI', 'ES',
            'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
            'Estonia', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy',
            'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland',
            'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain'
        ],
        rates: [
            {
                id: 'eu_standard',
                method: 'EU Standard',
                price: 95,
                estimatedDays: '5-7',
                description: 'Envío estándar a la UE'
            },
            {
                id: 'eu_express',
                method: 'EU Express',
                price: 165,
                estimatedDays: '2-4',
                description: 'Envío express a la UE'
            }
        ]
    }
];

// Free shipping threshold (in DKK)
const FREE_SHIPPING_THRESHOLD = 500;

/**
 * Calculate shipping rates for a given address
 */
export const calculateShipping = async (req: Request, res: Response) => {
    try {
        const { country, postalCode, city, orderTotal } = req.body;

        if (!country) {
            return res.status(400).json({
                error: 'Country is required'
            });
        }

        // Normalize country input (handle both codes and full names)
        const normalizedCountry = country.trim().toUpperCase();

        // Find matching shipping zone
        let matchingZone: ShippingZone | undefined;

        for (const zone of SHIPPING_ZONES) {
            const countryMatch = zone.countries.find(c =>
                c.toUpperCase() === normalizedCountry ||
                c.toUpperCase() === country.trim()
            );

            if (countryMatch) {
                matchingZone = zone;
                break;
            }
        }

        // If no zone found, return error (we don't ship there)
        if (!matchingZone) {
            return res.status(400).json({
                error: 'Shipping to this country is not available',
                message: 'Lo sentimos, no realizamos envíos a este país.'
            });
        }

        // Check for free shipping eligibility
        const isFreeShipping = orderTotal && orderTotal >= FREE_SHIPPING_THRESHOLD;

        // Prepare rates
        let rates = matchingZone.rates.map(rate => ({
            ...rate,
            price: isFreeShipping ? 0 : rate.price,
            originalPrice: rate.price,
            isFree: isFreeShipping
        }));

        res.json({
            country: normalizedCountry,
            rates,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            qualifiesForFreeShipping: isFreeShipping,
            orderTotal: orderTotal || 0
        });

    } catch (error: any) {
        console.error('Shipping calculation error:', error);
        res.status(500).json({
            error: 'Failed to calculate shipping',
            message: error.message
        });
    }
};

/**
 * Get all available shipping zones (for admin or info purposes)
 */
export const getShippingZones = async (req: Request, res: Response) => {
    try {
        res.json({
            zones: SHIPPING_ZONES,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            currency: 'DKK'
        });
    } catch (error: any) {
        console.error('Get shipping zones error:', error);
        res.status(500).json({
            error: 'Failed to get shipping zones',
            message: error.message
        });
    }
};
