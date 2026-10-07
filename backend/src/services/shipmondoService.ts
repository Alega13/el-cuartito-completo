import axios from 'axios';
import config from '../config/env';
import { normalizeQuotes, normalizePickupPoints, FrontendRate, FrontendServicePoint } from './shipmondoNormalize';

const SHIPMONDO_API_URL = config.SHIPMONDO_SANDBOX
    ? 'https://sandbox.shipmondo.com/api/public/v3'
    : 'https://app.shipmondo.com/api/public/v3';

export interface QuoteParty {
    country_code: string;
    zipcode: string;
}

export interface QuoteParcel {
    /** Weight in grams per parcel (Shipmondo `weight` is grams). */
    weight: number;
    quantity?: number;
}

export interface QuoteRequest {
    sender: QuoteParty;
    receiver: QuoteParty;
    parcels: QuoteParcel[];
}

/**
 * Shipmondo Service
 * Documentation: https://shipmondo.dev/api-reference
 * Auth: HTTP Basic base64(API_USER:API_KEY) — verified against the official
 * shipmondo-cli and setono/shipmondo-php-sdk.
 * Base: https://app.shipmondo.com/api/public/v3 (sandbox: sandbox.shipmondo.com)
 */
class ShipmondoService {
    private get headers() {
        const auth = Buffer.from(`${config.SHIPMONDO_API_USER}:${config.SHIPMONDO_API_KEY}`).toString('base64');
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };
    }

    private assertCredentials() {
        if (!config.SHIPMONDO_API_USER || !config.SHIPMONDO_API_KEY) {
            const err: any = new Error('Shipmondo API credentials not configured (SHIPMONDO_API_USER / SHIPMONDO_API_KEY)');
            err.code = 'SHIPMONDO_NO_CREDENTIALS';
            throw err;
        }
    }

    /**
     * Live rates: list available shipment quotes.
     * POST {base}/quotes/list with root `sender`/`receiver` objects
     * (the documented exception: quotes do NOT use the `parties` array).
     * Verified path via the official shipmondo-cli (`quotes create`) and the
     * OpenAPI-derived dotnet SDK (`POST /quotes/list` = "List available
     * quotes for a shipment").
     */
    async getQuotes(req: QuoteRequest): Promise<FrontendRate[]> {
        this.assertCredentials();
        const payload = {
            sender: { country_code: req.sender.country_code, zipcode: req.sender.zipcode },
            receiver: { country_code: req.receiver.country_code, zipcode: req.receiver.zipcode },
            parcels: req.parcels.map(p => ({ weight: p.weight, quantity: p.quantity || 1 })),
        };
        try {
            const response = await axios.post(`${SHIPMONDO_API_URL}/quotes/list`, payload, {
                headers: this.headers,
                timeout: 15000,
            });
            return normalizeQuotes(response.data);
        } catch (error: any) {
            console.error('❌ [SHIPMONDO] Error fetching quotes:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Nearest pickup (parcel shop) points.
     * GET {base}/pickup_points?carrier_code=&country_code=&zipcode=
     * Verified via setono/shipmondo-php-sdk PickupPointsEndpoint.
     * Returns a bare JSON array (no pagination envelope).
     */
    async getPickupPoints(carrierCode: string, countryCode: string, zipcode: string, limit = 3): Promise<FrontendServicePoint[]> {
        this.assertCredentials();
        try {
            const response = await axios.get(`${SHIPMONDO_API_URL}/pickup_points`, {
                headers: this.headers,
                timeout: 15000,
                params: {
                    carrier_code: carrierCode,
                    country_code: countryCode,
                    zipcode, // NOTE: Shipmondo's API spells it `zipcode`, not `zip_code`
                },
            });
            return normalizePickupPoints(response.data, limit);
        } catch (error: any) {
            console.error('❌ [SHIPMONDO] Error fetching pickup points:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Buy a label from a caller-supplied Shipmondo-native payload.
     * The payload MUST use the `parties` array:
     *   { type: 'sender' | 'receiver' | 'service_point', ... }
     * with `service_point_id` for parcel-shop delivery (verified via the
     * official shipmondo-cli docs).
     *
     * SAFETY: `testMode` defaults to TRUE. A live purchase (real money off
     * the Shipmondo balance) only happens when the caller explicitly passes
     * `testMode: false`. Do not flip that without Alejo's approval.
     */
    async createShipmentFromPayload(input: {
        shipment: Record<string, any>;
        productCode?: string;
        servicePointId?: string;
        reference?: string;
        testMode?: boolean;
    }) {
        this.assertCredentials();
        const testMode = input.testMode !== false; // default: safe
        const shipment: Record<string, any> = { ...(input.shipment || {}) };

        if (input.productCode) shipment.product_code = input.productCode;
        if (input.reference && !shipment.reference) shipment.reference = input.reference;
        shipment.test_mode = testMode;

        if (input.servicePointId) {
            const parties = Array.isArray(shipment.parties) ? [...shipment.parties] : [];
            const hasServicePoint = parties.some(p => p && p.type === 'service_point');
            if (!hasServicePoint) {
                parties.push({ type: 'service_point', service_point_id: String(input.servicePointId) });
            }
            shipment.parties = parties;
        }

        if (!Array.isArray(shipment.parties) || shipment.parties.length === 0) {
            const err: any = new Error('Shipment payload requires a `parties` array (sender/receiver[/service_point])');
            err.code = 'SHIPMONDO_BAD_PAYLOAD';
            throw err;
        }

        if (!testMode) {
            console.warn(`⚠️ [SHIPMONDO] LIVE purchase requested (test_mode=false) ref=${shipment.reference || 'n/a'}`);
        }
        try {
            const response = await axios.post(`${SHIPMONDO_API_URL}/shipments`, shipment, {
                headers: this.headers,
                timeout: 20000,
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ [SHIPMONDO] Error creating shipment:', error.response?.data || error.message);
            throw error;
        }
    }
    /**
     * Create a shipment in Shipmondo (legacy one-click flow used by checkout).
     * Kept as-is; the new proxy uses createShipmentFromPayload instead.
     * @param orderData Normalized order data
     */
    async createShipment(orderData: any) {
        try {
            if (!config.SHIPMONDO_API_USER || !config.SHIPMONDO_API_KEY) {
                throw new Error('Shipmondo API credentials not configured');
            }

            console.log(`📦 [SHIPMONDO] Creating shipment for order: ${orderData.orderNumber}`);

            const payload = {
                test_mode: true, // Always test mode for this specific request
                own_agreement: false,
                label_format: 'a4_pdf',
                product_code: orderData.product_code || 'GLSDK_HD', // Changed back to HD for reliability in one-click tests
                service_codes: 'EMAIL_NT,SMS_NT',
                reference: orderData.orderNumber || `Order ${orderData.id}`,
                sender: {
                    name: 'El Cuartito Records',
                    address1: 'Blågårdsgade 2',
                    city: 'København',
                    zipcode: '2200',
                    country_code: 'DK'
                },
                receiver: {
                    name: orderData.customer?.name || orderData.customerName || `${orderData.customer?.firstName} ${orderData.customer?.lastName}`,
                    address1: orderData.customer?.shipping?.line1 || orderData.customer?.address || 'No address provided',
                    address2: orderData.customer?.shipping?.line2 || '',
                    city: orderData.customer?.shipping?.city || orderData.customer?.city || 'No city provided',
                    zipcode: (orderData.customer?.shipping?.postal_code || orderData.customer?.postalCode || '1000').toString(),
                    country_code: orderData.customer?.shipping?.country || orderData.customer?.country || 'DK',
                    email: orderData.customer?.email || orderData.customerEmail,
                    mobile: orderData.customer?.phone || orderData.customer?.phone || '00000000'
                },
                parcels: [
                    {
                        weight: 1000
                    }
                ]
            };

            const response = await axios.post(`${SHIPMONDO_API_URL}/shipments`, payload, {
                headers: this.headers
            });

            return response.data;
        } catch (error: any) {
            console.error('❌ [SHIPMONDO] Error creating shipment:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get label for a shipment
     * @param shipmentId 
     */
    async getShipmentLabel(shipmentId: string) {
        try {
            const response = await axios.get(`${SHIPMONDO_API_URL}/shipments/${shipmentId}/labels`, {
                headers: this.headers
            });
            return response.data;
        } catch (error: any) {
            console.error(`❌ [SHIPMONDO] Error fetching label for ${shipmentId}:`, error.response?.data || error.message);
            throw error;
        }
    }
}

export const shipmondoService = new ShipmondoService();
export default shipmondoService;
