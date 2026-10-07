import { Request, Response } from 'express';
import { shipmondoService, QuoteRequest } from '../services/shipmondoService';
import { quoteCacheKey } from '../services/shipmondoNormalize';

/**
 * shipmondoProxyController.ts
 * ---------------------------
 * Backend-for-frontend proxy for the admin's Live Rates flow. The Shipmondo
 * API key NEVER leaves the server: the browser only talks to these endpoints.
 *
 *  POST /api/shipmondo/quotes         -> Shipmondo POST /quotes/list
 *  GET  /api/shipmondo/service-points -> Shipmondo GET  /pickup_points
 *  POST /api/shipmondo/shipments      -> Shipmondo POST /shipments
 */

// ---- tiny in-memory cache (5 min TTL) for quotes ---------------------------
interface CacheEntry { expires: number; data: unknown }
const quoteCache = new Map<string, CacheEntry>();
const QUOTE_TTL_MS = 5 * 60 * 1000;

function cacheGet(key: string): unknown | null {
    const hit = quoteCache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) { quoteCache.delete(key); return null; }
    return hit.data;
}
function cacheSet(key: string, data: unknown) {
    if (quoteCache.size > 500) quoteCache.clear(); // simple bound
    quoteCache.set(key, { expires: Date.now() + QUOTE_TTL_MS, data });
}

// ---- validation (pure, unit-tested) ----------------------------------------
export interface ValidatedQuoteRequest extends QuoteRequest { orderId?: string }

function isParty(p: any): boolean {
    return !!p && typeof p === 'object'
        && typeof p.country_code === 'string' && /^[A-Za-z]{2}$/.test(p.country_code.trim())
        && (typeof p.zipcode === 'string' || typeof p.zipcode === 'number')
        && String(p.zipcode).trim().length > 0;
}

/** Accepts the frontend shape `{sender, receiver, parcels: [{weight|weight_grams}]}`. */
export function validateQuoteBody(body: any): { ok: true; value: ValidatedQuoteRequest } | { ok: false; error: string } {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Body JSON requerido' };
    if (!isParty(body.sender)) return { ok: false, error: 'sender inválido: se requiere country_code (2 letras) y zipcode' };
    if (!isParty(body.receiver)) return { ok: false, error: 'receiver inválido: se requiere country_code (2 letras) y zipcode' };
    if (!Array.isArray(body.parcels) || body.parcels.length === 0) {
        return { ok: false, error: 'parcels inválido: se requiere al menos un bulto' };
    }
    const parcels: ValidatedQuoteRequest['parcels'] = [];
    for (const p of body.parcels) {
        const grams = Number(p?.weight ?? p?.weight_grams);
        if (!Number.isInteger(grams) || grams <= 0) {
            return { ok: false, error: 'parcels inválido: weight debe ser un entero > 0 (gramos)' };
        }
        parcels.push({ weight: grams, quantity: Number.isInteger(p?.quantity) && p.quantity > 0 ? p.quantity : 1 });
    }
    return {
        ok: true,
        value: {
            orderId: typeof body.orderId === 'string' ? body.orderId : undefined,
            sender: { country_code: body.sender.country_code.trim().toUpperCase(), zipcode: String(body.sender.zipcode).trim() },
            receiver: { country_code: body.receiver.country_code.trim().toUpperCase(), zipcode: String(body.receiver.zipcode).trim() },
            parcels,
        },
    };
}

export function validateServicePointQuery(q: any): { ok: true; value: { carrier: string; country_code: string; zipcode: string; limit: number } } | { ok: false; error: string } {
    const country_code = String(q?.country_code || '').trim().toUpperCase();
    const zipcode = String(q?.zipcode || '').trim();
    const carrier = String(q?.carrier || '').trim().toLowerCase();
    if (!/^[A-Z]{2}$/.test(country_code)) return { ok: false, error: 'country_code requerido (2 letras)' };
    if (!zipcode) return { ok: false, error: 'zipcode requerido' };
    if (!carrier) return { ok: false, error: 'carrier requerido' };
    const limitRaw = parseInt(String(q?.limit ?? '3'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10, limitRaw)) : 3;
    return { ok: true, value: { carrier, country_code, zipcode, limit } };
}

// ---- Shipmondo error mapping ------------------------------------------------
function shipmondoErrorToResponse(err: any, res: Response) {
    if (err?.code === 'SHIPMONDO_NO_CREDENTIALS') {
        return res.status(503).json({ error: 'Servicio de cotización no configurado (faltan credenciales de Shipmondo en el servidor)' });
    }
    const status = err?.response?.status;
    const data = err?.response?.data;
    const detail = typeof data === 'string' ? data : (data?.message || data?.error || JSON.stringify(data || {})).slice(0, 500);
    if (status === 401 || status === 403) {
        return res.status(502).json({ error: 'Shipmondo rechazó las credenciales del servidor', detail });
    }
    if (status === 422) {
        return res.status(400).json({ error: 'Shipmondo no pudo cotizar con esos datos', detail });
    }
    return res.status(502).json({ error: 'Error al contactar a Shipmondo', detail: detail || String(err?.message || err).slice(0, 300) });
}

// ---- handlers ---------------------------------------------------------------
/** POST /api/shipmondo/quotes — live rates, cached 5 min. */
export async function postQuotes(req: Request, res: Response) {
    const v = validateQuoteBody(req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });

    const key = quoteCacheKey(v.value.sender, v.value.receiver, v.value.parcels);
    const cached = cacheGet(key);
    if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
    }
    try {
        const rates = await shipmondoService.getQuotes(v.value);
        const body = { rates };
        cacheSet(key, body);
        res.setHeader('X-Cache', 'MISS');
        return res.json(body);
    } catch (err: any) {
        return shipmondoErrorToResponse(err, res);
    }
}

/** GET /api/shipmondo/service-points?country_code&zipcode&carrier&limit */
export async function getServicePoints(req: Request, res: Response) {
    const v = validateServicePointQuery(req.query);
    if (!v.ok) return res.status(400).json({ error: v.error });
    try {
        const points = await shipmondoService.getPickupPoints(v.value.carrier, v.value.country_code, v.value.zipcode, v.value.limit);
        return res.json({ servicePoints: points });
    } catch (err: any) {
        return shipmondoErrorToResponse(err, res);
    }
}

/**
 * POST /api/shipmondo/shipments — buy a label.
 * Body: { orderId?, productCode?, servicePointId?, testMode?, shipment: { parties: [...], parcels: [...], ... } }
 *
 * NOTE: this performs a REAL purchase when testMode === false (money off the
 * Shipmondo balance). testMode defaults to true. The live end-to-end test
 * still needs Alejo's explicit approval — do not flip it in code.
 */
export async function postShipment(req: Request, res: Response) {
    const body = req.body || {};
    if (!body.shipment || typeof body.shipment !== 'object') {
        return res.status(400).json({ error: 'shipment requerido: payload nativo de Shipmondo con array `parties`' });
    }
    const testMode = body.testMode !== false;
    // Never log personal data or credentials — orderId/productCode only.
    console.log(`📦 [SHIPMONDO-PROXY] shipment request orderId=${body.orderId || 'n/a'} productCode=${body.productCode || body.shipment?.product_code || 'n/a'} testMode=${testMode}`);
    try {
        const result = await shipmondoService.createShipmentFromPayload({
            shipment: body.shipment,
            productCode: typeof body.productCode === 'string' ? body.productCode : undefined,
            servicePointId: body.servicePointId != null ? String(body.servicePointId) : undefined,
            reference: typeof body.orderId === 'string' ? body.orderId : undefined,
            testMode,
        });
        return res.json({ ok: true, testMode, shipment: result });
    } catch (err: any) {
        if (err?.code === 'SHIPMONDO_BAD_PAYLOAD') {
            return res.status(400).json({ error: err.message });
        }
        return shipmondoErrorToResponse(err, res);
    }
}
