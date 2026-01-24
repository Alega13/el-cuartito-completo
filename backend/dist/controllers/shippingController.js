"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readyForPickup = exports.manualShipOrder = exports.shipOrder = exports.getShipmentLabel = exports.createShipment = exports.getShippingZones = exports.calculateShipping = void 0;
const shipmondoService_1 = require("../services/shipmondoService");
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const mailService_1 = require("../services/mailService");
// Define shipping zones and rates
const SHIPPING_ZONES = [
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
const calculateShipping = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        let matchingZone;
        for (const zone of SHIPPING_ZONES) {
            const countryMatch = zone.countries.find(c => c.toUpperCase() === normalizedCountry ||
                c.toUpperCase() === country.trim());
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
        let rates = matchingZone.rates.map(rate => (Object.assign(Object.assign({}, rate), { price: isFreeShipping ? 0 : rate.price, originalPrice: rate.price, isFree: isFreeShipping })));
        res.json({
            country: normalizedCountry,
            rates,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            qualifiesForFreeShipping: isFreeShipping,
            orderTotal: orderTotal || 0
        });
    }
    catch (error) {
        console.error('Shipping calculation error:', error);
        res.status(500).json({
            error: 'Failed to calculate shipping',
            message: error.message
        });
    }
});
exports.calculateShipping = calculateShipping;
/**
 * Get all available shipping zones (for admin or info purposes)
 */
const getShippingZones = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            zones: SHIPPING_ZONES,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            currency: 'DKK'
        });
    }
    catch (error) {
        console.error('Get shipping zones error:', error);
        res.status(500).json({
            error: 'Failed to get shipping zones',
            message: error.message
        });
    }
});
exports.getShippingZones = getShippingZones;
/**
 * Create a shipment on Shipmondo for a specific sale
 */
const createShipment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { saleId } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(saleId);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        const saleData = saleDoc.data();
        // Call Shipmondo service
        const shipment = yield shipmondoService_1.shipmondoService.createShipment(saleData);
        // Update sale with shipping info
        const shippingInfo = {
            shipment_id: shipment.id || null,
            tracking_number: shipment.tracking_number || null,
            label_url: ((_b = (_a = shipment.labels) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url) || null, // Assuming the first label
            status: 'created',
            carrier: shipment.product_code || 'GLS',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        yield saleRef.update({
            shipment: shippingInfo,
            fulfillment_status: 'shipped', // Update global fulfillment status
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        // Trigger shipping notification email
        yield (0, mailService_1.sendShippingNotificationEmail)(saleData, shippingInfo);
        res.json({
            success: true,
            shipment_id: shipment.id,
            tracking_number: shipment.tracking_number,
            label_url: (_d = (_c = shipment.labels) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.url
        });
    }
    catch (error) {
        console.error('Error in createShipment controller:', error);
        res.status(500).json({
            error: 'Failed to create shipment',
            message: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message
        });
    }
});
exports.createShipment = createShipment;
/**
 * Get labels for a shipment
 */
const getShipmentLabel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { shipmentId } = req.params;
        const labels = yield shipmondoService_1.shipmondoService.getShipmentLabel(shipmentId);
        res.json(labels);
    }
    catch (error) {
        console.error('Error in getShipmentLabel controller:', error);
        res.status(500).json({
            error: 'Failed to fetch shipment label',
            message: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message
        });
    }
});
exports.getShipmentLabel = getShipmentLabel;
/**
 * Dispatch an order (New requested endpoint POST /api/ship-order)
 * Receives { orderId } in body
 */
const shipOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required in body' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(orderId);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const saleData = saleDoc.data();
        console.log(`🚀 [SHIP-ORDER] Dispatching order ${orderId}`);
        // Step B & C: Call Shipmondo API
        const shipment = yield shipmondoService_1.shipmondoService.createShipment(saleData);
        // Step D: Update Firestore
        const trackingNumber = shipment.tracking_number || null;
        const labelUrl = ((_b = (_a = shipment.labels) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url) || null;
        const shippingInfo = {
            shipment_id: shipment.id || null,
            tracking_number: trackingNumber,
            label_url: labelUrl,
            status: 'created',
            carrier: shipment.product_code || 'GLS',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        yield saleRef.update({
            status: 'shipped', // Specific requested status
            shipment: shippingInfo,
            fulfillment_status: 'shipped',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        // Step E: Send Email via Resend
        yield (0, mailService_1.sendShipOrderEmail)(saleData, shippingInfo);
        // Response: Success + PDF URL
        res.json({
            success: true,
            message: 'Order shipped successfully',
            trackingNumber: trackingNumber,
            labelUrl: labelUrl
        });
    }
    catch (error) {
        console.error('❌ [SHIP-ORDER] Error:', ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to ship order',
            message: ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message
        });
    }
});
exports.shipOrder = shipOrder;
/**
 * Manually ship an order with a tracking number
 * Receives { orderId, trackingNumber } in body
 */
const manualShipOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, trackingNumber } = req.body;
        if (!orderId || !trackingNumber) {
            return res.status(400).json({ error: 'orderId and trackingNumber are required' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(orderId);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const saleData = saleDoc.data();
        console.log(`🚀 [MANUAL-SHIP] Shipping order ${orderId} with tracking ${trackingNumber}`);
        const shippingInfo = {
            tracking_number: trackingNumber,
            status: 'shipped',
            carrier: 'Manual', // Default to manual
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        yield saleRef.update({
            status: 'shipped',
            shipment: shippingInfo,
            fulfillment_status: 'shipped',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        // Send Email via Resend
        yield (0, mailService_1.sendShipOrderEmail)(saleData, shippingInfo);
        res.json({
            success: true,
            message: 'Order shipped manually successfully',
            trackingNumber: trackingNumber
        });
    }
    catch (error) {
        console.error('❌ [MANUAL-SHIP] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to ship order manually',
            message: error.message
        });
    }
});
exports.manualShipOrder = manualShipOrder;
/**
 * Mark an order as ready for local pickup
 * Receives { orderId } in body
 */
const readyForPickup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: 'orderId is required' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(orderId);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const saleData = saleDoc.data();
        console.log(`🚀 [PICKUP-READY] Marking order ${orderId} as ready for pickup`);
        yield saleRef.update({
            status: 'ready_for_pickup',
            fulfillment_status: 'ready_for_pickup',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        // Send Email via Resend
        yield (0, mailService_1.sendPickupReadyEmail)(saleData);
        res.json({
            success: true,
            message: 'Order marked as ready for pickup successfully'
        });
    }
    catch (error) {
        console.error('❌ [PICKUP-READY] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to mark order as ready for pickup',
            message: error.message
        });
    }
});
exports.readyForPickup = readyForPickup;
