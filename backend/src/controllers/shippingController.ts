import { Request, Response } from 'express';
import { shipmondoService } from '../services/shipmondoService';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { sendShippingNotificationEmail, sendShipOrderEmail, sendPickupReadyEmail } from '../services/mailService';

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
        const { country, postalCode, city, orderTotal, itemCount = 1 } = req.body;

        if (!country) {
            return res.status(400).json({
                error: 'Country is required'
            });
        }

        // Normalize country input
        const normalizedCountry = country.trim().toUpperCase();
        const isDenmark = normalizedCountry === 'DK' || normalizedCountry === 'DENMARK';

        // EU Countries list for logic
        const euCountries = [
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'EE', 'FR', 'DE', 'GR',
            'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
            'RO', 'SK', 'SI', 'ES', 'SE', 'FI', 'NO',
            'AUSTRIA', 'BELGIUM', 'BULGARIA', 'CROATIA', 'CYPRUS', 'CZECH REPUBLIC',
            'ESTONIA', 'FRANCE', 'GERMANY', 'GREECE', 'HUNGARY', 'IRELAND', 'ITALY',
            'LATVIA', 'LITHUANIA', 'LUXEMBOURG', 'MALTA', 'NETHERLANDS', 'POLAND',
            'PORTUGAL', 'ROMANIA', 'SLOVAKIA', 'SLOVENIA', 'SPAIN', 'SWEDEN', 'FINLAND', 'NORWAY'
        ];
        const isEU = euCountries.includes(normalizedCountry);

        let rates: ShippingRate[] = [];

        if (isDenmark) {
            // DAO Shop Pickup
            // 1 vinyl: 50kr
            // 2-4 vinyls: 55kr
            let daoPickupPrice = itemCount <= 1 ? 50 : 55;
            rates.push({
                id: 'dao_pickup',
                method: 'DAO Parcel Shop (Pickup)',
                price: daoPickupPrice,
                estimatedDays: '2-3',
                description: 'Recoger en punto DAO cercano'
            });

            // DAO Home Delivery
            // 1 vinyl: 60kr
            // 2-4 vinyls: 70kr
            let daoHomePrice = itemCount <= 1 ? 60 : 70;
            rates.push({
                id: 'dao_home',
                method: 'DAO Home Delivery',
                price: daoHomePrice,
                estimatedDays: '2-3',
                description: 'Entrega a domicilio con DAO'
            });

            // GLS Pickup
            // 1 vinyl: 50kr
            // 2-7 vinyls: 70kr
            let glsPickupPrice = itemCount <= 1 ? 50 : 70;
            rates.push({
                id: 'gls_pickup',
                method: 'GLS Parcel Shop (Pickup)',
                price: glsPickupPrice,
                estimatedDays: '1-2',
                description: 'Recoger en punto GLS cercano'
            });

            // GLS Home Delivery
            // 1 vinyl: 80kr
            // 2-7 vinyls: 100kr
            let glsHomePrice = itemCount <= 1 ? 80 : 100;
            rates.push({
                id: 'gls_home',
                method: 'GLS Home Delivery',
                price: glsHomePrice,
                estimatedDays: '1-2',
                description: 'Entrega a domicilio con GLS'
            });

        } else if (isEU) {
            // EU GLS Pickup
            // 1 vinyl: 105kr
            // 2-7 vinyls: 130kr
            let euPickupPrice = itemCount <= 1 ? 105 : 130;
            rates.push({
                id: 'eu_gls_pickup',
                method: 'GLS International (Pickup)',
                price: euPickupPrice,
                estimatedDays: '4-6',
                description: 'Recoger en punto GLS (Europa)'
            });

            // EU GLS Home Delivery
            // 1 vinyl: 120kr
            // 2-7 vinyls: 150kr
            let euHomePrice = itemCount <= 1 ? 120 : 150;
            rates.push({
                id: 'eu_gls_home',
                method: 'GLS International (Home)',
                price: euHomePrice,
                estimatedDays: '3-5',
                description: 'Entrega a domicilio (Europa)'
            });
        } else {
            // Fallback for other countries (Nordics or others not explicitly in EU list)
            // Use old EU standard for now as fallback
            rates.push({
                id: 'intl_standard',
                method: 'International Standard',
                price: 150,
                estimatedDays: '7-10',
                description: 'Envío internacional estándar'
            });
        }

        // Apply Free Shipping if applicable
        const isFreeShipping = orderTotal && orderTotal >= FREE_SHIPPING_THRESHOLD;

        const finalRates = rates.map(rate => ({
            ...rate,
            price: isFreeShipping ? 0 : rate.price,
            originalPrice: rate.price,
            isFree: isFreeShipping
        }));

        res.json({
            country: normalizedCountry,
            itemCount,
            rates: finalRates,
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

/**
 * Create a shipment on Shipmondo for a specific sale
 */
export const createShipment = async (req: Request, res: Response) => {
    try {
        const { saleId } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(saleId);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const saleData = saleDoc.data() as any;

        // Call Shipmondo service
        const shipment = await shipmondoService.createShipment(saleData);

        // Update sale with shipping info
        const shippingInfo = {
            shipment_id: shipment.id || null,
            tracking_number: shipment.tracking_number || null,
            label_url: shipment.labels?.[0]?.url || null, // Assuming the first label
            status: 'created',
            carrier: shipment.product_code || 'GLS',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await saleRef.update({
            shipment: shippingInfo,
            fulfillment_status: 'shipped', // Update global fulfillment status
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Trigger shipping notification email
        await sendShippingNotificationEmail(saleData, shippingInfo);

        res.json({
            success: true,
            shipment_id: shipment.id,
            tracking_number: shipment.tracking_number,
            label_url: shipment.labels?.[0]?.url
        });
    } catch (error: any) {
        console.error('Error in createShipment controller:', error);
        res.status(500).json({
            error: 'Failed to create shipment',
            message: error.response?.data || error.message
        });
    }
};

/**
 * Get labels for a shipment
 */
export const getShipmentLabel = async (req: Request, res: Response) => {
    try {
        const { shipmentId } = req.params;
        const labels = await shipmondoService.getShipmentLabel(shipmentId);
        res.json(labels);
    } catch (error: any) {
        console.error('Error in getShipmentLabel controller:', error);
        res.status(500).json({
            error: 'Failed to fetch shipment label',
            message: error.response?.data || error.message
        });
    }
};

/**
 * Dispatch an order (New requested endpoint POST /api/ship-order)
 * Receives { orderId } in body
 */
export const shipOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required in body' });
        }

        const db = getDb();
        const saleRef = db.collection('sales').doc(orderId);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const saleData = saleDoc.data() as any;

        console.log(`🚀 [SHIP-ORDER] Dispatching order ${orderId}`);

        // Step B & C: Call Shipmondo API
        const shipment = await shipmondoService.createShipment(saleData);

        // Step D: Update Firestore
        const trackingNumber = shipment.tracking_number || null;
        const labelUrl = shipment.labels?.[0]?.url || null;

        const shippingInfo = {
            shipment_id: shipment.id || null,
            tracking_number: trackingNumber,
            label_url: labelUrl,
            status: 'created',
            carrier: shipment.product_code || 'GLS',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await saleRef.update({
            status: 'shipped', // Specific requested status
            shipment: shippingInfo,
            fulfillment_status: 'shipped',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Step E: Send Email via Resend
        const mailResult = await sendShipOrderEmail(saleData, shippingInfo);

        // Response: Success + PDF URL
        res.json({
            success: true,
            message: 'Order shipped successfully',
            trackingNumber: trackingNumber,
            labelUrl: labelUrl,
            emailSent: mailResult.success,
            emailError: mailResult.error
        });

    } catch (error: any) {
        console.error('❌ [SHIP-ORDER] Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to ship order',
            message: error.response?.data || error.message
        });
    }
};

/**
 * Manually ship an order with a tracking number
 * Receives { orderId, trackingNumber } in body
 */
export const manualShipOrder = async (req: Request, res: Response) => {
    try {
        const { orderId, trackingNumber } = req.body;

        if (!orderId || !trackingNumber) {
            return res.status(400).json({ error: 'orderId and trackingNumber are required' });
        }

        const db = getDb();
        const saleRef = db.collection('sales').doc(orderId);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const saleData = saleDoc.data() as any;

        console.log(`🚀 [MANUAL-SHIP] Shipping order ${orderId} with tracking ${trackingNumber}`);
        console.log(`📦 [MANUAL-SHIP] Sale Data Keys: ${Object.keys(saleData).join(', ')}`);
        console.log(`📦 [MANUAL-SHIP] Customer Field: ${JSON.stringify(saleData.customer || 'null')}`);
        console.log(`📦 [MANUAL-SHIP] customerEmail Field: ${saleData.customerEmail || 'null'}`);

        const shippingInfo = {
            tracking_number: trackingNumber,
            status: 'shipped',
            carrier: 'Manual', // Default to manual
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await saleRef.update({
            status: 'shipped',
            shipment: shippingInfo,
            fulfillment_status: 'shipped',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send Email via Resend
        const mailResult = await sendShipOrderEmail(saleData, shippingInfo);

        res.json({
            success: true,
            message: 'Order shipped manually successfully',
            trackingNumber: trackingNumber,
            emailSent: mailResult.success,
            emailError: mailResult.error
        });

    } catch (error: any) {
        console.error('❌ [MANUAL-SHIP] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to ship order manually',
            message: error.message
        });
    }
};

/**
 * Mark an order as ready for local pickup
 * Receives { orderId } in body
 */
export const readyForPickup = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' });
        }

        const db = getDb();
        const saleRef = db.collection('sales').doc(orderId);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const saleData = saleDoc.data() as any;

        console.log(`🚀 [PICKUP-READY] Marking order ${orderId} as ready for pickup`);

        await saleRef.update({
            status: 'ready_for_pickup',
            fulfillment_status: 'ready_for_pickup',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send Email via Resend
        await sendPickupReadyEmail(saleData);

        res.json({
            success: true,
            message: 'Order marked as ready for pickup successfully'
        });

    } catch (error: any) {
        console.error('❌ [PICKUP-READY] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to mark order as ready for pickup',
            message: error.message
        });
    }
};

// Diagnostic endpoint to test email sending
export const testEmail = async (req: Request, res: Response) => {
    try {
        const { email, orderId } = req.body;

        // Mode 1: Debug specific order
        // This mode fetches the real order data and tries to send the email exactly as the production system would.
        if (orderId) {
            console.log(`🧪 [TEST-EMAIL] Debugging real order: ${orderId}`);
            const db = getDb();
            const saleRef = db.collection('sales').doc(orderId);
            const saleDoc = await saleRef.get();

            if (!saleDoc.exists) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const saleData = saleDoc.data() as any;
            if (!saleData.id) saleData.id = orderId; // Ensure ID is present for templates

            const shippingInfo = saleData.shipment || {
                tracking_number: 'TEST-DEBUG-123',
                carrier: 'DebugCarrier'
            };

            const result = await sendShipOrderEmail(saleData, shippingInfo);

            return res.json({
                mode: 'real_order_debug',
                orderId,
                rawDataKeys: Object.keys(saleData),
                customerField: saleData.customer,
                emailDetectionResult: result
            });
        }

        // Mode 2: Simple email test
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const dummyOrder = {
            orderNumber: 'TEST-12345',
            customerName: 'Test User',
            customerEmail: email,
            items: [{ album: 'Test Album', artist: 'Test Artist', quantity: 1, unitPrice: 100 }]
        };

        const dummyShipment = {
            tracking_number: 'TEST-TRACK-999',
            carrier: 'TestCarrier'
        };

        console.log(`🧪 [TEST-EMAIL] Triggering sendShipOrderEmail to ${email}...`);

        const result = await sendShipOrderEmail(dummyOrder, dummyShipment);

        res.json({
            success: true,
            message: `Email test triggered for ${email}. Check Railway logs for "✅ Tracking notification sent successfully" or errors.`,
            result
        });
    } catch (error: any) {
        console.error('❌ [TEST-EMAIL] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
