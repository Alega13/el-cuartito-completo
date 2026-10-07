/**
 * test-shipmondo-proxy.ts
 * Run: npx ts-node --transpile-only test-shipmondo-proxy.ts
 * No credentials needed: pure functions + mocked shipmondoService.
 */
// Dummy env BEFORE requiring app modules (env.ts throws on missing Firebase vars)
process.env.FIREBASE_PROJECT_ID = 'test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = 'test';

const {
    normalizeQuotes,
    normalizePickupPoints,
    inferServiceType,
    carrierDisplayName,
    quoteCacheKey,
} = require('./src/services/shipmondoNormalize');
const serviceMod = require('./src/services/shipmondoService');
const controller = require('./src/controllers/shipmondoProxyController');

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: unknown) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}${extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''}`); }
}

// ---- normalizeQuotes -------------------------------------------------------
console.log('normalizeQuotes');
const rawQuotes = [
    { carrier_code: 'GLS', description: 'GLS ParcelShop', product_code: 'GLSDK_PS', service_codes: '', price: 35.0, price_before_vat: 28.0, currency_code: 'DKK' },
    { carrier_code: 'dao', description: 'DAO Home delivery', product_code: 'DAODK_HD', service_codes: '', price: '39.00', price_before_vat: '31.20', currency_code: 'DKK' },
    { carrier_code: 'postnord', description: 'PostNord Parcelshop', product_code: 'PNDK_PS', service_codes: '', price: 29, currency_code: 'DKK' },
    { carrier_code: 'gls', description: 'no price', product_code: 'GLSDK_X' },                 // dropped: no price
    { carrier_code: 'gls', description: 'no code', price: 10, currency_code: 'DKK' },          // dropped: no product_code
    null, 'junk',
];
const rates = normalizeQuotes(rawQuotes);
ok(rates.length === 3, 'keeps 3 valid, drops invalid', rates.length);
ok(rates[0].productCode === 'PNDK_PS' && rates[0].price === 29, 'sorted cheapest first', rates.map((r: any) => r.productCode));
ok(rates[0].serviceType === 'shop', 'infers shop from description', rates[0]);
ok(rates[1].serviceType === 'shop' && rates[1].carrierName === 'GLS', 'GLS ParcelShop -> shop', rates[1]);
ok(rates[2].serviceType === 'home' && rates[2].carrierName === 'DAO', 'DAO Home delivery -> home, name DAO', rates[2]);
ok(rates[2].price === 39 && typeof rates[2].price === 'number', 'string price parsed to number', rates[2].price);
ok(rates.every((r: any) => r.currency === 'DKK' && r.id === r.productCode), 'currency + id=productCode');
ok(normalizeQuotes([]).length === 0, 'empty array -> empty');
ok(normalizeQuotes({ data: rawQuotes.slice(0, 1) }).length === 1, 'tolerates {data:[...]} envelope');

// ---- normalizePickupPoints --------------------------------------------------
console.log('normalizePickupPoints');
const rawPoints = [
    { id: 9743, name: 'DAO Pakkeshop Nørrebro', company_name: 'DAO', address: 'Nørrebrogade 12', zipcode: '2200', city: 'København N', country: 'DK', opening_hours: [] },
    { id: '9751', name: 'Kiosk Møllegade', address: 'Møllegade 8', zipcode: '2200', city: 'København N' },
    { id: '9760', name: 'Third', address: 'X', zipcode: '2200', city: 'København N' },
    { id: '9999', name: 'Fourth', address: 'Y', zipcode: '2200', city: 'København N' },
    { name: 'no id' },
];
const pts = normalizePickupPoints(rawPoints, 3);
ok(pts.length === 3, 'limit respected', pts.length);
ok(pts[0].id === '9743' && pts[0].address1 === 'Nørrebrogade 12' && pts[0].zipcode === '2200', 'fields mapped (id stringified)', pts[0]);
ok(pts[0].distanceKm === null, 'distanceKm null when absent (UNVERIFIED field)');
const ptsDist = normalizePickupPoints([{ id: '1', name: 'A', address: 'B', zipcode: 'C', city: 'D', distance_km: 0.4 }], 3);
ok(ptsDist[0].distanceKm === 0.4, 'distance_km mapped when present');

// ---- helpers ----------------------------------------------------------------
console.log('helpers');
ok(inferServiceType('GLSDK_PS', 'GLS ParcelShop') === 'shop', 'shop keyword');
ok(inferServiceType('DAODK_HD', 'DAO Home delivery') === 'home', 'home default');
ok(carrierDisplayName('dao') === 'DAO' && carrierDisplayName('postnord') === 'PostNord', 'known carriers');
ok(carrierDisplayName('weirdco') === 'Weirdco', 'unknown carrier fallback');
const k1 = quoteCacheKey({ country_code: 'DK', zipcode: '1721' }, { country_code: 'PL', zipcode: '80-111' }, [{ weight: 500 }]);
const k2 = quoteCacheKey({ country_code: 'DK', zipcode: '1721' }, { country_code: 'PL', zipcode: '80-111' }, [{ weight: 500 }]);
const k3 = quoteCacheKey({ country_code: 'DK', zipcode: '1721' }, { country_code: 'PL', zipcode: '80-111' }, [{ weight: 600 }]);
ok(k1 === k2 && k1 !== k3, 'cache key stable + weight-sensitive');

// ---- validation ---------------------------------------------------------------
console.log('validateQuoteBody');
const good = { orderId: 'x', sender: { country_code: 'dk', zipcode: '1721' }, receiver: { country_code: 'PL', zipcode: '80-111' }, parcels: [{ weight: 500 }] };
const vg = controller.validateQuoteBody(good);
ok(vg.ok && vg.value.sender.country_code === 'DK' && vg.value.parcels[0].weight === 500, 'valid body passes + normalizes', vg);
const vg2 = controller.validateQuoteBody({ sender: { country_code: 'DK', zipcode: '1' }, receiver: { country_code: 'DK', zipcode: '2' }, parcels: [{ weight_grams: 750 }] });
ok(vg2.ok && vg2.value.parcels[0].weight === 750, 'accepts weight_grams alias');
for (const [name, body] of [
    ['missing receiver', { sender: { country_code: 'DK', zipcode: '1' }, parcels: [{ weight: 1 }] }],
    ['bad country', { sender: { country_code: 'DKK', zipcode: '1' }, receiver: { country_code: 'DK', zipcode: '2' }, parcels: [{ weight: 1 }] }],
    ['zero weight', { sender: { country_code: 'DK', zipcode: '1' }, receiver: { country_code: 'DK', zipcode: '2' }, parcels: [{ weight: 0 }] }],
    ['empty parcels', { sender: { country_code: 'DK', zipcode: '1' }, receiver: { country_code: 'DK', zipcode: '2' }, parcels: [] }],
] as Array<[string, any]>) {
    const r = controller.validateQuoteBody(body);
    ok(!r.ok && typeof r.error === 'string', `rejects: ${name}`);
}

console.log('validateServicePointQuery');
const sq = controller.validateServicePointQuery({ country_code: 'dk', zipcode: '8000', carrier: 'DAO', limit: '3' });
ok(sq.ok && sq.value.carrier === 'dao' && sq.value.limit === 3, 'valid query passes + normalizes');
const sq2 = controller.validateServicePointQuery({ country_code: 'DK', zipcode: '8000', carrier: 'gls', limit: '99' });
ok(sq2.ok && sq2.value.limit === 10, 'limit clamped to 10');
ok(!controller.validateServicePointQuery({ country_code: 'DK', zipcode: '8000' }).ok, 'rejects missing carrier');
ok(!controller.validateServicePointQuery({ country_code: 'DK', carrier: 'gls' }).ok, 'rejects missing zipcode');

// ---- handlers with mocked service ---------------------------------------------
console.log('handlers (mocked shipmondoService)');
function mockRes() {
    const r: any = { statusCode: 200, body: null, headers: {} };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    r.setHeader = (k: string, v: string) => { r.headers[k] = v; return r; };
    return r;
}

(async () => {
    const svc = serviceMod.shipmondoService;
    const fakeRates = [{ id: 'a', price: 10 }, { id: 'b', price: 20 }];
    let calls = 0;
    svc.getQuotes = async () => { calls++; return fakeRates; };

    const req1: any = { body: good };
    const res1 = mockRes();
    await controller.postQuotes(req1, res1);
    ok(res1.statusCode === 200 && res1.body.rates === fakeRates && res1.headers['X-Cache'] === 'MISS', 'postQuotes MISS calls service');

    const res2 = mockRes();
    await controller.postQuotes({ body: good } as any, res2);
    ok(res2.headers['X-Cache'] === 'HIT' && calls === 1, 'postQuotes HIT served from cache');

    const res3 = mockRes();
    await controller.postQuotes({ body: { sender: { country_code: 'DK', zipcode: '1' } } } as any, res3);
    ok(res3.statusCode === 400 && res3.body.error, 'postQuotes 400 on invalid body');

    svc.getQuotes = async () => { const e: any = new Error('nope'); e.response = { status: 401, data: { message: 'bad key' } }; throw e; };
    const res4 = mockRes();
    // different weight -> cache miss -> hits the mocked 401
    await controller.postQuotes({ body: { ...good, parcels: [{ weight: 501 }] } } as any, res4);
    ok(res4.statusCode === 502 && /credenciales/i.test(res4.body.error), 'postQuotes maps 401 -> 502 credenciales');

    svc.getPickupPoints = async () => [{ id: '1', name: 'A' }];
    const res5 = mockRes();
    await controller.getServicePoints({ query: { country_code: 'DK', zipcode: '8000', carrier: 'dao', limit: '3' } } as any, res5);
    ok(res5.statusCode === 200 && Array.isArray(res5.body.servicePoints), 'getServicePoints 200 {servicePoints}');

    const res6 = mockRes();
    await controller.getServicePoints({ query: { country_code: 'DK' } } as any, res6);
    ok(res6.statusCode === 400, 'getServicePoints 400 on bad query');

    // shipments: missing shipment payload
    const res7 = mockRes();
    await controller.postShipment({ body: { orderId: '1' } } as any, res7);
    ok(res7.statusCode === 400, 'postShipment 400 without shipment payload');

    // shipments: forwarded with testMode default true
    let seen: any = null;
    svc.createShipmentFromPayload = async (input: any) => { seen = input; return { id: 123 }; };
    const res8 = mockRes();
    await controller.postShipment({ body: { orderId: '27509260-15', productCode: 'GLSDK_PS', servicePointId: '9743', shipment: { parties: [{ type: 'sender' }, { type: 'receiver' }], parcels: [{ weight: 500 }] } } } as any, res8);
    ok(res8.statusCode === 200 && res8.body.ok === true && res8.body.testMode === true, 'postShipment defaults testMode=true');
    ok(seen && seen.testMode === true && seen.servicePointId === '9743' && seen.productCode === 'GLSDK_PS', 'postShipment forwards productCode/servicePointId', seen);

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
