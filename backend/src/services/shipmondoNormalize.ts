/**
 * shipmondoNormalize.ts
 * ---------------------
 * Pure functions to translate between Shipmondo's API shapes and the
 * El Cuartito admin frontend contract (see live-rates-quote.md §2.1 / §2.2).
 *
 * Verified against:
 *  - shipmondo/shipmondo-cli (official): quotes use root `sender`/`receiver`
 *    objects; shipments use a `parties` array with `type: "service_point"`.
 *  - setono/shipmondo-php-sdk: pickup points live at `GET /pickup_points`
 *    with query keys `carrier_code`, `country_code`, `zipcode` (misspelled,
 *    no underscore); response is a bare JSON array.
 *  - dumbsolutions/shipmondoapi.dotnet (OpenAPI-derived): quotes list lives
 *    at `POST /quotes/list` with `{sender, receiver, parcels}` and returns
 *    items shaped `{carrier_code, description, product_code, service_codes,
 *    price, price_before_vat, currency_code}` (snake_case on the wire).
 *
 * Anything marked UNVERIFIED below could not be confirmed without live API
 * credentials and should be re-checked once the real keys are configured.
 */

export type ServiceType = 'shop' | 'home';

export interface FrontendRate {
    id: string;
    carrier: string;
    carrierName: string;
    serviceType: ServiceType;
    serviceLabel: string;
    productCode: string;
    price: number;
    currency: string;
    deliveryEstimate: string;
    /** Raw presentational text from Shipmondo, kept for debugging/display. */
    description?: string;
}

export interface FrontendServicePoint {
    id: string;
    name: string;
    address1: string;
    zipcode: string;
    city: string;
    /** UNVERIFIED: the pickup_points model does not document a distance field;
     *  mapped from `distance_km`/`distance` when present, else null. */
    distanceKm: number | null;
}

const CARRIER_DISPLAY_NAMES: Record<string, string> = {
    dao: 'DAO',
    gls: 'GLS',
    postnord: 'PostNord',
    bring: 'Bring',
    dhl: 'DHL',
    dpd: 'DPD',
    fedex: 'FedEx',
    ups: 'UPS',
    tnt: 'TNT',
    bpost: 'bpost',
    postnl: 'PostNL',
    dsv: 'DSV',
    deutschepost: 'Deutsche Post',
    swipbox: 'SwipBox',
    budbee: 'Budbee',
    instabox: 'Instabox',
};

export function carrierDisplayName(carrierCode: string): string {
    const key = String(carrierCode || '').toLowerCase();
    if (CARRIER_DISPLAY_NAMES[key]) return CARRIER_DISPLAY_NAMES[key];
    // Fallback: Title-case the raw code, never invent a brand.
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Carrier';
}

const SHOP_KEYWORDS = /pakkeshop|parcel\s*shop|parcelshop|pakshop|pickup|pick-up|collect|service\s*point/i;

/**
 * Shipmondo's quotes/list response carries no explicit home/shop flag.
 * Heuristic (documented): match parcel-shop vocabulary against the
 * product code + description. UNVERIFIED against live data — re-check
 * with real quotes; a wrong guess only affects which UI branch (home vs
 * shop picker) the frontend shows, never the price or booking.
 */
export function inferServiceType(productCode: string, description?: string): ServiceType {
    const haystack = `${productCode || ''} ${description || ''}`;
    return SHOP_KEYWORDS.test(haystack) ? 'shop' : 'home';
}

export interface RawQuote {
    carrier_code?: string;
    description?: string;
    product_code?: string;
    service_codes?: string;
    price?: number | string;
    price_before_vat?: number | string;
    currency_code?: string;
    [k: string]: unknown;
}

function toNumber(v: unknown): number | null {
    const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
    return Number.isFinite(n) ? n : null;
}

/**
 * Normalize Shipmondo `POST /quotes/list` items to the frontend rate cards.
 * Drops entries without a product code or a valid price. Sorted cheapest first.
 */
export function normalizeQuotes(raw: unknown): FrontendRate[] {
    const items: RawQuote[] = Array.isArray(raw) ? raw : (raw as any)?.data && Array.isArray((raw as any).data) ? (raw as any).data : [];
    const rates: FrontendRate[] = [];
    for (const q of items) {
        if (!q || typeof q !== 'object') continue;
        const productCode = String((q as RawQuote).product_code || '').trim();
        const price = toNumber((q as RawQuote).price);
        if (!productCode || price === null) continue;
        const carrier = String((q as RawQuote).carrier_code || '').toLowerCase();
        const description = String((q as RawQuote).description || '').trim();
        const serviceType = inferServiceType(productCode, description);
        rates.push({
            id: productCode,
            carrier,
            carrierName: carrierDisplayName(carrier),
            serviceType,
            serviceLabel: description || (serviceType === 'shop' ? 'Parcel Shop' : 'Home Delivery'),
            productCode,
            price,
            currency: String((q as RawQuote).currency_code || 'DKK'),
            deliveryEstimate: '',
            description: description || undefined,
        });
    }
    rates.sort((a, b) => a.price - b.price);
    return rates;
}

export interface RawPickupPoint {
    id?: string | number;
    name?: string;
    company_name?: string;
    address?: string;
    address1?: string;
    address2?: string;
    zipcode?: string;
    zip_code?: string;
    city?: string;
    distance_km?: number | string;
    distance?: number | string;
    [k: string]: unknown;
}

/**
 * Normalize Shipmondo `GET /pickup_points` (bare array) to the frontend
 * service-points contract. `limit` clamps how many are returned.
 */
export function normalizePickupPoints(raw: unknown, limit = 3): FrontendServicePoint[] {
    const items: RawPickupPoint[] = Array.isArray(raw) ? raw : [];
    const out: FrontendServicePoint[] = [];
    for (const p of items) {
        if (!p || typeof p !== 'object') continue;
        const id = String((p as RawPickupPoint).id ?? '').trim();
        if (!id) continue;
        const name = String((p as RawPickupPoint).name || (p as RawPickupPoint).company_name || '').trim() || 'Punto de retiro';
        const address1 = String((p as RawPickupPoint).address || (p as RawPickupPoint).address1 || '').trim();
        const zipcode = String((p as RawPickupPoint).zipcode || (p as RawPickupPoint).zip_code || '').trim();
        const city = String((p as RawPickupPoint).city || '').trim();
        const distRaw = (p as RawPickupPoint).distance_km ?? (p as RawPickupPoint).distance;
        const dist = toNumber(distRaw);
        out.push({ id, name, address1, zipcode, city, distanceKm: dist });
        if (out.length >= Math.max(1, Math.min(10, limit))) break;
    }
    return out;
}

/** Cache key for quote results: sender + receiver + total parcel weight. */
export function quoteCacheKey(sender: object, receiver: object, parcels: Array<{ weight: number }>): string {
    const totalGrams = parcels.reduce((s, p) => s + (Number(p.weight) || 0), 0);
    return JSON.stringify({ sender, receiver, grams: totalGrams });
}
