import axios from 'axios';
import config from '../config/env';

const SHIPMONDO_API_URL = config.SHIPMONDO_SANDBOX
    ? 'https://sandbox.shipmondo.com/api/public/v3'
    : 'https://app.shipmondo.com/api/public/v3';

/**
 * Shipmondo Service
 * Documentation: https://shipmondo.dev/api-reference
 */
class ShipmondoService {
    private get headers() {
        const auth = Buffer.from(`${config.SHIPMONDO_API_USER}:${config.SHIPMONDO_API_KEY}`).toString('base64');
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Create a shipment in Shipmondo
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
