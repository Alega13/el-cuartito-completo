"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipmondoService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = __importDefault(require("../config/env"));
const SHIPMONDO_API_URL = env_1.default.SHIPMONDO_SANDBOX
    ? 'https://sandbox.shipmondo.com/api/public/v3'
    : 'https://app.shipmondo.com/api/public/v3';
/**
 * Shipmondo Service
 * Documentation: https://shipmondo.dev/api-reference
 */
class ShipmondoService {
    get headers() {
        const auth = Buffer.from(`${env_1.default.SHIPMONDO_API_USER}:${env_1.default.SHIPMONDO_API_KEY}`).toString('base64');
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };
    }
    /**
     * Create a shipment in Shipmondo
     * @param orderData Normalized order data
     */
    createShipment(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
            try {
                if (!env_1.default.SHIPMONDO_API_USER || !env_1.default.SHIPMONDO_API_KEY) {
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
                        name: ((_a = orderData.customer) === null || _a === void 0 ? void 0 : _a.name) || orderData.customerName || `${(_b = orderData.customer) === null || _b === void 0 ? void 0 : _b.firstName} ${(_c = orderData.customer) === null || _c === void 0 ? void 0 : _c.lastName}`,
                        address1: ((_e = (_d = orderData.customer) === null || _d === void 0 ? void 0 : _d.shipping) === null || _e === void 0 ? void 0 : _e.line1) || ((_f = orderData.customer) === null || _f === void 0 ? void 0 : _f.address) || 'No address provided',
                        address2: ((_h = (_g = orderData.customer) === null || _g === void 0 ? void 0 : _g.shipping) === null || _h === void 0 ? void 0 : _h.line2) || '',
                        city: ((_k = (_j = orderData.customer) === null || _j === void 0 ? void 0 : _j.shipping) === null || _k === void 0 ? void 0 : _k.city) || ((_l = orderData.customer) === null || _l === void 0 ? void 0 : _l.city) || 'No city provided',
                        zipcode: (((_o = (_m = orderData.customer) === null || _m === void 0 ? void 0 : _m.shipping) === null || _o === void 0 ? void 0 : _o.postal_code) || ((_p = orderData.customer) === null || _p === void 0 ? void 0 : _p.postalCode) || '1000').toString(),
                        country_code: ((_r = (_q = orderData.customer) === null || _q === void 0 ? void 0 : _q.shipping) === null || _r === void 0 ? void 0 : _r.country) || ((_s = orderData.customer) === null || _s === void 0 ? void 0 : _s.country) || 'DK',
                        email: ((_t = orderData.customer) === null || _t === void 0 ? void 0 : _t.email) || orderData.customerEmail,
                        mobile: ((_u = orderData.customer) === null || _u === void 0 ? void 0 : _u.phone) || ((_v = orderData.customer) === null || _v === void 0 ? void 0 : _v.phone) || '00000000'
                    },
                    parcels: [
                        {
                            weight: 1000
                        }
                    ]
                };
                const response = yield axios_1.default.post(`${SHIPMONDO_API_URL}/shipments`, payload, {
                    headers: this.headers
                });
                return response.data;
            }
            catch (error) {
                console.error('❌ [SHIPMONDO] Error creating shipment:', ((_w = error.response) === null || _w === void 0 ? void 0 : _w.data) || error.message);
                throw error;
            }
        });
    }
    /**
     * Get label for a shipment
     * @param shipmentId
     */
    getShipmentLabel(shipmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get(`${SHIPMONDO_API_URL}/shipments/${shipmentId}/labels`, {
                    headers: this.headers
                });
                return response.data;
            }
            catch (error) {
                console.error(`❌ [SHIPMONDO] Error fetching label for ${shipmentId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw error;
            }
        });
    }
}
exports.shipmondoService = new ShipmondoService();
exports.default = exports.shipmondoService;
